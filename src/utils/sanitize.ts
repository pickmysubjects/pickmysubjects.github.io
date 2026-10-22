import { PERIODS, SKILLS, TOPICS, type Profile } from '@/engine'
import { isMarkScale } from './markScales'
import type { PlanBook, PlanPrefs, PlanState, SavedPlan } from '@/composables/planStore'

/**
 * Saved data comes back from localStorage or a backup file, so it may be from an older version,
 * edited by hand, or cut short. These put it back in the shape the app expects: missing parts get
 * their defaults, and anything that can't be read is dropped rather than left to break a page.
 */
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])
const GOALS = ['wam', 'balanced', 'challenge'] as const
// Interests are topic ids: a stale or hand-edited one would match no subject, yet still count as
// "has interests" and mark every subject off-topic.

/** A saved goal, read back. "Marks only" ('easy') is no longer offered: it becomes "protect my WAM". */
export function cleanGoal(x: unknown): Profile['goal'] {
  if (x === 'easy') return 'wam'
  return GOALS.find((g) => g === x) ?? 'balanced'
}

export function cleanProfile(x: unknown): Profile {
  const p = isObject(x) ? x : {}
  const results = (Array.isArray(p.results) ? p.results : [])
    .filter((r): r is Record<string, unknown> => isObject(r) && typeof r.code === 'string')
    .map((r) => ({
      code: r.code as string,
      ...(typeof r.mark === 'number' && r.mark >= 0 && r.mark <= 100 ? { mark: r.mark } : {}),
      ...(r.failed === true ? { failed: true } : {}),
      ...(typeof r.year === 'number' ? { year: r.year } : {}),
      ...(typeof r.period === 'string' && (PERIODS as readonly string[]).includes(r.period) ? { period: r.period as Profile['results'][number]['period'] } : {}),
    }))
  const skills: Profile['skills'] = {}
  if (isObject(p.skills)) {
    for (const k of SKILLS) {
      const v = p.skills[k]
      if (typeof v === 'number' && v >= 1 && v <= 5) skills[k] = v
    }
  }
  const goal = cleanGoal(p.goal)
  const ratings: NonNullable<Profile['ratings']> = {}
  if (isObject(p.ratings)) {
    for (const [code, r] of Object.entries(p.ratings)) {
      if (!/^[A-Z]{4}\d{5}$/.test(code) || !isObject(r)) continue
      const scale = (v: unknown) => (typeof v === 'number' && v >= 1 && v <= 5 ? v : undefined)
      const rec = r.recommend === 'Yes' || r.recommend === 'Maybe' || r.recommend === 'No' ? r.recommend : undefined
      ratings[code] = { difficulty: scale(r.difficulty), interest: scale(r.interest), recommend: rec }
    }
  }
  return { results, skills, interests: [...new Set(strings(p.interests).filter((t) => (TOPICS as readonly string[]).includes(t)))], goal, confirmed: strings(p.confirmed), ...(Object.keys(ratings).length ? { ratings } : {}), ...(typeof p.workHours === 'number' && p.workHours >= 0 && p.workHours <= 60 ? { workHours: p.workHours } : {}), ...(isMarkScale(p.markScale) ? { markScale: p.markScale } : {}) }
}

export function cleanProfiles(x: unknown): Record<string, Profile> {
  if (!isObject(x)) return {}
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cleanProfile(v)]))
}

