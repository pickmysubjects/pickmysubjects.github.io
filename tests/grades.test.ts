import { describe, expect, it } from 'vitest'
import { bandOf, gradeOffsets, MIN_GRADE_SHARES, wamBandMid, wamBandOf } from '../src/engine/grades'
import { buildDataset } from '../scripts/dataset'
import { predictMark } from '../src/engine/predict'

describe('shared grade bands', () => {
  it('bands and WAM ranges round-trip', () => {
    expect([bandOf(80), bandOf(79.9), bandOf(70), bandOf(49)]).toEqual(['H1', 'H2A', 'H2B', 'N'])
    expect(wamBandOf(73.6)).toBe('70–74')
    expect(wamBandMid('70–74')).toBe(72)
    expect(wamBandMid('70-74')).toBe(72)
    expect(wamBandMid('71–75')).toBeNull()
  })

  it('publishes only subjects with enough shares, shrunk toward 0, and drops junk', () => {
    const row = (code: string, band: string, wamBand: string) => ({ code, band, wamBand })
    const rows = [
      ...Array.from({ length: MIN_GRADE_SHARES }, () => row('COMP10001', 'H1', '70–74')), // 85 − 72 = +13
      ...Array.from({ length: MIN_GRADE_SHARES - 1 }, () => row('MAST10006', 'P', '70–74')),
      row('XXXX00000', 'H1', '70–74'),
      row('COMP10001', 'H9', '70–74'),
      row('COMP10001', 'H1', 'lots'),
    ]
    const out = gradeOffsets(rows, new Set(['COMP10001', 'MAST10006']))
    expect(Object.keys(out)).toEqual(['COMP10001'])
    expect(out.COMP10001!.n).toBe(MIN_GRADE_SHARES)
    expect(out.COMP10001!.offset).toBeGreaterThan(0)
    expect(out.COMP10001!.offset).toBeLessThan(13)
    expect(out.COMP10001!.sd).toBeGreaterThan(0)
  })

  it('reads a band as the interval it is: an H1 from a 90–94 student is no sign of a hard subject', () => {
    const rows = Array.from({ length: 12 }, () => ({ code: 'COMP10001', band: 'H1', wamBand: '90–94' }))
    // The old midpoint (H1 = 85) read this as 7 marks below their WAM.
    expect(gradeOffsets(rows).COMP10001!.offset).toBeGreaterThan(0)
  })

  it('more shares make the estimate surer, and older shares count for less', () => {
    const rows = (n: number, band: string, year: number) => Array.from({ length: n }, () => ({ code: 'COMP10001', band, wamBand: '70–74', year }))
    const few = gradeOffsets(rows(6, 'H2A', 2026))!.COMP10001!
    const many = gradeOffsets(rows(30, 'H2A', 2026))!.COMP10001!
    expect(many.sd!).toBeLessThan(few.sd!)
    // Ten fresh H1s and ten five-year-old Ps: the fresh ones lead.
    const mixed = [...rows(10, 'H1', 2026), ...rows(10, 'P', 2021)]
    expect(gradeOffsets(mixed, undefined, { year: 2026 }).COMP10001!.offset).toBeGreaterThan(gradeOffsets(mixed).COMP10001!.offset)
  })

  it('a known offset moves the likely mark', () => {
    const { dataset: data } = buildDataset('real')
    const marks = new Map([['COMP10001', 75], ['MAST10006', 75], ['BIOL10004', 75]])
    const s = data.subjects.COMP10002!
    const plain = predictMark(s, marks, data)!.mark
    const generous = predictMark({ ...s, gradeOffset: { offset: 4, n: 20 } }, marks, data)!.mark
    expect(generous - plain).toBeCloseTo(4, 5)
  })
})
