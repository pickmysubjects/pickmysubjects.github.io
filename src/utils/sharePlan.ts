import { PERIODS, type Period, type PlanTerm } from '@/engine'
import type { PlanSetup } from '@/composables/usePlan'

/**
 * A plan packed into a link, so it can be shared without a server: the setup, the plan's name and
 * every semester's subject codes. Nothing from My record (marks, WAM, done or failed) goes in it,
 * nor anything about the student (visa, study load).
 *
 * Links are plain text, about half the length of the first (v1, base64 JSON) links, so they fit
 * in chat apps that cut long links. v1 links still open.
 *
 *   2~course~courseYear~startYear~startPeriod~major~specialisation~field~minors~major2~diploma~stream~name~count~terms
 *
 * Lists are joined with ".", terms with "_"; a term is year + period index + codes, e.g.
 * "20251COMP10001.MAST10006". The name is base64url UTF-8, so it may hold anything and reads
 * the same whether or not the query was decoded first. count is how many codes the terms hold,
 * so a link cut off between two semesters reads as broken, not as a shorter plan. Every
 * character is URL-safe, and the link ends in a digit, which chat apps keep as part of a link.
 */
export interface SharedPlan {
  setup: PlanSetup
  terms: PlanTerm[]
  /** The plan's own name, if it has one. */
  name?: string
}

const CODE = /^[A-Z]{4}\d{5}$/
/** Course and component ids: letters, digits and hyphens (checked against the dataset in tests). */
const ID = /^[A-Za-z0-9-]*$/
const NAME_MAX = 40

export function encodePlan(setup: PlanSetup, terms: PlanTerm[], name?: string): string {
  const id = (x: string | undefined) => (x && ID.test(x) ? x : '')
  const fields = [
    '2',
    id(setup.course),
    String(setup.courseYear),
    String(setup.startYear),
    String(PERIODS.indexOf(setup.startPeriod)),
    id(setup.major),
    id(setup.specialisation),
    id(setup.field),
    setup.minors.map(id).filter(Boolean).join('.'),
    id(setup.major2),
    id(setup.diploma),
    id(setup.diplomaStream),
  ]
  const clean = name?.trim().slice(0, NAME_MAX)
  const kept = terms.map((term) => ({ ...term, subjects: term.subjects.filter((c) => CODE.test(c)) }))
  fields.push(
    clean ? toBase64Url(clean) : '',
    String(kept.reduce((n, term) => n + term.subjects.length, 0)),
    kept.map((term) => `${term.year}${PERIODS.indexOf(term.period)}${term.subjects.join('.')}`).join('_'),
  )
  return fields.join('~')
}

function period(i: unknown): Period {
  if (typeof i === 'string' && !/^\d$/.test(i)) throw new Error('bad period')
  const x = PERIODS[Number(i)]
  if (!x) throw new Error('bad period')
  return x
}

function year(x: unknown): number {
  const n = Number(x)
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error('bad year')
  return n
}

function idOf(x: unknown): string {
  const s = String(x ?? '')
  if (!ID.test(s)) throw new Error('bad id')
  return s
}

function setupOf(course: unknown, courseYear: unknown, startYear: unknown, startPeriod: unknown, major: unknown, specialisation: unknown, field: unknown, minors: string[], major2: unknown, diploma: unknown, stream: unknown): PlanSetup {
  const c = idOf(course)
  if (!c) throw new Error('no course')
  const f = idOf(field)
  const m2 = idOf(major2)
  const d = idOf(diploma)
  const ds = idOf(stream)
  return {
    course: c,
    courseYear: year(courseYear),
    startYear: year(startYear),
    startPeriod: period(startPeriod),
    major: idOf(major),
    specialisation: idOf(specialisation),
    minors: minors.map(idOf).filter(Boolean),
    ...(f ? { field: f } : {}),
    ...(m2 ? { major2: m2 } : {}),
    ...(d ? { diploma: d } : {}),
    ...(ds ? { diplomaStream: ds } : {}),
  }
}

function decodeV2(text: string): SharedPlan {
  const parts = text.split('~')
  // A plan with no semesters ends in "~", which some apps leave off a link: the same plan.
  if (parts.length === 14) parts.push('')
  if (parts.length !== 15) throw new Error('cut off')
  const [, course, courseYear, startYear, startPeriod, major, specialisation, field, minors, major2, diploma, stream, rawName, count, terms] = parts
  const setup = setupOf(course, courseYear, startYear, startPeriod, major, specialisation, field, minors ? minors.split('.') : [], major2, diploma, stream)
  const planTerms = terms
    ? terms.split('_').map((t) => {
        const m = /^(\d{4})(\d)((?:[A-Z]{4}\d{5}(?:\.(?=[A-Z])|$))*)$/.exec(t)
        if (!m) throw new Error('bad term')
        return { year: year(m[1]), period: period(m[2]), subjects: m[3] ? m[3].split('.') : [] }
      })
    : []
  if (!/^\d+$/.test(count ?? '') || Number(count) !== planTerms.reduce((n, t) => n + t.subjects.length, 0)) throw new Error('cut off')
  const name = rawName ? fromBase64Url(rawName).trim().slice(0, NAME_MAX) : ''
  return { setup, terms: planTerms, ...(name ? { name } : {}) }
}

function toBase64Url(text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('not base64url')
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** The first links: base64url JSON. Still read so links already sent keep working. */
function decodeV1(text: string): SharedPlan {
  const p = JSON.parse(fromBase64Url(text)) as { v?: unknown; s?: unknown; t?: unknown }
  if (p.v !== 1 || !Array.isArray(p.s) || !Array.isArray(p.t)) throw new Error('not v1')
  const [course, courseYear, startYear, startPeriod, major, specialisation, field, minors, major2, diploma, stream] = p.s as unknown[]
  const setup = setupOf(course, courseYear, startYear, startPeriod, major, specialisation, field, minors ? String(minors).split(',') : [], major2, diploma, stream)
  const terms = p.t.map((term) => {
    if (!Array.isArray(term) || !Array.isArray(term[2])) throw new Error('bad term')
    const [y, pi, codes] = term as [unknown, unknown, unknown[]]
    return { year: year(y), period: period(pi), subjects: codes.filter((c): c is string => typeof c === 'string' && CODE.test(c)) }
  })
  return { setup, terms }
}

/** The plan in a shared link, or null if the text isn't one (cut off, edited, from elsewhere). */
export function decodePlan(text: string): SharedPlan | null {
  try {
    const s = text.trim()
    return s.startsWith('2~') ? decodeV2(s) : decodeV1(s)
  } catch {
    return null
  }
}