/** Plans whose setup or terms can't be read are dropped; the student builds a new one. */
function cleanState(v: unknown): PlanState | null {
  if (!isObject(v) || !isObject(v.setup) || typeof v.setup.course !== 'string' || !Array.isArray(v.terms)) return null
  const terms = v.terms
    .filter((t): t is Record<string, unknown> => isObject(t) && typeof t.year === 'number' && (PERIODS as readonly string[]).includes(String(t.period)))
    .map((t) => ({ year: t.year, period: t.period, subjects: strings(t.subjects) }))
  return {
    // A plan saved before second majors existed has none; anything but a string is dropped.
    // Likewise a diploma and its stream.
    setup: (({ major2, diploma, diplomaStream, ...rest }) => ({
      ...rest,
      minors: strings(v.setup.minors),
      ...(typeof major2 === 'string' ? { major2 } : {}),
      ...(typeof diploma === 'string' && diploma ? { diploma } : {}),
      ...(typeof diplomaStream === 'string' && diplomaStream ? { diplomaStream } : {}),
    }))(v.setup) as unknown as PlanState['setup'],
    terms: terms as PlanState['terms'],
    notes: Array.isArray(v.notes) ? v.notes : [],
    unplaced: Array.isArray(v.unplaced) ? v.unplaced : [],
  }
}

function cleanKept(x: unknown): Record<string, PlanState> | undefined {
  if (!isObject(x)) return undefined
  const out: Record<string, PlanState> = {}
  for (const [course, v] of Object.entries(x)) {
    const state = cleanState(v)
    if (state) out[course] = state
  }
  return Object.keys(out).length ? out : undefined
}

function cleanPrefs(x: Record<string, unknown>): PlanPrefs {
  const { skills, interests, goal } = cleanProfile(x)
  return { skills, interests, goal }
}

function cleanBook(v: Record<string, unknown>): PlanBook | null {
  const plans: SavedPlan[] = []
  for (const p of Array.isArray(v.plans) ? v.plans : []) {
    const state = cleanState(p)
    if (!state || !isObject(p)) continue
    const id = typeof p.id === 'string' && p.id && !plans.some((x) => x.id === p.id) ? p.id : `p${plans.length + 1}`
    const label = typeof p.label === 'string' && p.label ? p.label.slice(0, 2) : String.fromCharCode(65 + plans.length)
    const kept = cleanKept(p.kept)
    const prefs = isObject(p.prefs) ? cleanPrefs(p.prefs) : undefined
    plans.push({ id, label, ...(typeof p.name === 'string' && p.name.trim() ? { name: p.name.trim().slice(0, 40) } : {}), ...state, ...(kept ? { kept } : {}), ...(prefs ? { prefs } : {}) })
  }
  if (!plans.length) return null
  const active = plans.some((p) => p.id === v.active) ? (v.active as string) : plans[0]!.id
  return { active, plans }
}

/**
 * Every dataset's plans. Before there could be several, each dataset had one plan under its own
 * name, and a plan for another degree it had switched away from under "name|course": that plan
 * becomes Plan A, and the switched-away ones stay with it.
 */
export function cleanPlans(x: unknown): Record<string, PlanBook> {
  if (!isObject(x)) return {}
  const out: Record<string, PlanBook> = {}
  const oldKept: Record<string, Record<string, PlanState>> = {}
  for (const [k, v] of Object.entries(x)) {
    if (!isObject(v)) continue
    if (Array.isArray(v.plans)) {
      const book = cleanBook(v)
      if (book) out[k] = book
      continue
    }
    // The old single-plan shape.
    const state = cleanState(v)
    if (!state) continue
    const bar = k.indexOf('|')
    if (bar >= 0) {
      const name = k.slice(0, bar)
      ;(oldKept[name] ??= {})[k.slice(bar + 1)] = state
    } else if (!out[k]) out[k] = { active: 'a', plans: [{ id: 'a', label: 'A', ...state }] }
  }
  for (const [name, kept] of Object.entries(oldKept)) {
    const book = out[name]
    if (book) {
      const first = book.plans[0]!
      first.kept = { ...kept, ...(first.kept ?? {}) }
    } else {
      // Only a switched-away plan survived: keep it as Plan A rather than lose it.
      const [course, state] = Object.entries(kept)[0]!
      const rest = { ...kept }
      delete rest[course]
      out[name] = { active: 'a', plans: [{ id: 'a', label: 'A', ...state, ...(Object.keys(rest).length ? { kept: rest } : {}) }] }
    }
  }
  return out
}

export const cleanRated = (x: unknown): string[] => strings(x)
