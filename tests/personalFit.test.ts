import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { recommend, type Profile, type RecommendOptions } from '../src/engine/recommend'
import { cardFit } from '../src/composables/useSubjectFit'
import { hasFitProfile } from '../src/engine/subjectFit'

// The personal side of suggestions and the fit card: self-rated skills and past marks move a
// subject the right way, by a sensible amount, and every screen reads the same number.
const real = realData()
const opts: RecommendOptions = { course: 'B-SCI', maxLevel: 2 }
const blank: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const CODE = 'COMP20003'
const scoreOf = (p: Partial<Profile>, code = CODE, o = opts) => recommend(real, { ...blank, ...p }, o).find((r) => r.code === code)?.score

describe('self-rated skills', () => {
  it('a strong programmer sees a programming subject higher, a weak one lower, than no rating', () => {
    const none = scoreOf({})!
    const strong = scoreOf({ skills: { programming: 5 } })!
    const weak = scoreOf({ skills: { programming: 1 } })!
    expect(strong).toBeGreaterThan(none)
    expect(weak).toBeLessThan(none)
    // Rating a skill it doesn't use moves it far less than the one it does.
    const other = scoreOf({ skills: { writing: 5 } })!
    expect(Math.abs(other - none)).toBeLessThan(strong - none)
  })
})

describe('past marks', () => {
  const marks = (m: number) => [{ code: 'COMP10001', mark: m }, { code: 'COMP10002', mark: m - 2 }]
  it('high marks in the subjects it builds on put it above low marks there', () => {
    expect(scoreOf({ results: marks(90) })!).toBeGreaterThan(scoreOf({ results: marks(55) })!)
  })
  it('never suggests a subject already passed or planned; a failed one only as a retake', () => {
    expect(scoreOf({ results: [{ code: CODE, mark: 70 }] })).toBeUndefined()
    expect(scoreOf({}, CODE, { ...opts, planned: [CODE] })).toBeUndefined()
    const retake = recommend(real, { ...blank, results: [{ code: CODE, mark: 40 }] }, opts).find((r) => r.code === CODE)
    expect(retake?.warnings.map((w) => w.key)).toContain('retake')
  })
})

describe('no profile', () => {
  it('is neutral: no fit card, and a mid score rather than a penalty', () => {
    expect(hasFitProfile(blank)).toBe(false)
    expect(scoreOf({})).toBe(50)
  })
})

describe('one number everywhere', () => {
  it('the fit card reads the same score and rank as the suggestions list', () => {
    for (const p of [{ skills: { programming: 5 } }, { results: [{ code: 'COMP10001', mark: 55 }] }]) {
      const profile = { ...blank, ...p }
      const rec = recommend(real, profile, opts).find((r) => r.code === CODE)!
      const card = cardFit(real, profile, opts, CODE, 2026).fit
      expect(card.kind).toBe('fit')
      if (card.kind === 'fit') expect([card.rec.score, card.rec.betterThan]).toEqual([rec.score, rec.betterThan])
    }
  })
})
