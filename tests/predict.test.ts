import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { predictMark } from '../src/engine/predict'
import { personalise, recommend } from '../src/engine/recommend'

/** Predicting from similar subjects, the "marks only" goal, and past choices (real data). */
describe('marks and choices', () => {
  const { dataset: data } = buildDataset('real')
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
