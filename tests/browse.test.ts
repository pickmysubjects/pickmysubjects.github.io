import { describe, expect, it } from 'vitest'
import { applyQuick, browse, browseAddress, EMPTY_FILTERS, filtersFromQuery, filtersToQuery, findRows, quickChoice, QUICK_CHOICES, type BrowseFilters } from '../src/engine/browse'
import { rankSubjects } from '../src/engine/easeRanking'
import { recommend } from '../src/engine/recommend'
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

  it('summer & winter lists only subjects offered in summer or winter that year', () => {
    const rows = run({ offTerm: true })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.periods.some((p) => p === 'summer' || p === 'winter')).toBe(true)
    const semesterOnly = run({}).filter((r) => r.periods.length > 0 && r.periods.every((p) => p === 'semester-1' || p === 'semester-2'))
    expect(semesterOnly.length).toBeGreaterThan(0)
    const codes = new Set(rows.map((r) => r.subject.code))
    for (const r of semesterOnly) expect(codes.has(r.subject.code)).toBe(false)
  })

  it('summer & winter round-trips through its address and the query', () => {
    const f = applyQuick(EMPTY_FILTERS, 'summerWinter')
    expect(f.offTerm).toBe(true)
    expect(browseAddress(f)).toBe('subjects/summer-winter/')
    expect(browseAddress({ ...f, level: 1 })).toBe('subjects/?level=1&offterm=1')
    expect(filtersFromQuery(new URLSearchParams('level=1&offterm=1'))).toEqual({ ...f, level: 1 })
    expect(quickChoice(filtersFromQuery(new URLSearchParams(''), 'summer-winter'))).toBe('summerWinter')
    // Another quick choice starts over, so the summer & winter filter goes.
    expect(applyQuick(f, 'noExam').offTerm).toBe(false)
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
    const f: BrowseFilters = { text: 'maths', category: 'breadth', level: 2, period: 'semester-2', noPrereq: true, noExam: true, noGroup: true, sort: 'hours', rank: 'easy', mine: true, offTerm: true }
    expect(filtersFromQuery(new URLSearchParams(filtersToQuery(f)))).toEqual(f)
  })

  it('leaves defaults out', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('')
  })

  it('applies a preset, and ignores junk values', () => {
    expect(filtersFromQuery(new URLSearchParams('preset=firstSemester'))).toMatchObject({ level: 1, period: 'semester-1', noPrereq: false })
    expect(filtersFromQuery(new URLSearchParams('level=9&when=autumn&sort=x&preset=nope'))).toEqual(EMPTY_FILTERS)
  })

  it('opens a quick pick from its own address, unless the query sets filters', () => {
    expect(filtersFromQuery(new URLSearchParams(''), 'no-exam').noExam).toBe(true)
    expect(filtersFromQuery(new URLSearchParams(''), 'breadth').category).toBe('breadth')
    expect(filtersFromQuery(new URLSearchParams(''), 'first-semester')).toMatchObject({ level: 1, period: 'semester-1' })
    // Filters the student changed since (written back to the query) win over the address.
    expect(filtersFromQuery(new URLSearchParams('level=2'), 'no-exam').noExam).toBe(false)
    // A shared link's tracking parameters don't count as filters.
    expect(filtersFromQuery(new URLSearchParams('fbclid=abc&utm_source=xhs'), 'no-exam').noExam).toBe(true)
    expect(filtersFromQuery(new URLSearchParams(''), 'nonsense')).toEqual(filtersFromQuery(new URLSearchParams('')))
  })
})

