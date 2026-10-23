/**
 * "I want to be ___": from a career back to the majors that lead there, and for one of those
 * majors, how each of its subjects (and breadth) relates to the career.
 *
 * Tiers are worked out by general rules from the data, never by subject code:
 * - required: the major's accreditation route names it (required, one of several, or required breadth);
 * - helps: the route recommends it, the Handbook lists it as helpful, or its main field is one the
 *   job itself is about (read off the official key skills and the job's name). The main field is
 *   what its discipline (area code) is about, or its first tag: a field it only touches on (a film
 *   subject's budgets) doesn't make it a subject for accountants;
 * - some: a field it touches on, a neighbouring field (same topic group), or a hands-on skill
 *   employers list (lab work for a lab scientist);
 * - little: none of the above. Never called useless: its other merits are listed instead.
 */
import { componentCareers, type Accreditation, type CareerLang, type CareerQualifier, type CareerText, type Occupation } from './careers'
import { barsBreadth } from './courseRules'
import { inTopShare } from './easeRanking'
import { forCourse } from './forCourse'
import { majorOverview } from './roles'
import type { Dataset, Skill, Subject, Topic } from './schema'
import { skillsOf } from './skills'
import { homeTopics, relatedTopics, topicsOf } from './topics'

/** A career a student can pick: a job the Handbook names, or an official occupation linked by field. */
export interface CareerTarget {
  id: string
  kind: 'job' | 'field'
  names: Record<CareerLang, string>
  /** The official occupation page, when there is one. */
  occupation?: Occupation
}

/** Every career some listed major leads to, jobs first (by English name), then fields no job already covers. */
export function careerTargets(data: Dataset): CareerTarget[] {
  const c = data.careers
  if (!c) return []
  const jobs: CareerTarget[] = Object.values(c.jobs).map((j) => ({
    id: j.id,
    kind: 'job',
    names: j.names,
    ...(j.occupation && c.occupations[j.occupation] ? { occupation: c.occupations[j.occupation] } : {}),
  }))
  const fields: CareerTarget[] = Object.values(c.occupations)
    .filter((o) => o.field && !c.jobs[o.id])
    .map((o) => ({ id: o.id, kind: 'field', names: o.names, occupation: o }))
  // Only careers some major students can pick leads to: a page with no majors would be a dead end.
  const byName = (a: CareerTarget, b: CareerTarget) => a.names.en.localeCompare(b.names.en)
  return [...jobs.sort(byName), ...fields.sort(byName)].filter((t) => majorsForCareer(data, t.id).length > 0)
}

export function careerTarget(data: Dataset, id: string): CareerTarget | undefined {
  return careerTargets(data).find((t) => t.id === id)
}

export type CareerHow = CareerQualifier | 'related-field'

/** A major (one of our components) that leads to a career, and how. */
export interface CareerMajor {
  component: string
  course: string
  title: string
  how: CareerHow
  via?: CareerText
  accreditation?: Accreditation
}

const HOW_ORDER: CareerHow[] = ['direct', 'via-further-study', 'needs-qualification', 'related-field']

/** The majors whose Handbook page names this career (or, for a field, whose subject area matches it). */
export function majorsForCareer(data: Dataset, id: string): CareerMajor[] {
  const c = data.careers
  if (!c) return []
  const listed = new Set(data.courses.filter((x) => x.listed).map((x) => x.code))
  const out: CareerMajor[] = []
  for (const [component, handbookId] of Object.entries(c.components)) {
    const m = c.majors[handbookId]
    const comp = data.components.find((x) => x.id === component)
    if (!m || !comp || !listed.has(comp.course)) continue
    if (comp.closedFrom !== undefined && new Date().getFullYear() >= comp.closedFrom) continue
    const job = m.careers.find((x) => x.job === id)
    const how: CareerHow | undefined = job ? job.qualifier : m.relatedFields.includes(id) ? 'related-field' : undefined
    if (!how) continue
    out.push({
      component,
      course: comp.course,
      title: comp.title,
      how,
      ...(job?.via ? { via: job.via } : {}),
      ...(m.accreditation ? { accreditation: m.accreditation } : {}),
    })
  }
  return out.sort((a, b) => HOW_ORDER.indexOf(a.how) - HOW_ORDER.indexOf(b.how) || Number(!!b.accreditation) - Number(!!a.accreditation) || a.title.localeCompare(b.title) || a.course.localeCompare(b.course))
}

