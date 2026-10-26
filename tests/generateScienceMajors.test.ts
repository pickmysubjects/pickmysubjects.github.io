import { describe, expect, it } from 'vitest'
import { cannotCombine, checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { realData } from './realData'

// Every Bachelor of Science major (with and without a specialisation) on the real data. Its own
// file so it runs alongside generate.test.ts instead of after it.
const DATA_PENDING = new Set([
  'biotechnology-agrifood',
  'informatics',
])


describe('generatePlan (real B-SCI data)', () => {
  const real = realData()
  const majors = real.components.filter(
    (c) => c.course === 'B-SCI' && c.kind === 'major' && c.requirements !== 'unknown' && !DATA_PENDING.has(c.id),
  )
  const specs = real.components.filter((c) => c.course === 'B-SCI' && c.kind === 'specialisation' && c.requirements !== 'unknown')
  const combos = majors.flatMap((m) => [
    [m.id, undefined] as const,
    ...specs
      .filter((s) => (s.requiresMajor.length === 0 || s.requiresMajor.includes(m.id)) && !cannotCombine(real, m.id, s.id))
      .map((s) => [m.id, s.id] as const),
  ])

  it('knows when a major and a specialisation can never be combined', () => {
    // ENGR30004 (Mechatronics) is non-allowed with both COMP20003 and COMP20007.
    expect(cannotCombine(real, 'mechatronics-systems', 'artificial-intelligence')).toMatch(/ENGR30004/)
    expect(cannotCombine(real, 'computing-and-software-systems', 'artificial-intelligence')).toBeNull()
  })

  it.each(combos)('%s + %s: no term errors, and the major/specialisation are met', (major, specialisation) => {
    const { plan } = generatePlan({
      data: real,
      profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
      course: 'B-SCI',
      courseYear: 2026,
      major,
      specialisation,
      startYear: 2027,
      startPeriod: 'semester-1',
    })
    expect(checkTerms(plan, real).filter((i) => i.severity === 'error').map((i) => i.message)).toEqual([])
    const components = checkCourse(plan, real).statuses.filter((s) => s.ruleId === 'major' || s.ruleId === 'specialisation')
    expect(components.filter((s) => s.status === 'fail').map((s) => s.detail)).toEqual([])
  })
})
