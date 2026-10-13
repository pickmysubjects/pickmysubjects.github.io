import { PERIODS, SKILLS, type Profile } from '@/engine'

/**
 * Saved data comes back from localStorage or a backup file, so it may be from an older version,
 * edited by hand, or cut short. These put it back in the shape the app expects: missing parts get
 * their defaults, and anything that can't be read is dropped rather than left to break a page.
 */
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])
const GOALS = ['wam', 'balanced', 'challenge', 'easy'] as const

export function cleanProfile(x: unknown): Profile {
  const p = isObject(x) ? x : {}
  const results = (Array.isArray(p.results) ? p.results : [])
    .filter((r): r is Record<string, unknown> => isObject(r) && typeof r.code === 'string')
    .map((r) => ({
      code: r.code as string,
      ...(typeof r.mark === 'number' && r.mark >= 0 && r.mark <= 100 ? { mark: r.mark } : {}),
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
  const goal = GOALS.find((g) => g === p.goal) ?? 'balanced'
  return { results, skills, interests: strings(p.interests), goal, confirmed: strings(p.confirmed) }
}

export function cleanProfiles(x: unknown): Record<string, Profile> {
  if (!isObject(x)) return {}
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cleanProfile(v)]))
}

/** Plans whose setup or terms can't be read are dropped; the student builds a new one. */
export function cleanPlans<T>(x: unknown): Record<string, T> {
  if (!isObject(x)) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(x)) {
    if (!isObject(v) || !isObject(v.setup) || typeof v.setup.course !== 'string' || !Array.isArray(v.terms)) continue
    const terms = v.terms
      .filter((t): t is Record<string, unknown> => isObject(t) && typeof t.year === 'number' && (PERIODS as readonly string[]).includes(String(t.period)))
      .map((t) => ({ year: t.year, period: t.period, subjects: strings(t.subjects) }))
    out[k] = { ...v, terms, notes: Array.isArray(v.notes) ? v.notes : [], unplaced: Array.isArray(v.unplaced) ? v.unplaced : [] }
  }
  return out as Record<string, T>
}

export const cleanRated = (x: unknown): string[] => strings(x)