// ---------- what a career is about ----------

/**
 * Words in an official key skill or a job's name, and the fields (our topics) they point to.
 * General vocabulary, matched as words: a skill names a field, and a subject on that field helps.
 */
const FIELD_WORDS: [RegExp, Topic[]][] = [
  [/\baccount|audit|\btax/i, ['accounting']],
  [/budget|cost control/i, ['accounting', 'finance']],
  [/financ|pricing|investment|asset management/i, ['finance']],
  [/econom/i, ['economics']],
  [/actuar/i, ['actuarial', 'statistics']],
  [/statistic|\bsas\b|data analysis|analytics/i, ['statistics', 'data-science']],
  [/\bsql\b|database/i, ['databases']],
  [/software|comput|\bjava\b|javascript|c#|python|programming|web site|web develop|\bapp\b|developer/i, ['programming', 'software-engineering']],
  [/security|cyber/i, ['security']],
  [/cisco|network|technical support|infrastructure|\bict\b/i, ['systems']],
  [/business (analysis|analyst|process|management|development)|process improvement|change management|strategic planning|organisational development|management consult/i, ['management', 'business']],
  [/project manag|stakeholder/i, ['management']],
  [/marketing|social media|\bsales\b|market research/i, ['marketing']],
  [/recruit|employee relations|human resource|equity and diversity/i, ['human-resources']],
  [/contract/i, ['law']],
  [/construction|land development|quantity surveyor/i, ['construction', 'property']],
  [/\barchitect|revit|autocad/i, ['architecture', 'design']],
  [/landscape/i, ['architecture', 'environment']],
  [/urban|town planning|transportation planning|regional planner/i, ['urban-planning']],
  [/(?<!software )engineer|commissioning|maintenance|electrical design|mechanical design|process control|mechatronic/i, ['engineering']],
  [/chemi|biochem|toxicolog/i, ['chemistry']],
  [/biochem|microbiolog|zoolog|biolog|patholog|biotech|laborator/i, ['biology']],
  [/agronom|irrigation|agricult|food tech/i, ['agriculture']],
  [/environment/i, ['environment']],
  [/meteorolog|weather/i, ['earth-science', 'physics']],
  [/geolog/i, ['earth-science']],
  [/psycholog|mental health/i, ['psychology']],
  [/nutrition|dietetic|dietitian|clinical|surgery|ultrasound|patient|medical|rehabilitation|veterin/i, ['health']],
  [/adobe|graphic|illustrat|indesign|photoshop|concept development|interior|interaction design|experience design|service design|performance design/i, ['design', 'visual-communication']],
  [/music|piano|singing|performing artist/i, ['music', 'performance']],
  [/journalis/i, ['media']],
]

/**
 * Hands-on skills a job is built on, and the subject skills that practise them (a weaker link).
 * Only skills specific to the job: office tools (Excel) and plain writing are asked of almost
 * everyone, and would mark most subjects as related.
 */
const SKILL_WORDS: [RegExp, Skill[]][] = [
  [/journalis/i, ['writing']],
  [/laborator|pathology|microbiolog/i, ['lab']],
]

/**
 * Key skills almost every job lists (communication, planning…): any subject can practise them, so
 * they don't sort subjects. Shown once as a note instead.
 */
const GENERIC = /communication|^writing$|planning|building relationships|organisational skills|problem solving|team ?work|time management|research|mentoring|team building/i

export interface CareerNeeds {
  /** Fields the career is about, each with the words that said so (official skills, or the job's name). */
  fields: Map<Topic, string[]>
  /** Hands-on skills employers list, each with the skills that asked for it. */
  skills: Map<Skill, string[]>
  /** Key skills every job asks for (shown as a note). */
  generic: string[]
}

/** What a career is about: read off its official key skills and its name, by the word lists above. */
export function careerNeeds(t: CareerTarget): CareerNeeds {
  const fields = new Map<Topic, string[]>()
  const skills = new Map<Skill, string[]>()
  const generic: string[] = []
  const add = <K>(map: Map<K, string[]>, key: K, from: string) => {
    const list = map.get(key) ?? []
    if (!list.includes(from)) list.push(from)
    map.set(key, list)
  }
  const read = (text: string, label: string) => {
    for (const [rx, topics] of FIELD_WORDS) if (rx.test(text)) topics.forEach((x) => add(fields, x, label))
    for (const [rx, ks] of SKILL_WORDS) if (rx.test(text)) ks.forEach((x) => add(skills, x, label))
  }
  for (const s of t.occupation?.skills ?? []) {
    if (GENERIC.test(s)) generic.push(s)
    else read(s, s)
  }
  // The job's own name ("accountant", "computing professional") says what field it is in;
  // '' marks a field read off the name rather than a listed skill.
  for (const n of new Set([t.names.en, t.occupation?.name ?? ''])) if (n) read(n, '')
  return { fields, skills, generic }
}

// ---------- tiers ----------

export const TIERS = ['required', 'helps', 'some', 'little'] as const
export type Tier = (typeof TIERS)[number]

export type TierReason =
  | { kind: 'acc'; role: 'required' | 'oneOf' | 'breadth' | 'recommended'; body: string; others?: string[] }
  | { kind: 'helpful' }
  /** Covers fields the job is about; `from` are the official key skills that name them ('' for the job's name). */
  | { kind: 'field'; topics: Topic[]; from: string[] }
  /** Touches on a field the job is about, though its main field is another. */
  | { kind: 'touches'; topics: Topic[] }
  /** Next door to a field the job is about (same topic group). */
  | { kind: 'near'; topics: Topic[] }
  /** Practises a hands-on skill employers list. */
  | { kind: 'skill'; skills: Skill[]; from: string[] }

/** What a subject has going for it apart from the career (shown for 'little', never "useless"). */
export type Merit = 'easier' | 'wellRated' | 'noExam' | 'communication' | 'breadth'

export interface TieredSubject {
  code: string
  tier: Tier
  /** Why, strongest first; empty for 'little'. */
  reasons: TierReason[]
  /** Its other merits (filled for every tier; the page shows them for 'little'). */
  merits: Merit[]
  /** How strongly it matches, to order subjects inside a tier (higher first). */
  weight: number
}

export interface TierContext {
  needs: CareerNeeds
  accreditation?: Accreditation
  /** Subjects the major's Handbook page lists as helpful for what comes next. */
  helpful?: string[]
  /** Is it on the easier side for this course (the easy list's top third)? */
  easier?: (code: string) => boolean
  /** Does it count as breadth for the student's course? */
  breadth?: (code: string) => boolean
  /**
   * Outside the major (breadth, or a subject seen on its own): only its main field counts as
   * covering what the job is about. Inside a major, the major already says what it is for.
   */
  mainFieldOnly?: boolean
}

function accReason(a: Accreditation | undefined, code: string): TierReason | null {
  if (!a) return null
  for (const r of a.required) {
    if (r === code) return { kind: 'acc', role: 'required', body: a.body }
    if (Array.isArray(r) && r.includes(code)) return { kind: 'acc', role: 'oneOf', body: a.body, others: r.filter((x) => x !== code) }
  }
  if (a.requiredBreadth.includes(code)) return { kind: 'acc', role: 'breadth', body: a.body }
  if (a.recommended.includes(code)) return { kind: 'acc', role: 'recommended', body: a.body }
  return null
}

function merits(s: Subject, ctx: TierContext, data?: Dataset): Merit[] {
  const out: Merit[] = []
  if (ctx.easier?.(s.code)) out.push('easier')
  const g = s.signals
  if (g && g.overall !== undefined && (g.overallCount ?? 0) >= 3 && g.overall >= 4) out.push('wellRated')
  if (s.assessment?.length && !s.assessment.some((a) => a.kind === 'exam')) out.push('noExam')
  if (skillsOf(s, data).some((k) => k === 'writing' || k === 'presentation')) out.push('communication')
  if (ctx.breadth?.(s.code)) out.push('breadth')
  return out
}

/** How one subject relates to the career, with every reason spelled out. */
export function tierSubject(s: Subject, ctx: TierContext, data?: Dataset): TieredSubject {
  const reasons: TierReason[] = []
  let tier: Tier = 'little'
  let weight = 0
  const acc = accReason(ctx.accreditation, s.code)
  if (acc) reasons.push(acc)
  if (acc && acc.kind === 'acc' && acc.role !== 'recommended') tier = 'required'
  else if (acc || ctx.helpful?.includes(s.code)) tier = 'helps'
  if (ctx.helpful?.includes(s.code)) reasons.push({ kind: 'helpful' })

  const t = topicsOf(s)
  const own = t.topics as Topic[]
  // Its main fields: what its discipline is about, and its first tag (or what its title says).
  const main = new Set([...homeTopics(s), ...(t.inferred ? t.specific : t.topics.slice(0, 1))])
  const matched = own.filter((x) => ctx.needs.fields.has(x))
  const fields = matched.filter((x) => !ctx.mainFieldOnly || main.has(x))
  const touches = matched.filter((x) => !fields.includes(x))
  if (fields.length) {
    const from = [...new Set(fields.flatMap((x) => ctx.needs.fields.get(x)!))].filter(Boolean)
    reasons.push({ kind: 'field', topics: fields, from })
    if (tier === 'little') tier = 'helps'
    weight += fields.length * 2 + from.length
  }
  if (!fields.length && touches.length) {
    reasons.push({ kind: 'touches', topics: touches })
    weight += touches.length
  }
  const wanted = [...ctx.needs.fields.keys()]
  const near = own.filter((x) => !matched.includes(x) && wanted.some((w) => relatedTopics(x, w)))
  const skills = skillsOf(s, data).filter((k) => ctx.needs.skills.has(k))
  if (!fields.length && !touches.length && near.length) {
    reasons.push({ kind: 'near', topics: near })
    weight += near.length
  }
  if (skills.length) {
    reasons.push({ kind: 'skill', skills, from: [...new Set(skills.flatMap((k) => ctx.needs.skills.get(k)!))] })
    weight += skills.length
  }
  if (tier === 'little' && (touches.length || near.length || skills.length)) tier = 'some'
  return { code: s.code, tier, reasons, merits: merits(s, ctx, data), weight }
}

export type Tiered = Record<Tier, TieredSubject[]>

function group(rows: TieredSubject[], subjects: Record<string, Subject>): Tiered {
  const out: Tiered = { required: [], helps: [], some: [], little: [] }
  for (const r of rows) out[r.tier].push(r)
  const level = (c: string) => subjects[c]?.level ?? 9
  for (const t of TIERS) out[t].sort((a, b) => b.weight - a.weight || level(a.code) - level(b.code) || a.code.localeCompare(b.code))
  return out
}

export interface MajorForCareer {
  major: CareerMajor
  needs: CareerNeeds
  /** The major's own subjects, plus any its accreditation route or Handbook page names. */
  subjects: Tiered
  /** Breadth for the major's course (only subjects that relate; 'little' left out), or null when the course has none. */
  breadth: Tiered | null
}

/** Breadth subjects worth listing per tier (the rest are a link to the full breadth list). */
export const BREADTH_SHOWN = 12

/**
 * One major against one career: its subjects and its course's breadth, tiered. `easier` says
 * whether a subject is on the easier side for the course (the caller's ranking).
 */
export function majorForCareer(data: Dataset, careerId: string, component: string, easier?: (code: string) => boolean): MajorForCareer | null {
  const target = careerTarget(data, careerId)
  const major = majorsForCareer(data, careerId).find((m) => m.component === component)
  if (!target || !major) return null
  const entry = componentCareers(data.careers, component)
  const needs = careerNeeds(target)
  const comp = data.components.find((x) => x.id === component)
  const isBreadth = (code: string) => data.subjects[code]?.categories[major.course] === 'breadth' && !(comp && barsBreadth(comp, code))
  const ctx: TierContext = { needs, accreditation: major.accreditation, helpful: entry?.helpfulSubjects?.codes, easier, breadth: isBreadth }

  const o = majorOverview(data, component, major.course)
  const a = major.accreditation
  const own = new Set([...(o?.core ?? []), ...(o?.choices.flatMap((x) => x.from) ?? []), ...(o?.pathway.map((p) => p.code) ?? [])])
  const named = [...(a ? [...a.required.flat(), ...a.recommended] : []), ...(ctx.helpful ?? [])]
  const codes = [...new Set([...own, ...named])].filter((c) => data.subjects[c] && !(a?.requiredBreadth.includes(c)))
  const subjects = group(codes.map((c) => tierSubject(data.subjects[c]!, ctx, data)), data.subjects)

  const pool = Object.values(data.subjects).filter((s) => isBreadth(s.code) && !own.has(s.code) && s.level <= 3 && !s.campus && s.discontinuedFrom === undefined)
  // Required breadth always shows, even when the course data doesn't mark it as breadth.
  const reqBreadth = (a?.requiredBreadth ?? []).filter((c) => data.subjects[c] && !pool.some((s) => s.code === c)).map((c) => data.subjects[c]!)
  let breadth: Tiered | null = null
  if (pool.length || reqBreadth.length) {
    const outside = { ...ctx, mainFieldOnly: true }
    const rows = [...pool, ...reqBreadth].map((s) => tierSubject(s, outside, data)).filter((r) => r.tier !== 'little')
    breadth = group(rows, data.subjects)
    breadth.helps = breadth.helps.slice(0, BREADTH_SHOWN)
    breadth.some = breadth.some.slice(0, BREADTH_SHOWN)
  }
  return { major, needs, subjects, breadth }
}

/** "Is it on the easier side?" for a course, as subject pages say it (the easy list's top third). */
export function easierIn(data: Dataset, course: string): (code: string) => boolean {
  const view = forCourse(data, course)
  const year = Math.max(...Object.values(data.subjects).map((s) => s.sourceYear))
  return (code) => {
    const s = view.subjects[code]
    return !!s && inTopShare(view.subjects, s, 'easy', course, year)
  }
}

// ---------- a subject's careers ----------

/** An accreditation route that needs the subject (in the major, one of several, or as breadth). */
export interface SubjectRequiredFor {
  career: CareerTarget
  component: string
  /** The major's title. */
  major: string
  body: string
}

export interface SubjectCareers {
  /** Accreditation routes that need it, one per body and major. */
  required: SubjectRequiredFor[]
  /** Careers it helps toward (its main field is one the job is about, or a route recommends it), best match first. */
  helps: CareerTarget[]
}

/**
 * How central the subject's field is to the job, for a subject's own page (0: not enough to
 * name the job there). A route or the Handbook naming it counts most; then a field the job's own
 * name says, or one at least two of its key skills ask for. One incidental key skill ("Project
 * Management" on a zoologist's list) isn't enough to call a management subject a zoology one.
 */
function central(row: TieredSubject, needs: CareerNeeds): number {
  let score = 0
  for (const r of row.reasons) {
    if (r.kind === 'acc' || r.kind === 'helpful') score = Math.max(score, 100)
    if (r.kind !== 'field') continue
    const byName = r.topics.some((x) => needs.fields.get(x)?.includes(''))
    if (byName || r.from.length >= 2) score = Math.max(score, row.weight + (byName ? 10 : 0))
  }
  return score
}

const NEEDS = new WeakMap<Dataset, Map<string, { target: CareerTarget; needs: CareerNeeds; majors: CareerMajor[] }>>()

function careerIndex(data: Dataset) {
  let index = NEEDS.get(data)
  if (!index) {
    index = new Map(careerTargets(data).map((t) => [t.id, { target: t, needs: careerNeeds(t), majors: majorsForCareer(data, t.id) }]))
    NEEDS.set(data, index)
  }
  return index
}

/**
 * How a subject, seen on its own page, relates to careers: by the same tiers as a career's page.
 * Required when an accreditation route needs it; else helps when its main field is the job's.
 */
export function subjectCareers(data: Dataset, code: string): SubjectCareers {
  const s = data.subjects[code]
  const out: SubjectCareers = { required: [], helps: [] }
  if (!s || !data.careers) return out
  const seen = new Set<string>()
  const helps: { target: CareerTarget; weight: number }[] = []
  for (const { target, needs, majors } of careerIndex(data).values()) {
    let best: TieredSubject | null = null
    for (const m of majors.length ? majors : [undefined]) {
      const entry = m ? componentCareers(data.careers, m.component) : undefined
      const row = tierSubject(s, { needs, accreditation: m?.accreditation, helpful: entry?.helpfulSubjects?.codes, mainFieldOnly: true }, data)
      if (row.tier === 'required' && m?.accreditation) {
        const key = `${m.accreditation.body}|${m.title}`
        if (!seen.has(key)) out.required.push({ career: target, component: m.component, major: m.title, body: m.accreditation.body })
        seen.add(key)
      } else if (row.tier === 'helps' && central(row, needs) > (best ? central(best, needs) : 0)) best = row
    }
    if (best && !out.required.some((r) => r.career.id === target.id)) helps.push({ target, weight: central(best, needs) })
  }
  const kind = (t: CareerTarget) => Number(t.kind !== 'job')
  out.helps = helps.sort((a, b) => b.weight - a.weight || kind(a.target) - kind(b.target) || a.target.names.en.localeCompare(b.target.names.en)).map((x) => x.target)
  return out
}
