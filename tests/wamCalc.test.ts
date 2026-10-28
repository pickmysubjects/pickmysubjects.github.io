import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { provideDataset } from '../src/composables/useDataset'
import { useProfile } from '../src/composables/useProfile'
import { useWamCalc } from '../src/composables/useWamCalc'
import { computeWam } from '../src/engine'
import { cleanProfile } from '../src/utils/sanitize'
import { realData } from './realData'

const data = realData()
beforeAll(() => provideDataset(data))
// Two marked subjects that count in the WAM (not pass/fail), any from the real data.
const codes = Object.values(data.subjects).filter((s) => !s.passFail && s.points === 12.5).map((s) => s.code).slice(0, 4)
const [A, B, C, D] = codes as [string, string, string, string]

describe('WAM calculator and My record', () => {
  beforeEach(() => {
    const p = useProfile()
    p.setResults([])
    p.setTargetWam(undefined)
  })

  it('reads the record and follows its changes', () => {
    const { setResults } = useProfile()
    const calc = useWamCalc()
    expect(calc.fromRecord.value).toBe(false)
    setResults([{ code: A, mark: 70 }, { code: B, mark: 80 }])
    expect(calc.recordCount.value).toBe(2)
    expect(calc.wam.value).toBe(75)
    setResults([{ code: A, mark: 70 }])
    expect(calc.wam.value).toBe(70)
  })

  it('counts what-ifs on top of the record without saving them', () => {
    const { setResults, profile } = useProfile()
    setResults([{ code: A, mark: 70 }])
    const calc = useWamCalc()
    calc.add(B)
    calc.setMark(0, 90)
    expect(calc.wam.value).toBe(80)
    expect(calc.recordWam.value).toBe(70)
    expect(profile.value.results).toEqual([{ code: A, mark: 70 }])
    // A new calculator (the page opened again) starts without them.
    expect(useWamCalc().wam.value).toBe(70)
  })

  it('saves typed marks to an empty record only when asked', () => {
    const { profile } = useProfile()
    const calc = useWamCalc()
    calc.add(C)
    calc.setMark(0, 65)
    expect(profile.value.results).toEqual([])
    calc.save()
    expect(profile.value.results).toEqual([{ code: C, mark: 65 }])
    expect(calc.rows.value).toEqual([])
    expect(computeWam(profile.value.results, data)).toBe(65)
  })

  it('shares one target WAM with the record, both ways', () => {
    const p = useProfile()
    const calc = useWamCalc()
    calc.setTarget(78)
    expect(p.profile.value.targetWam).toBe(78)
    p.setTargetWam(72)
    expect(calc.target.value).toBe(72)
    calc.setTarget('')
    expect(p.profile.value.targetWam).toBeUndefined()
  })

  it('works out the average needed for the target from the record plus what-ifs', () => {
    const { setResults, setTargetWam } = useProfile()
    setResults([{ code: A, mark: 70 }, { code: B, mark: 70 }])
    setTargetWam(75)
    const calc = useWamCalc()
    // 25 points at 70, the default 300-point degree: (75 × 300 − 70 × 25) ÷ 275.
    expect(calc.need.value).toBeCloseTo(75.5, 1)
    calc.add(D)
    calc.setMark(0, 100)
    expect(calc.need.value).toBeCloseTo((75 * 300 - (70 * 25 + 100 * 12.5)) / 262.5, 1)
  })

  it('keeps the target through a saved copy, and drops a broken one', () => {
    const base = { results: [], skills: {}, interests: [], goal: 'balanced' }
    expect(cleanProfile({ ...base, targetWam: 77 }).targetWam).toBe(77)
    expect(cleanProfile({ ...base, targetWam: 140 }).targetWam).toBeUndefined()
    expect(cleanProfile({ ...base, targetWam: 'x' }).targetWam).toBeUndefined()
  })
})
