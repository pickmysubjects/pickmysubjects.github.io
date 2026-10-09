import { describe, expect, it } from 'vitest'
import { pastTerms, recentTerms } from '../src/utils/pastTerms'

describe('pastTerms', () => {
  it('groups completed subjects by semester, oldest first, and keeps the undated apart', () => {
    const { terms, undated } = pastTerms([
      { code: 'MAST10006', mark: 70, year: 2026, period: 'semester-1' },
      { code: 'COMP10001', mark: 40, year: 2025, period: 'semester-2' },
      { code: 'BIOL10008', mark: 80, year: 2026, period: 'semester-1' },
      { code: 'CHEM10003', mark: 65 },
    ])
    expect(terms.map((t) => `${t.year} ${t.period}: ${t.results.map((r) => r.code).join(' ')}`)).toEqual([
      '2025 semester-2: COMP10001',
      '2026 semester-1: MAST10006 BIOL10008',
    ])
    expect(terms[0]?.results[0]?.failed).toBe(true)
    expect(undated.map((r) => r.code)).toEqual(['CHEM10003'])
  })

  it('treats a nonsense stored semester as not given', () => {
    const { terms, undated } = pastTerms([{ code: 'COMP10001', year: 3000, period: 'semester-1' }, { code: 'COMP10002', year: 2025, period: 'autumn' as never }])
    expect(terms).toEqual([])
    expect(undated).toHaveLength(2)
  })

  it('offers the last few years of semesters, newest first', () => {
    const list = recentTerms(new Date('2026-10-09'), 2)
    expect(list[0]).toEqual({ year: 2026, period: 'semester-2' })
    expect(list).toHaveLength(8)
  })
})
