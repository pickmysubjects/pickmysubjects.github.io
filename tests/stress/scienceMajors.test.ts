import { describe, expect, it } from 'vitest'
import { farCampusPlanned, scienceCombos, wholeDegreeProblems } from '../sciencePlans'
import { realData } from '../realData'

/**
 * Every Bachelor of Science major on the real data, each planned once: every subject placed, no
 * term errors, every course rule met. With a specialisation: scienceSpecialisations.test.ts (split
 * so the two run in parallel). A few representative combinations run in generate.test.ts too, for
 * test:fast.
 */
const real = realData()

describe('generatePlan (real B-SCI data, every major)', () => {
  it.each(scienceCombos(real).filter(([, s]) => s === undefined))('%s: a whole degree with every course rule met and no term errors', (major) => {
    expect(wholeDegreeProblems(real, major)).toEqual([])
  })

  // After the sweep above, so the Semester 1 plans come from its cache.
  it('never plans a far-campus subject (Dookie) that no requirement needs, in any major', () => {
    for (const m of real.components.filter((c) => c.course === 'B-SCI' && c.kind === 'major' && c.closedFrom === undefined)) {
      for (const sp of ['semester-1', 'semester-2'] as const) expect(farCampusPlanned(real, m.id, sp), `${m.id} ${sp}`).toEqual([])
    }
  }, 120_000)
})
