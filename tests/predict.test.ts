import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { predictMark } from '../src/engine/predict'
import { referencedSubjects } from '../src/engine/expr'
import { rng } from './synthetic'
import { personalise, recommend } from '../src/engine/recommend'

/** Predicting from similar subjects, the "marks only" goal, and past choices (real data). */
describe('marks and choices', () => {
  const data = realData()
  const marks = new Map([
    ['COMP10001', 88],
    ['COMP10002', 85],
    ['MAST10006', 55],
    ['MAST10007', 58],
  ])

  it('a coding subject is predicted from coding marks, a maths one from maths marks', () => {
    const code = predictMark(data.subjects.COMP20003!, marks, data)!
    const maths = predictMark(data.subjects.MAST20009!, marks, data)!
    expect(code.mark).toBeGreaterThan(maths.mark + 10)
    expect(maths.mark).toBeLessThan(70)
    expect(code.low).toBeLessThan(code.mark)
    expect(code.high).toBeGreaterThan(code.mark)
  })

  it('"marks only" ignores interests entirely', () => {
    const base = { results: [], skills: {}, goal: 'easy' as const }
    const a = recommend(data, { ...base, interests: ['physics'] }, { course: 'B-SCI', year: 2026, limit: 10 }).map((r) => r.code)
    const b = recommend(data, { ...base, interests: ['finance'] }, { course: 'B-SCI', year: 2026, limit: 10 }).map((r) => r.code)
    expect(a).toEqual(b)
  })

  it('a field taken as breadth before ranks higher than it would otherwise', () => {
    const done = ['SCIE10005', 'COMP10001', 'MAST10006', 'MAST10007'].map((code) => ({ code }))
    const rank = (extra: string[]) => {
      const results = [...done, ...extra.map((code) => ({ code }))]
      return recommend(data, { results, skills: {}, interests: [], goal: 'balanced' }, { course: 'B-COM', year: 2027 }).findIndex((r) => r.code === 'PSYC10004')
    }
    expect(rank(['PSYC10003'])).toBeLessThan(rank(['CHEM10003']))
  })
  it('says when the Handbook recommends something first, until any of it is done', () => {
    const s = Object.values(data.subjects).find((x) => x.recommended.length && x.prerequisites === 'none')
    if (!s) return
    const warns = (results: { code: string }[]) =>
      recommend(data, { results, skills: {}, interests: [], goal: 'balanced' }, { course: 'B-SCI', year: 2026 }).find((r) => r.code === s.code)?.warnings.map((w) => w.key) ?? []
    expect(warns([])).toContain('recommendedFirst')
    expect(warns([{ code: s.recommended[0]! }])).not.toContain('recommendedFirst')
  })
  it('own ratings fill in unrated skills and add soft interests, never overriding what was said', () => {
    const p = { results: [{ code: 'COMP10001' }], skills: { writing: 2 }, interests: [], goal: 'balanced' as const, ratings: { COMP10001: { difficulty: 1, recommend: 'Yes' as const } } }
    const { profile, liked } = personalise(p, data)
    expect(profile.skills.programming).toBe(5)
    expect(profile.skills.writing).toBe(2)
    expect(liked.get('programming')).toBe('COMP10001')
    const recs = recommend(data, p, { course: 'B-SCI', year: 2026 })
    expect(recs.some((r) => r.reasons.some((x) => x.key === 'likedBefore'))).toBe(true)
  })

  it('a hard rating lowers an unrated skill, so related subjects warn', () => {
    const p = { results: [{ code: 'MAST10006' }], skills: {}, interests: [], goal: 'balanced' as const, ratings: { MAST10006: { difficulty: 5 } } }
    expect(personalise(p, data).profile.skills.maths).toBe(1)
  })
  it('protecting a WAM pushes an elective in a low-mark area further down than balanced does', () => {
    const results = [{ code: 'MAST10006', mark: 52 }, { code: 'MAST10007', mark: 50 }, { code: 'BIOL10004', mark: 82 }, { code: 'COMP10001', mark: 84 }]
    const rank = (goal: 'wam' | 'balanced') => {
      const list = recommend(data, { results, skills: {}, interests: [], goal }, { course: 'B-SCI', year: 2026, maxLevel: 2 })
      const r = list.find((x) => x.code.startsWith('MAST2') && x.warnings.some((w) => w.key === 'averagedLow'))
      return r ? list.indexOf(r) / list.length : 1
    }
    expect(rank('wam')).toBeGreaterThanOrEqual(rank('balanced'))
  })
})

describe('paid work hours', () => {
  it('a busy job makes a term with ordinary class hours count as busy; none leaves it alone', async () => {
    const { termStress } = await import('../src/engine/termStress')
    const data = realData()
    const subjects = ['COMP10001', 'MAST10006', 'MAST10007', 'ECON10004']
    const base = { results: [], skills: {}, interests: [], goal: 'balanced' as const }
    const without = termStress(subjects, data, base).reasons.map((r) => r.key)
    const withJob = termStress(subjects, data, { ...base, workHours: 25 }).reasons.map((r) => r.key)
    expect(without).not.toContain('hours')
    expect(withJob).toContain('hoursWork')
  })
})

