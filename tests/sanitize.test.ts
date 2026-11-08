import { describe, expect, it } from 'vitest'
import { cleanGoal, cleanPlans, cleanProfile, cleanRated } from '../src/utils/sanitize'

describe('saved data is put back in shape', () => {
  it('repairs a hand-edited plan instead of letting it break the board', () => {
    const plans = cleanPlans({ p: { setup: { course: 'B-SCI', startPeriod: 'spring', major: 5 }, terms: [{ year: 2027, period: 'semester-1', subjects: ['A', 'A', 'B'] }], notes: [null, { key: 'k', text: 't', params: {} }], unplaced: [3] } })
    const plan = plans.p!.plans[0]!
    expect(plan.setup).toMatchObject({ startYear: 2027, startPeriod: 'semester-1', courseYear: 2027, major: '', specialisation: '' })
    expect(plan.terms[0]!.subjects).toEqual(['A', 'B'])
    expect(plan.notes).toHaveLength(1)
    expect(plan.unplaced).toEqual([])
  })

  it('keeps the mark on a begun semester the student changed, so a rebuild leaves it alone', () => {
    const plans = cleanPlans({ p: { setup: { course: 'B-SCI' }, terms: [{ year: 2026, period: 'semester-2', subjects: ['A'], edited: true }, { year: 2027, period: 'semester-1', subjects: ['B'], edited: 'yes' }] } })
    expect(plans.p!.plans[0]!.terms[0]).toMatchObject({ edited: true })
    expect(plans.p!.plans[0]!.terms[1]).not.toHaveProperty('edited')
  })

  it('fills a half-saved profile and drops what can’t be read', () => {
    expect(cleanProfile({ results: [{ code: 'MAST10006', mark: 80 }, { mark: 5 }, 'x'] })).toEqual({
      results: [{ code: 'MAST10006', mark: 80 }],
      skills: {},
      interests: [],
      goal: 'balanced',
      confirmed: [],
    })
    expect(cleanProfile({ skills: { maths: 9, programming: 4, juggling: 5 }, goal: 'nap' })).toMatchObject({ skills: { programming: 4 }, goal: 'balanced' })
  })
  it('keeps only interests that are known topics', () => {
    // A stale id would match no subject but still count as "has interests" (the off-topic penalty).
    expect(cleanProfile({ interests: ['ai', 'retired-topic', 3, 'ai', 'statistics'] }).interests).toEqual(['ai', 'statistics'])
  })
  it('drops a plan with no terms and keeps a readable one', () => {
    const plans = cleanPlans({ broken: { setup: { course: 'B-SCI' } }, ok: { setup: { course: 'B-SCI' }, terms: [{ year: 2027, period: 'semester-1', subjects: ['A', 3] }] } })
    expect(Object.keys(plans)).toEqual(['ok'])
    expect(plans.ok!.plans[0]!.terms).toEqual([{ year: 2027, period: 'semester-1', subjects: ['A'] }])
  })
  it('turns anything but a list of codes into an empty list', () => {
    expect(cleanRated(5)).toEqual([])
    expect(cleanRated(['A', 1])).toEqual(['A'])
  })
  it('turns the old "marks only" goal into "protect my WAM", on the profile and on each plan', () => {
    expect(cleanGoal('easy')).toBe('wam')
    expect(cleanGoal('challenge')).toBe('challenge')
    expect(cleanGoal(undefined)).toBe('balanced')
    expect(cleanProfile({ goal: 'easy' }).goal).toBe('wam')
    const plans = cleanPlans({
      'B-SCI': { plans: [{ id: 'a', label: 'A', setup: { course: 'B-SCI' }, terms: [], prefs: { skills: {}, interests: [], goal: 'easy' } }], active: 'a' },
    })
    expect(plans['B-SCI']!.plans[0]!.prefs!.goal).toBe('wam')
  })
})
