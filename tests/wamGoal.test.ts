import { describe, expect, it } from 'vitest'
import { wamIf, gradeOf, neededAverage, pointsLeft, projectedWam } from '../src/utils/wamGoal'
import { dataset, subject } from './helpers'

describe('WAM goal', () => {
  it('works out the average needed on what is left', () => {
    // 100 points at 72; to reach 75 over 300 points the other 200 need 76.5.
    expect(neededAverage(72, 100, 75, 200)).toBe(76.5)
  })

  it('can ask for more than 100 when the target is out of reach', () => {
    expect(neededAverage(60, 250, 80, 50)!).toBeGreaterThan(100)
  })

  it('has no answer with nothing left to take', () => {
    expect(neededAverage(70, 300, 75, 0)).toBeNull()
  })

  it('projects the WAM from an average on what is left', () => {
    expect(projectedWam(72, 100, 78, 200)).toBe(76)
    expect(projectedWam(0, 0, 0, 0)).toBeNull()
  })

  it('agrees with itself both ways', () => {
    const need = neededAverage(68.4, 137.5, 74, 162.5)!
    expect(projectedWam(68.4, 137.5, need, 162.5)).toBeCloseTo(74, 0)
  })

  it('names grades by UniMelb bands', () => {
    expect([80, 79.9, 75, 70, 65, 50, 49.9].map(gradeOf)).toEqual(['H1', 'H2A', 'H2A', 'H2B', 'H3', 'P', 'N'])
  })

  it('counts only passed subjects as done, against the degree’s own points', () => {
    const data = dataset([subject({ code: 'AAAA10001' }), subject({ code: 'AAAA10002' }), subject({ code: 'AAAA10003' })])
    const results = [{ code: 'AAAA10001', mark: 80 }, { code: 'AAAA10002', mark: 40 }, { code: 'AAAA10003', mark: 65 }]
    // Two passes of 12.5: a 350-point degree (B-SCIEXTD) has 325 left; the fail is still to take.
    expect(pointsLeft(results, data, 350)).toBe(325)
    expect(pointsLeft(results, data, 300)).toBe(275)
  })

  it('what-if: adds one mark, weighted by that subject’s points', () => {
    const data = dataset([
      subject({ code: 'AAAA10001' }),
      subject({ code: 'AAAA10002' }),
      subject({ code: 'BBBB20001', points: 25 }),
      subject({ code: 'CCCC10001', pass_fail: true }),
    ])
    const results = [{ code: 'AAAA10001', mark: 80 }, { code: 'AAAA10002', mark: 60 }]
    // (80 + 60 + 2 × 90) / 4 = 80: a 25-point subject counts twice.
    expect(wamIf(results, data, 'BBBB20001', 90)).toBe(80)
    // (80 + 60 + 70) / 3 = 70 for a 12.5-point one.
    expect(wamIf(results, data, 'AAAA10003', 70)).toBe(70)
    // Pass/fail subjects never count, and marks are kept inside 0–100.
    expect(wamIf(results, data, 'CCCC10001', 90)).toBeNull()
    expect(wamIf([], data, 'AAAA10001', 140)).toBe(100)
    // A pass/fail result on record doesn't move it either; a retake counts as another attempt.
    expect(wamIf([...results, { code: 'CCCC10001', failed: false }], data, 'AAAA10002', 80)).toBe(73.3)
  })
})