describe('quick choices on Find subjects', () => {
  const { dataset: data } = buildDataset('real')
  const all = Object.values(data.subjects)
  const opts = { course: 'B-SCI', rankCourse: 'B-SCI', year: 2026 }

  it('each choice opens from its old address and keeps that address when nothing else is set', () => {
    const slugs: Record<string, string> = { easy: 'easy', hard: 'hard', noExam: 'no-exam', firstSemester: 'first-semester', breadth: 'breadth', summerWinter: 'summer-winter' }
    for (const c of QUICK_CHOICES) {
      const f = applyQuick(EMPTY_FILTERS, c)
      expect(quickChoice(f)).toBe(c)
      if (c === 'all') expect(browseAddress(f)).toBe('subjects/')
      else {
        expect(browseAddress(f)).toBe(`subjects/${slugs[c]}/`)
        expect(quickChoice(filtersFromQuery(new URLSearchParams(''), slugs[c]))).toBe(c)
      }
    }
  })

  it('one choice at a time: picking another drops the last, the search text and "sort for me" stay', () => {
    const f = applyQuick({ ...EMPTY_FILTERS, text: 'comp', mine: true, noExam: true, level: 2 }, 'easy')
    expect(f).toEqual({ ...EMPTY_FILTERS, text: 'comp', mine: true, rank: 'easy' })
    expect(applyQuick(f, 'all')).toEqual({ ...EMPTY_FILTERS, text: 'comp', mine: true })
  })

  it('anything more than a plain choice goes in a shareable query', () => {
    const f = { ...applyQuick(EMPTY_FILTERS, 'easy'), level: 1, mine: true }
    const address = browseAddress(f)
    expect(address).toBe('subjects/?level=1&list=easy&mine=1')
    expect(filtersFromQuery(new URLSearchParams(address.split('?')[1]))).toEqual(f)
  })

  it('old easy-list links with their filters still open the same list', () => {
    const f = filtersFromQuery(new URLSearchParams('course=B-SCI&level=1&breadth=1'), 'easy')
    expect(f).toMatchObject({ rank: 'easy', level: 1, category: 'breadth' })
  })

  it('the easy list lists the ranked subjects in their order, each with its reasons', () => {
    const rows = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts)
    const ranked = rankSubjects(all, { direction: 'easy', course: 'B-SCI', year: 2026 })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.subject.code)).toEqual(ranked.map((r) => r.subject.code))
    expect(rows.every((r) => r.ranked && r.ranked.reasons.length > 0)).toBe(true)
  })

  it('other filters narrow the easy list without reordering it', () => {
    const level1 = findRows(all, { ...applyQuick(EMPTY_FILTERS, 'easy'), level: 1 }, opts).map((r) => r.subject.code)
    const whole = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts).map((r) => r.subject.code)
    expect(level1.length).toBeGreaterThan(0)
    expect(level1.every((c) => data.subjects[c]!.level === 1)).toBe(true)
    expect(level1).toEqual(whole.filter((c) => level1.includes(c)))
  })

  it('"sort for me" orders by the student\'s suggestions, each with its reason, even with nothing filled in', () => {
    const recs = recommend(data, { results: [], skills: {}, interests: [], goal: 'wam' }, { course: 'B-SCI' })
    const rows = findRows(all, { ...EMPTY_FILTERS, mine: true }, { ...opts, recs })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.subject.code)).toEqual(recs.map((r) => r.code).filter((c) => rows.some((x) => x.subject.code === c)))
    expect(rows.every((r) => r.rec !== undefined)).toBe(true)
    // With a quick choice too: only that choice's subjects, still in the student's order.
    const noExam = findRows(all, { ...applyQuick(EMPTY_FILTERS, 'noExam'), mine: true }, { ...opts, recs })
    expect(noExam.length).toBeGreaterThan(0)
    expect(noExam.every((r) => r.exam === 0)).toBe(true)
    expect(noExam.map((r) => r.subject.code)).toEqual(rows.map((r) => r.subject.code).filter((c) => noExam.some((x) => x.subject.code === c)))
  })

  it('"sort for me" off: the ordinary filtered list', () => {
    expect(findRows(all, EMPTY_FILTERS, opts).map((r) => r.subject.code)).toEqual(browse(all, EMPTY_FILTERS, 'B-SCI', 2026).map((r) => r.subject.code))
  })
})
