import { cannotCombine, checkCourse } from '../src/engine/courseRules'
import { referencedSubjects } from '../src/engine/expr'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { planRoles } from '../src/engine/roles'
import type { Dataset, Period } from '../src/engine/schema'

/**
 * Whole-degree Bachelor of Science plans on the real data, shared by generate.test.ts (a few
 * representative combinations, for test:fast) and tests/stress/scienceMajors.test.ts (all of them).
 */

/**
 * Majors whose required subjects aren't fully curated yet (no study periods or
 * prerequisites, or not in the data at all), so a whole-degree plan can't be built
 * for them. Remove each one once its subjects are in (subject batches 7-19).
 * Informatics: the Handbook's third core subject, INFO30004, is no longer available.
 * Agri-food Biotechnology: its core subject BTCH30002 is not running in 2026.
 */
export const DATA_PENDING = new Set(['biotechnology-agrifood', 'informatics'])

// Physics (Chemical Physics) uses 20 of 24 slots on its chain; the last breadth chain
// (level 1 then level 2) needs breadth subjects the dataset doesn't have yet.
const BREADTH_TOO_THIN = new Set(['physics-chemical'])

/** Every B-SCI major alone, and with every specialisation it can be combined with. */
export function scienceCombos(data: Dataset): (readonly [string, string | undefined])[] {
  const majors = data.components.filter(
    (c) => c.course === 'B-SCI' && c.kind === 'major' && c.requirements !== 'unknown' && !DATA_PENDING.has(c.id),
  )
  const specs = data.components.filter((c) => c.course === 'B-SCI' && c.kind === 'specialisation' && c.requirements !== 'unknown')
  return majors.flatMap((m) => [
    [m.id, undefined] as const,
    ...specs
      .filter((s) => (s.requiresMajor.length === 0 || s.requiresMajor.includes(m.id)) && !cannotCombine(data, m.id, s.id))
      .map((s) => [m.id, s.id] as const),
  ])
}

const plans = new WeakMap<Dataset, Map<string, ReturnType<typeof generatePlan>>>()
/**
 * A B-SCI plan from 2027 with an empty profile. Memoised per dataset, so tests in one file that
 * need the same plan build it once (plans are read, never changed).
 */
export function sciencePlan(data: Dataset, major: string, specialisation?: string, startPeriod: Period = 'semester-1') {
  let byKey = plans.get(data)
  if (!byKey) plans.set(data, (byKey = new Map()))
  const key = `${major}|${specialisation ?? ''}|${startPeriod}`
  let r = byKey.get(key)
  if (!r) {
    r = generatePlan({
      data,
      profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
      course: 'B-SCI',
      courseYear: 2026,
      major,
      specialisation,
      startYear: 2027,
      startPeriod,
    })
    byKey.set(key, r)
  }
  return r
}

/**
 * What's wrong with a whole-degree plan: subjects left unplaced, term errors, and every course
 * rule not met (the major and specialisation included).
 */
export function wholeDegreeProblems(data: Dataset, major: string, specialisation?: string): string[] {
  const { plan, unplaced } = sciencePlan(data, major, specialisation)
  return [
    ...unplaced.map((u) => `unplaced ${u.code}`),
    ...checkTerms(plan, data).filter((i) => i.severity === 'error').map((i) => `term: ${i.message}`),
    ...checkCourse(plan, data)
      .statuses.filter((s) => s.status !== 'ok' && !(BREADTH_TOO_THIN.has(major) && s.ruleId === 'breadth'))
      .map((s) => `${s.ruleId}: ${s.detail}`),
  ]
}

/** Far-campus (Dookie) subjects in a major's plan from the given start. */
export function farCampusPlanned(data: Dataset, major: string, startPeriod: Period): string[] {
  return sciencePlan(data, major, undefined, startPeriod).plan.terms.flatMap((t) => t.subjects).filter((c) => data.subjects[c]?.campus)
}

/**
 * B-SCI majors open to new students, closest first to a far-campus subject: how many
 * prerequisite steps from the major's own subjects (required or on its lists) the nearest one is.
 * Majors with none in reach are left out.
 */
export function majorsByFarCampusDistance(data: Dataset): string[] {
  const distance = (major: string): number => {
    const roles = planRoles(data, 'B-SCI', 2026, [major])
    let frontier = [...roles.required, ...roles.options]
    const seen = new Set(frontier)
    for (let steps = 0; frontier.length; steps++) {
      if (frontier.some((c) => data.subjects[c]?.campus)) return steps
      const next = frontier.flatMap((c) => (data.subjects[c] ? referencedSubjects(data.subjects[c]!.prerequisites) : []))
      frontier = [...new Set(next)].filter((c) => !seen.has(c))
      frontier.forEach((c) => seen.add(c))
    }
    return Infinity
  }
  return data.components
    .filter((c) => c.course === 'B-SCI' && c.kind === 'major' && c.closedFrom === undefined)
    .map((c) => [c.id, distance(c.id)] as const)
    .filter(([, d]) => d < Infinity)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
}
