import { describe, expect, it } from 'vitest'
import { browse, EMPTY_FILTERS, filtersFromQuery, filtersToQuery, type BrowseFilters } from '../src/engine/browse'
import { buildDataset } from '../scripts/dataset'

describe('browse (real data)', () => {
  const { dataset: data } = buildDataset('real')
  const all = Object.values(data.subjects)
  const run = (f: Partial<BrowseFilters>) => browse(all, { ...EMPTY_FILTERS, ...f }, 'B-SCI', 2026)

  it('lists everything with no filters, by code', () => {
    const rows = run({})
    expect(rows).toHaveLength(all.length)
    expect(rows.map((r) => r.subject.code)).toEqual([...rows.map((r) => r.subject.code)].sort())
  })

  it('finds breadth subjects for B-SCI', () => {
    const rows = run({ category: 'breadth' })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.subject.categories['B-SCI'] === 'breadth')).toBe(true)
    expect(rows.map((r) => r.subject.code)).toContain('ACCT10001')
  })

  it('level, semester and prerequisite filters combine', () => {
    const rows = run({ level: 1, period: 'semester-1', noPrereq: true })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.level).toBe(1)
      expect(r.subject.prerequisites).toBe('none')
      expect(r.periods).toContain('semester-1')
    }
  })

  it('"no exam" keeps only subjects whose recorded assessment has no exam', () => {
    const rows = run({ noExam: true })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.assessment).toBeDefined()
      expect(r.subject.assessment!.some((t) => t.kind === 'exam')).toBe(false)
    }
  })

  it('sorts by exam share, lowest first, unknowns last', () => {
    const exams = run({ sort: 'exam' }).map((r) => r.exam)
    const known = exams.filter((x): x is number => x !== null)
    expect(known).toEqual([...known].sort((a, b) => a - b))
    expect(exams.slice(known.length).every((x) => x === null)).toBe(true)
  })

  it('matches text in code or title, ignoring case', () => {
    expect(run({ text: 'comp10001' }).map((r) => r.subject.code)).toContain('COMP10001')
    expect(run({ text: 'accounting reports' }).map((r) => r.subject.code)).toEqual(['ACCT10001'])
  })
})

describe('browse filters in the address', () => {
  it('round-trips', () => {
    const f: BrowseFilters = { text: 'maths', category: 'breadth', level: 2, period: 'semester-2', noPrereq: true, noExam: true, noGroup: true, sort: 'hours' }
    expect(filtersFromQuery(new URLSearchParams(filtersToQuery(f)))).toEqual(f)
  })

  it('leaves defaults out', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('')
  })

  it('applies a preset, and ignores junk values', () => {
    expect(filtersFromQuery(new URLSearchParams('preset=firstSemester'))).toMatchObject({ level: 1, period: 'semester-1', noPrereq: false })
    expect(filtersFromQuery(new URLSearchParams('level=9&when=autumn&sort=x&preset=nope'))).toEqual(EMPTY_FILTERS)
  })
})
