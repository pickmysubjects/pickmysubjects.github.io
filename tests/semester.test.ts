import { describe, expect, it } from 'vitest'
import { KEY_DATES } from '../src/utils/keyDates'
import { mondayOf, nextKeyDates, semesterNow, semesterShape } from '../src/utils/semester'

describe('semester weeks from the key dates', () => {
  it('Semester 1 2027: twelve teaching weeks around a one-week break, then SWOT Vac and three exam weeks', () => {
    const s = semesterShape(KEY_DATES, 2027, 'semester-1')!
    expect(s.weeks).toBe(12)
    expect(s.segments.map((x) => (x.kind === 'teach' ? x.week : x.kind))).toEqual([1, 2, 3, 4, 'break', 5, 6, 7, 8, 9, 10, 11, 12, 'swotvac', 'exams'])
    expect(s.segments.at(-1)!.span).toBe(3)
  })

  it('a break starting on a Friday (Easter) leaves that week a teaching week', () => {
    const s = semesterShape(KEY_DATES, 2026, 'semester-1')!
    expect(s.weeks).toBe(12)
    expect(s.segments.findIndex((x) => x.kind === 'break')).toBe(5)
  })

  it('every semester in the data has 12 teaching weeks', () => {
    for (const [y, t] of [[2026, 'semester-1'], [2026, 'semester-2'], [2027, 'semester-1'], [2027, 'semester-2']] as const) {
      expect(semesterShape(KEY_DATES, y, t)?.weeks, `${y} ${t}`).toBe(12)
    }
  })

  it('mondayOf', () => {
    expect(mondayOf('2027-03-01')).toBe('2027-03-01')
    expect(mondayOf('2027-03-07')).toBe('2027-03-01')
    expect(mondayOf('2027-03-08')).toBe('2027-03-08')
  })
})

describe('where today falls', () => {
  const at = (d: string) => semesterNow(KEY_DATES, d)

  it('teaching weeks, counting past the break', () => {
    expect(at('2027-03-01')).toMatchObject({ phase: 'teach', week: 1 })
    expect(at('2027-03-25')).toMatchObject({ phase: 'teach', week: 4 })
    expect(at('2027-03-30')).toMatchObject({ phase: 'break', week: 4 })
    expect(at('2027-04-05')).toMatchObject({ phase: 'teach', week: 5 })
    expect(at('2027-05-30')).toMatchObject({ phase: 'teach', week: 12 })
  })

  it('the Easter Friday at the end of a teaching week is the break', () => {
    expect(at('2026-04-03')).toMatchObject({ phase: 'break', week: 5 })
    expect(at('2026-04-02')).toMatchObject({ phase: 'teach', week: 5 })
  })

  it('SWOT Vac, exams, waiting for results, results out', () => {
    expect(at('2027-06-01')?.phase).toBe('swotvac')
    expect(at('2027-06-05')?.phase).toBe('swotvac')
    expect(at('2027-06-10')?.phase).toBe('exams')
    expect(at('2027-06-30')?.phase).toBe('waiting')
    expect(at('2027-07-09')).toMatchObject({ phase: 'results', sem: { term: 'semester-1' } })
    // Semester 2's orientation ends the "just finished" window.
    expect(at('2027-07-19')?.phase).toBe('before')
  })

  it('between semesters: the next one and how far away it is', () => {
    const now = at('2027-01-20')!
    expect(now).toMatchObject({ phase: 'before', sem: { year: 2027, term: 'semester-1' } })
    expect(now.phase === 'before' && now.days).toBe(40)
    expect(at('2026-12-04')).toMatchObject({ phase: 'results', sem: { year: 2026, term: 'semester-2' } })
    expect(at('2027-01-01')?.phase).toBe('before')
  })

  it('nothing to say past the last published semester', () => {
    expect(at('2028-06-01')).toBeNull()
  })
})

describe('next key dates', () => {
  it('soonest first, running ones ahead, never the teaching period under way', () => {
    const next = nextKeyDates(KEY_DATES, '2027-03-30')
    expect(next[0]).toMatchObject({ running: true, date: { kind: 'break' } })
    expect(next.map((n) => n.date.kind)).not.toContain('teaching')
    expect(next).toHaveLength(4)
  })
})

describe('edge days in the date data', () => {
  const brk = (start: string, end: string) => ({ id: 'b', kind: 'break' as const, year: 2030, term: 'semester-1' as const, start, end, url: '' })
  const base = [
    { id: 't', kind: 'teaching' as const, year: 2030, term: 'semester-1' as const, start: '2030-03-04', end: '2030-06-02', url: '' },
    { id: 'e', kind: 'exams' as const, year: 2030, term: 'semester-1' as const, start: '2030-06-11', end: '2030-06-28', url: '' },
    { id: 'r', kind: 'results' as const, year: 2030, term: 'semester-1' as const, start: '2030-07-12', end: '2030-07-12', url: '' },
  ]

  it('a day after teaching with SWOT Vac not published yet is SWOT Vac, not the next semester', () => {
    expect(semesterNow([...base, brk('2030-04-15', '2030-04-21')], '2030-06-04')).toMatchObject({ phase: 'swotvac' })
  })

  it('the Monday before a Tuesday first exam is still SWOT Vac, and the weekend after the last exam is waiting', () => {
    const d = [...base, brk('2030-04-15', '2030-04-21')]
    expect(semesterNow(d, '2030-06-10')).toMatchObject({ phase: 'swotvac' })
    expect(semesterNow(d, '2030-06-11')).toMatchObject({ phase: 'exams' })
    expect(semesterNow(d, '2030-06-29')).toMatchObject({ phase: 'waiting' })
  })

  it('a break ending on a Tuesday counts the weeks before it, not the week it runs into', () => {
    // Fri 12 Apr to Tue 23 Apr: week 6 (8–14 Apr) teaching, 15–21 Apr the break, 22–28 Apr week 7.
    const d = [...base, brk('2030-04-12', '2030-04-23')]
    expect(semesterNow(d, '2030-04-22')).toMatchObject({ phase: 'break', week: 6 })
    expect(semesterNow(d, '2030-04-24')).toMatchObject({ phase: 'teach', week: 7 })
  })
})
