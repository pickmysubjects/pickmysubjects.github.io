import { describe, expect, it } from 'vitest'
import { listPlace, rankSubject, rankSubjects, type RankOptions } from '../src/engine/easeRanking'
import type { DiscussionSummary, Subject } from '../src/engine/schema'
import { buildDataset } from '../scripts/dataset'
import { subject } from './helpers'

const RUNS = { 2026: ['semester-1'] }
const base = (code: string, extra: Record<string, unknown> = {}) =>
  subject({ code, offerings: RUNS, categories: { 'B-SCI': 'breadth' }, ...extra })

function withReviews(s: Subject, difficulty?: 'easy' | 'hard' | 'mixed', workload?: 'light' | 'heavy', reviews = 8): Subject {
  const d: DiscussionSummary = {
    code: s.code,
    source: 'StudentVIP',
    url: `https://studentvip.com.au/unimelb/subjects/${s.code.toLowerCase()}`,
    reviews,
    from: 2022,
    to: 2024,
    checked: '2026-10-01',
    points: [],
    difficulty,
    workload,
  }
  return { ...s, discussions: [d] }
}

const allCoursework = [{ kind: 'assignment', weight: 50 }, { kind: 'assignment', weight: 50 }]
const examHeavy = [{ kind: 'exam', weight: 80, hurdle: true }, { kind: 'assignment', weight: 20 }]
const middling = [{ kind: 'exam', weight: 50 }, { kind: 'assignment', weight: 50 }]

const opts = (o: Partial<RankOptions> = {}): RankOptions => ({ direction: 'easy', course: 'B-SCI', year: 2026, ...o })
const codes = (rows: { subject: Subject }[]) => rows.map((r) => r.subject.code)