describe('the WAM a prediction leans back to', () => {
  it('is weighted by points, as the University works it out', async () => {
    const { dataset, subject } = await import('./helpers')
    const data = dataset([
      subject({ code: 'AAAA10001', area: 'AAAA', points: 25 }),
      subject({ code: 'BBBB10001', area: 'BBBB', points: 12.5 }),
      subject({ code: 'CCCC10001', area: 'CCCC' }),
    ])
    // Nothing related to CCCC10001: the guess is the WAM itself, (90×25 + 60×12.5) / 37.5 = 80.
    const guess = predictMark(data.subjects.CCCC10001!, new Map([['AAAA10001', 90], ['BBBB10001', 60]]), data)
    expect(guess?.mark).toBe(80)
  })
})

describe('shared grades count once in a suggestion', () => {
  it('in how easy a subject is, not again in the student’s likely mark', async () => {
    const { dataset, subject } = await import('./helpers')
    const run = { prerequisites: 'none', offerings: { 2026: ['semester-1'] }, assessment: [{ kind: 'exam', weight: 50 }, { kind: 'assignment', weight: 50 }] }
    const plain = subject({ code: 'AAAA10001', ...run })
    const generous = { ...subject({ code: 'AAAA10002', ...run }), gradeOffset: { offset: 6, n: 12 } }
    const done = ['BBBB10001', 'BBBB10002', 'BBBB10003'].map((code) => subject({ code, prerequisites: 'none' }))
    const data = dataset([plain, generous, ...done])
    const results = [{ code: 'BBBB10001', mark: 70 }, { code: 'BBBB10002', mark: 74 }, { code: 'BBBB10003', mark: 72 }]
    const recs = recommend(data, { results, skills: {}, interests: [], goal: 'wam' }, { year: 2026 })
    const factor = (code: string, key: string) => recs.find((r) => r.code === code)?.factors?.find((f) => f.key === key)?.effect ?? 0
    // The generous one is easier to do well in…
    expect(factor('AAAA10002', 'ease')).toBeGreaterThan(factor('AAAA10001', 'ease'))
    // …and that's said once: the likely-mark part is the student's own level for both.
    expect(factor('AAAA10002', 'predicted')).toBe(factor('AAAA10001', 'predicted'))
    // What it tells the student is still the likely mark, grading included.
    const said = (code: string) => recs.find((r) => r.code === code)?.reasons.find((x) => x.key === 'predictedWam')?.params.mark
    expect(Number(said('AAAA10002'))).toBe(Number(said('AAAA10001')) + 6)
  })
})

describe('marks read less how their subject grades', () => {
  const data = realData()

  /** predictMark's likely mark as of a07316c (2026-10-25), before marks were adjusted for grading. */
  function legacyMark(s: import('../src/engine/schema').Subject, marks: Map<string, number>): number | null {
    const others = [...marks].filter(([c]) => c !== s.code && data.subjects[c])
    if (others.length === 0) return null
    const pts = (c: string) => data.subjects[c]!.points
    const wam = others.reduce((sum, [c, m]) => sum + m * pts(c), 0) / others.reduce((sum, [c]) => sum + pts(c), 0)
    const prereqs = new Set(referencedSubjects(s.prerequisites))
    const related = others.filter(([c]) => prereqs.has(c) || data.subjects[c]!.area === s.area).map(([code, mark]) => ({ code, mark, w: prereqs.has(code) ? 1 : 0.6 }))
    const w = related.reduce((sum, x) => sum + x.w, 0)
    const own = w > 0 ? related.reduce((sum, x) => sum + x.w * x.mark, 0) / w : wam
    return Math.max(0, Math.min(100, (own * w + wam * 2) / (w + 2) + (s.gradeOffset?.offset ?? 0)))
  }

  it('with no shared grades, gives exactly the mark it gave before', () => {
    const rand = rng(7)
    const codes = Object.keys(data.subjects).sort()
    const pick = () => codes[Math.floor(rand() * codes.length)]!
    let checked = 0
    for (let i = 0; i < 400; i++) {
      // A target with prerequisites half the time, so related marks come into it.
      const target = data.subjects[pick()]!
      const done = [...referencedSubjects(target.prerequisites).slice(0, 2), ...Array.from({ length: 1 + Math.floor(rand() * 12) }, pick)]
      const marks = new Map(done.map((c) => [c, 40 + Math.round(rand() * 60)]))
      const now = predictMark(target, marks, data)
      expect(now?.mark ?? null).toBe(legacyMark(target, marks))
      if (now) checked++
    }
    expect(checked).toBeGreaterThan(300)
  })

  it('a prerequisite that grades generously no longer lifts the prediction by its generosity', async () => {
    const { dataset: make, subject } = await import('./helpers')
    const pre = subject({ code: 'AAAA10001', area: 'AAAA', prerequisites: 'none' })
    const next = subject({ code: 'AAAA20001', area: 'AAAA', level: 2, prerequisites: { subject: 'AAAA10001' } })
    const other = subject({ code: 'BBBB10001', area: 'BBBB', prerequisites: 'none' })
    const marks = new Map([['AAAA10001', 80], ['BBBB10001', 70]])
    const plain = predictMark(next, marks, make([pre, next, other]))!.mark
    const generous = predictMark(next, marks, make([{ ...pre, gradeOffset: { offset: 6, n: 20 } }, next, other]))!.mark
    // The 80 was partly the subject's doing: the student's level there is 74, which lowers both
    // the related mark (6) and the WAM (3): (6·1 + 3·2) / (1 + 2) = 4.
    expect(generous).toBeLessThan(plain)
    expect(plain - generous).toBeCloseTo(4, 5)
  })
})
