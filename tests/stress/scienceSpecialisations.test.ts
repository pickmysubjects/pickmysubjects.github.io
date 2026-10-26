import { describe, expect, it } from 'vitest'
import { scienceCombos, wholeDegreeProblems } from '../sciencePlans'
import { realData } from '../realData'

/**
 * Every Bachelor of Science major with every specialisation it can take, on the real data, each
 * planned once: every subject placed, no term errors, every course rule met (the major and the
 * specialisation included). Majors alone: scienceMajors.test.ts.
 */
const real = realData()

describe('generatePlan (real B-SCI data, every major with a specialisation)', () => {
  it.each(scienceCombos(real).filter(([, s]) => s !== undefined))('%s + %s: a whole degree with every course rule met and no term errors', (major, specialisation) => {
    expect(wholeDegreeProblems(real, major, specialisation)).toEqual([])
  })
})