describe('ease ranking (synthetic subjects)', () => {
  const coursework = base('AAAA10001', { assessment: allCoursework, weekly_contact_hours: 2 })
  const exams = base('BBBB10001', { assessment: examHeavy, weekly_contact_hours: 6 })
  const mid = base('CCCC10001', { assessment: middling, weekly_contact_hours: 3 })

  it('orders on Handbook facts: no exam and few hours above an exam-heavy hurdle subject', () => {
    expect(codes(rankSubjects([exams, mid, coursework], opts()))).toEqual(['AAAA10001'])
    expect(codes(rankSubjects([exams, mid, coursework], opts({ direction: 'hard' })))).toEqual(['BBBB10001'])
  })

  it('a subject with no reviews never ranks above one reviewers call easy', () => {
    // The best possible facts, nobody has reviewed it…
    const perfect = base('DDDD10001', { assessment: allCoursework, weekly_contact_hours: 1 })
    // …against an exam subject that reviews say is easy.
    const reviewedEasy = withReviews(base('EEEE20001', { level: 2, assessment: middling, weekly_contact_hours: 4 }), 'easy')
    const rows = rankSubjects([perfect, reviewedEasy], opts())
    expect(codes(rows)).toEqual(['EEEE20001', 'DDDD10001'])
    expect(rows[1]!.reviews).toBeNull()
    // And facts alone stay closer to neutral than the same facts backed by reviews.
    const sameButReviewed = withReviews({ ...perfect, code: 'FFFF10001' }, 'easy', 'light')
    expect(rankSubject(sameButReviewed, 'easy')!.score).toBeGreaterThan(rankSubject(perfect, 'easy')!.score)
  })

  it('a subject reviewers call hard is left off the easy list, whatever its facts', () => {
    const hardButCoursework = withReviews(base('GGGG10001', { assessment: allCoursework, weekly_contact_hours: 2 }), 'hard', 'heavy')
    expect(codes(rankSubjects([hardButCoursework], opts()))).toEqual([])
    expect(codes(rankSubjects([hardButCoursework], opts({ direction: 'hard' })))).toEqual(['GGGG10001'])
  })

  it('more agreeing reviews lean further than a lone workload remark', () => {
    const both = withReviews(base('HHHH10001', { assessment: middling }), 'hard', 'heavy', 10)
    const workloadOnly = withReviews(base('IIII10001', { assessment: middling }), undefined, 'heavy', 10)
    expect(codes(rankSubjects([workloadOnly, both], opts({ direction: 'hard' })))).toEqual(['HHHH10001', 'IIII10001'])
  })

  it('every listed subject has reasons that match the list', () => {
    const rows = rankSubjects([coursework, withReviews(mid, 'easy', 'light')], opts())
    expect(rows.length).toBe(2)
    for (const r of rows) expect(r.reasons.length).toBeGreaterThan(0)
    expect(rows.find((r) => r.subject.code === 'AAAA10001')!.reasons.map((x) => x.key)).toEqual(['noExam', 'fewHours', 'firstYear'])
    expect(rows.find((r) => r.subject.code === 'CCCC10001')!.reasons.map((x) => x.key).slice(0, 2)).toEqual(['reviewsEasy', 'reviewsLight'])
    const hard = rankSubjects([exams], opts({ direction: 'hard' }))[0]!
    expect(hard.reasons).toContainEqual({ key: 'bigExam', params: { n: 80 } })
    expect(hard.reasons).toContainEqual({ key: 'examHurdle' })
    expect(hard.reasons).toContainEqual({ key: 'manyHours', params: { n: 6 } })
  })

  it('our own ratings count only from three students', () => {
    const two = { ...base('JJJJ10001', { assessment: middling }), signals: { reviews: 2, difficulty: 1, grading: 5 } }
    const three = { ...two, code: 'KKKK10001', signals: { reviews: 3, difficulty: 1, grading: 5 } }
    expect(rankSubject(two, 'easy')!.reviews).toBeNull()
    expect(rankSubject(three, 'easy')!.reasons.map((r) => r.key)).toEqual(['ratedEasy', 'generous', 'firstYear'])
  })

  it('the number of tasks is workload, not difficulty: it leaves ease alone', () => {
    const many = Array.from({ length: 8 }, () => ({ kind: 'assignment', weight: 12.5 }))
    const few = [{ kind: 'assignment', weight: 50 }, { kind: 'assignment', weight: 50 }]
    const a = rankSubject(base('TASK10001', { assessment: many }), 'hard')!
    const b = rankSubject(base('TASK10002', { assessment: few }), 'hard')!
    expect(a.score).toBe(b.score)
    expect(a.reasons.map((r) => r.key)).not.toContain('manyTasks')
  })

  it('shared grades count as the sharers said, not as the facts-based prior moved them', () => {
    // offset: pulled toward what the Handbook facts predict; shared: the bands alone.
    const borrowed = { ...base('GRAD10001', { assessment: middling }), gradeOffset: { offset: 4, shared: 0.5, n: 5 } }
    const own = { ...base('GRAD10002', { assessment: middling }), gradeOffset: { offset: 0.5, n: 5 } }
    const a = rankSubject(borrowed, 'easy')!
    expect(a.score).toBe(rankSubject(own, 'easy')!.score)
    expect(a.reasons.map((r) => r.key)).not.toContain('gradesAbove')
  })

  it('nothing known: not ranked at all', () => {
    expect(rankSubject(base('LLLL10001'), 'easy')).toBeNull()
  })

  it('leaves out subjects not running that year, graduate, pass/fail and closed to the course', () => {
    const notRunning = base('MMMM10001', { assessment: allCoursework, offerings: { 2026: [], 2025: ['semester-1'] } })
    const graduate = base('NNNN90001', { level: 9, assessment: allCoursework })
    const passFail = base('OOOO10001', { assessment: allCoursework, pass_fail: true })
    const otherCourse = base('PPPP10001', { assessment: allCoursework, categories: { 'B-COM': 'commerce' } })
    const unknownRuns = base('QQQQ10001', { assessment: allCoursework, offerings: 'unknown' })
    const rows = rankSubjects([notRunning, graduate, passFail, otherCourse, unknownRuns, coursework], opts())
    expect(codes(rows)).toEqual(['AAAA10001'])
    // With no course chosen, any degree's subject counts.
    expect(codes(rankSubjects([otherCourse], opts({ course: '' })))).toEqual(['PPPP10001'])
  })

  it('filters: level, semester and breadth only', () => {
    const core = base('RRRR20001', { level: 2, assessment: allCoursework, categories: { 'B-SCI': 'science' }, offerings: { 2026: ['semester-2'] } })
    expect(codes(rankSubjects([coursework, core], opts({ breadthOnly: true })))).toEqual(['AAAA10001'])
    expect(codes(rankSubjects([coursework, core], opts({ level: 2 })))).toEqual(['RRRR20001'])
    expect(codes(rankSubjects([coursework, core], opts({ period: 'semester-2' })))).toEqual(['RRRR20001'])
    expect(rankSubjects([coursework, core, mid], opts({ limit: 1 }))).toHaveLength(1)
  })
})

