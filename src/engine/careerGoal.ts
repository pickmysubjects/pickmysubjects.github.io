/**
 * A student's career goal ("I want to be an accountant"), set per plan on My page: what it means
 * for suggestions and for the plan. The tiers are careerPaths' own (tierSubject), read against
 * the student's major when that major leads to the career (its accreditation route counts then),
 * else against the career's fields alone.
 */
import { componentCareers, type CareerLang } from './careers'
import { careerNeeds, careerTarget, majorsForCareer, tierSubject, type CareerMajor, type CareerTarget, type TierContext, type TieredSubject } from './careerPaths'
import { majorOverview } from './roles'
import type { Params } from './plan'
import type { Dataset, Subject } from './schema'

export interface CareerGoal {
  target: CareerTarget
  /** The student's major that leads to the career, when one does (its accreditation route applies). */
  major?: CareerMajor
  ctx: TierContext
  /** The major's own subjects: inside them, any field the career is about counts (as on the career page). */
  own: Set<string>
}

const GOALS = new WeakMap<Dataset, Map<string, CareerGoal | null>>()

/** The goal for a career id and the student's majors (component ids); null for an unknown career. */
export function careerGoal(data: Dataset, careerId: string | undefined, components: readonly string[] = []): CareerGoal | null {
  if (!careerId || !data.careers) return null
  let cache = GOALS.get(data)
  if (!cache) GOALS.set(data, (cache = new Map()))
  const key = `${careerId}|${components.join(',')}`
  if (cache.has(key)) return cache.get(key)!
  const target = careerTarget(data, careerId)
  let goal: CareerGoal | null = null
  if (target) {
    const major = majorsForCareer(data, careerId).find((m) => components.includes(m.component))
    const entry = major ? componentCareers(data.careers, major.component) : undefined
    const o = major ? majorOverview(data, major.component, major.course) : null
    const own = new Set([...(o?.core ?? []), ...(o?.choices.flatMap((x) => x.from) ?? []), ...(o?.pathway.map((p) => p.code) ?? [])])
    goal = { target, ...(major ? { major } : {}), own, ctx: { needs: careerNeeds(target), accreditation: major?.accreditation, helpful: entry?.helpfulSubjects?.codes } }
  }
  cache.set(key, goal)
  return goal
}

/**
 * How a subject relates to the goal, as the career page tiers it. Outside the major only its main
 * field counts. A "one of" accreditation subject whose alternative is already taken or planned is
 * no longer needed: it only helps.
 */
export function goalTier(goal: CareerGoal, s: Subject, data: Dataset, taken: ReadonlySet<string> = new Set()): TieredSubject {
  const row = tierSubject(s, { ...goal.ctx, mainFieldOnly: !goal.own.has(s.code) }, data)
  const acc = row.reasons.find((r) => r.kind === 'acc')
  if (row.tier === 'required' && acc?.kind === 'acc' && acc.role === 'oneOf' && acc.others?.some((c) => taken.has(c))) return { ...row, tier: 'helps' }
  return row
}

/** The career's names, as note params ("career_en", "career_zh"…): the reader's language picks one. */
export function careerNameParams(t: CareerTarget): Params {
  const out: Params = {}
  for (const [lang, name] of Object.entries(t.names) as [CareerLang, string][]) if (name) out[`career_${lang}`] = name
  return out
}

/** What the career's accreditation route still asks for that the plan and record don't have. */
export interface CareerGap {
  /** Subjects the route needs in the degree; a "one of" list as its codes joined by " / ". */
  required: string[]
  /** Breadth subjects the route needs. */
  breadth: string[]
}

/**
 * The route's subjects missing from `have` (completed and planned). `flagged` are subjects the
 * plan already warns about (the major's compulsory ones): not said twice.
 */
export function careerGap(data: Dataset, goal: CareerGoal, have: ReadonlySet<string>, flagged: ReadonlySet<string> = new Set()): CareerGap {
  const a = goal.major?.accreditation
  const gap: CareerGap = { required: [], breadth: [] }
  if (!a) return gap
  const known = (c: string) => !!data.subjects[c] && data.subjects[c]!.discontinuedFrom === undefined
  for (const r of a.required) {
    const codes = (Array.isArray(r) ? r : [r]).filter(known)
    if (!codes.length || codes.some((c) => have.has(c) || flagged.has(c))) continue
    gap.required.push(codes.join(' / '))
  }
  gap.breadth = a.requiredBreadth.filter((c) => known(c) && !have.has(c) && !flagged.has(c))
  return gap
}
