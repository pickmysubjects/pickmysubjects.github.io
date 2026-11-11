import { describe, expect, it } from 'vitest'
import { rankSubject } from '../src/engine/easeRanking'
import { recommend, type Profile } from '../src/engine/recommend'
import { aggregateRatingLd } from '../src/utils/seo'
import { dataset, subject } from './helpers'

const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const rated = (code: string, signals: Record<string, unknown>) =>
  subject({ code, offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'breadth' }, signals })

describe('rating consumers only use our own ratings from 3 people', () => {
  it('exam difficulty moves the ease ranking, but only from three ratings', () => {
    const plain = rateScore(rated('AAAA10001', { reviews: 3, difficulty: 3 }))
    const hardExams = rateScore(rated('AAAA10002', { reviews: 3, difficulty: 3, examDifficulty: 5 }))
    const easyExams = rateScore(rated('AAAA10003', { reviews: 3, difficulty: 3, examDifficulty: 1 }))
    expect(hardExams).toBeLessThan(plain)
    expect(easyExams).toBeGreaterThan(plain)
    // Two ratings: nothing of ours counts at all.
    expect(rankSubject(rated('AAAA10004', { reviews: 2, examDifficulty: 1 }), 'easy')).toBeNull()
  })

  it('weighs our ratings by how many people gave them, as review summaries are', () => {
    // Six reviews say hard; three ratings here say easy. Three people don't overturn six: the
    // subject stays harder than one only the ratings speak for, and more ratings move it further.
    const easy = (n: number) => ({ reviews: n, difficulty: 1, grading: 5, workload: 1 })
    const withHardReviews = (code: string, n: number) => {
      const s = rated(code, easy(n))
      // Only what the ranking reads of a summary: its source, its count and its verdict.
      s.discussions = [{ source: 'StudentVIP', reviews: 6, difficulty: 'hard' } as unknown as NonNullable<typeof s.discussions>[number]]
      return s
    }
    const score = (s: ReturnType<typeof rated>) => rankSubject(s, 'easy')!.reviews!
    const three = score(withHardReviews('AAAA10011', 3))
    const ten = score(withHardReviews('AAAA10012', 10))
    const ratingsOnly = score(rated('AAAA10013', easy(3)))
    expect(three).toBeLessThan(ratingsOnly)
    expect(ten).toBeGreaterThan(three)
  })

  it('says "most would recommend it" from 80% and three ratings only', () => {
    const keys = (signals: Record<string, unknown>) => {
      const data = dataset([rated('BBBB10001', signals)])
      return recommend(data, profile).find((r) => r.code === 'BBBB10001')?.reasons.map((n) => n.key) ?? []
    }
    expect(keys({ reviews: 3, recommend: 0.9 })).toContain('recommended')
    expect(keys({ reviews: 3, recommend: 0.6 })).not.toContain('recommended')
    expect(keys({ reviews: 2, recommend: 1 })).not.toContain('recommended')
  })

  it('rating markup needs 3 overall scores', () => {
    expect(aggregateRatingLd(rated('CCCC10001', { reviews: 5, overall: 4.2, overallCount: 3 }))).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.2,
      ratingCount: 3,
      bestRating: 5,
      worstRating: 1,
    })
    expect(aggregateRatingLd(rated('CCCC10002', { reviews: 5, overall: 4.2, overallCount: 2 }))).toBeUndefined()
    // Other averages alone (difficulty etc.) never become rating markup.
    expect(aggregateRatingLd(rated('CCCC10003', { reviews: 9, difficulty: 2, usefulness: 5 }))).toBeUndefined()
  })
})

function rateScore(s: ReturnType<typeof subject>): number {
  const r = rankSubject(s, 'easy')
  if (!r || r.reviews === null) throw new Error('not ranked from reviews')
  return r.reviews
}