describe('ease ranking (real data)', () => {
  const { dataset } = buildDataset('real')
  const all = Object.values(dataset.subjects)

  for (const direction of ['easy', 'hard'] as const) {
    it(`${direction}: reviewed subjects lead, every row has reasons`, () => {
      const rows = rankSubjects(all, { direction, course: 'B-SCI', year: 2026 })
      expect(rows.length).toBeGreaterThan(30)
      expect(rows.slice(0, 15).every((r) => r.reviews !== null)).toBe(true)
      for (const r of rows) expect(r.reasons.length).toBeGreaterThan(0)
      // Once facts-only subjects start, no reviewed subject that leans this way follows them.
      const firstFactsOnly = rows.findIndex((r) => r.reviews === null)
      const sign = direction === 'easy' ? 1 : -1
      expect(rows.slice(firstFactsOnly).some((r) => r.reviews !== null && r.reviews * sign >= 0.25)).toBe(false)
    })
  }
})

describe('listPlace (subject page chip)', () => {
  const easy1 = withReviews(base('EASY10001', { assessment: allCoursework, weekly_contact_hours: 2 }), 'easy')
  const easy2 = base('EASY10002', { assessment: allCoursework, weekly_contact_hours: 2 })
  const hard1 = withReviews(base('HARD10001', { assessment: examHeavy, weekly_contact_hours: 6 }), 'hard')
  const mid = base('MIDD10001', { assessment: middling, weekly_contact_hours: 3 })
  const record = (...xs: Subject[]) => Object.fromEntries(xs.map((s) => [s.code, s]))
  const subjects = record(easy1, easy2, hard1, mid)

  it('gives the same place as the ranking list, for each direction', () => {
    expect(listPlace(subjects, 'EASY10001', 'B-SCI', 2026)).toEqual({ direction: 'easy', place: 1 })
    expect(listPlace(subjects, 'EASY10002', 'B-SCI', 2026)).toEqual({ direction: 'easy', place: 2 })
    expect(listPlace(subjects, 'HARD10001', 'B-SCI', 2026)).toEqual({ direction: 'hard', place: 1 })
  })

  it('is null for a subject on neither list, an unknown code, or below the cut-off', () => {
    expect(listPlace(subjects, 'MIDD10001', 'B-SCI', 2026)).toBeNull()
    expect(listPlace(subjects, 'NOPE10001', 'B-SCI', 2026)).toBeNull()
    expect(listPlace(subjects, 'EASY10002', 'B-SCI', 2026, 1)).toBeNull()
  })

  it('follows the course: a subject the degree does not list is on no list', () => {
    expect(listPlace(subjects, 'EASY10001', 'B-COM', 2026)).toBeNull()
  })

  it('ranks once per subjects record and course, then reuses it', () => {
    const fresh = record(easy1, easy2)
    const a = listPlace(fresh, 'EASY10001', 'B-SCI', 2026)
    // Changing the record in place after the first lookup is not seen: the ranking was memoised.
    delete fresh.EASY10001
    expect(listPlace(fresh, 'EASY10001', 'B-SCI', 2026)).toEqual(a)
    // A new record ranks afresh.
    expect(listPlace(record(easy2), 'EASY10001', 'B-SCI', 2026)).toBeNull()
  })
})
