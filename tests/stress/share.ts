import { expect } from 'vitest'
import { generatePlan } from '../../src/engine/generate'
import { planStress, requiredWithPrerequisites } from '../../src/engine/termStress'
import { relieveTerm } from '../../src/engine/relieve'
import { planRoles } from '../../src/engine/roles'
import type { Profile } from '../../src/engine/recommend'
import { buildDataset } from '../../scripts/dataset'

/**
 * The plan builder spreads the load (real data): the share of a degree's planned semesters that
 * read as heavy, over a plan for every one of its majors. Whatever the builder leaves heavy must
 * be past fixing by a swap or another elective. Split one file per degree so they run in parallel.
 */
export function heavyShare(course: string, p: Partial<Profile> = {}): number {
  const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced', ...p }
  const { dataset: real } = buildDataset('real')
  let terms = 0
  let heavy = 0
  const fixable: string[] = []
  for (const m of real.components.filter((c) => c.kind === 'major' && c.course === course)) {
    const { plan } = generatePlan({ data: real, profile, course: m.course, courseYear: 2026, major: m.id, startYear: 2027, startPeriod: 'semester-1' })
    const roles = planRoles(real, m.course, 2026, [m.id])
    const planned = plan.terms.flatMap((t) => t.subjects)
    const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), planned, real.subjects, m.course)
    const s = planStress(plan.terms.map((t) => t.subjects), real, profile, fixed, m.course)
    plan.terms.forEach((t, i) => {
      if (t.subjects.length < 3) return
      terms++
      if (s.terms[i]?.level === 'ok') return
      heavy++
      const r = relieveTerm(plan, real, i, profile)
      if (r && r.kind !== 'shortTerm') fixable.push(`${m.id} ${t.year} ${t.period}: ${r.kind}`)
    })
  }
  expect(fixable).toEqual([])
  return heavy / terms
}
