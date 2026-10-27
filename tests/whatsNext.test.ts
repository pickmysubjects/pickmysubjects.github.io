import { describe, expect, it } from 'vitest'
import { KEY_DATES } from '@/utils/keyDates'
import { currentTerms, daysBetween, examWindow, myTerm, upcomingDates } from '@/utils/whatsNext'

describe('upcomingDates', () => {
  it('census week: the census date comes first with its day count', () => {
    const items = upcomingDates(KEY_DATES, '2026-08-25')
    expect(items[0]!.date.id).toBe('2026-semester-2-census')
    expect(items[0]!.days).toBe(6)
  })
  it('a running range shows first, then the nearest starts, at most three', () => {
    const items = upcomingDates(KEY_DATES, '2026-10-27')
    expect(items.map((i) => i.date.id)).toEqual(['2026-semester-2-swotvac', '2026-semester-2-exams'])
    expect(items[0]!.running).toBe(true)
    expect(upcomingDates(KEY_DATES, '2026-11-14').length).toBeLessThanOrEqual(3)
  })
  it('nothing near: nothing shown', () => {
    expect(upcomingDates(KEY_DATES, '2026-05-15')).toEqual([])
  })
  it('a one-day date that passed is gone the next day', () => {
    expect(upcomingDates(KEY_DATES, '2026-09-01').some((i) => i.date.kind === 'census')).toBe(false)
  })
  it('counts whole days across the DST change', () => {
    expect(daysBetween('2026-10-03', '2026-10-05')).toBe(2)
  })
})

describe('examWindow', () => {
  it('runs from the first SWOT Vac day to the last exam', () => {
    expect(examWindow(KEY_DATES, '2026-10-25')).toBeNull()
    expect(examWindow(KEY_DATES, '2026-10-26')?.term).toBe('semester-2')
    expect(examWindow(KEY_DATES, '2026-11-20')?.exams.end).toBe('2026-11-20')
    expect(examWindow(KEY_DATES, '2026-11-21')).toBeNull()
  })
})

describe('myTerm', () => {
  const plan = [{ year: 2026, period: 'semester-2', subjects: ['COMP10001', 'MAST10006'] }]
  const results = [{ code: 'ECON10004', year: 2026, period: 'semester-2' }, { code: 'COMP10001', year: 2026, period: 'semester-2' }]
  it('joins planned and recorded subjects of the term under way, once each', () => {
    const m = myTerm(KEY_DATES, '2026-09-10', plan, results)!
    expect(m.subjects).toEqual(['COMP10001', 'MAST10006', 'ECON10004'])
    expect(m.exams?.start).toBe('2026-11-02')
  })
  it('no subjects in the current term: nothing personal', () => {
    expect(myTerm(KEY_DATES, '2026-04-10', plan, results)).toBeNull()
    expect(currentTerms(KEY_DATES, '2026-04-10')).toEqual([{ year: 2026, term: 'semester-1' }])
  })
})
