import { describe, expect, it } from 'vitest'
import { addTermChoices, defaultAddTerm } from '../src/utils/pastTerms'
import type { Period, Subject } from '../src/engine'

const subject = (offerings: Subject['offerings'], extra: Partial<Subject> = {}) => ({ code: 'TEST10001', offerings, ...extra }) as Subject
const start = { year: 2020, period: 'semester-1' as Period }
const plan = [2020, 2021].flatMap((y) => (['semester-1', 'semester-2'] as Period[]).map((p) => ({ year: y, period: p }))).concat([{ year: 2022, period: 'semester-1' }])
const now = new Date('2026-10-27')
const keys = (xs: { year: number; period: Period }[]) => xs.map((x) => `${x.year} ${x.period}`)

describe('addTermChoices', () => {
  it('offers every semester of a plan that started years ago, whatever the subject runs in', () => {
    for (const offerings of [{ '2026': ['summer'] }, { '2026': ['semester-2'] }, { '2026': [] }, 'unknown'] as Subject['offerings'][]) {
      const got = keys(addTermChoices(subject(offerings), start, plan, now))
      for (const k of keys(plan)) expect(got).toContain(k)
    }
  })

  it('flags the terms the subject is not offered in instead of dropping them', () => {
    const choices = addTermChoices(subject({ '2026': ['semester-2'] }), start, plan, now)
    expect(choices.find((x) => x.year === 2020 && x.period === 'semester-1')?.offered).toBe(false)
    expect(choices.find((x) => x.year === 2020 && x.period === 'semester-2')?.offered).toBe(true)
  })

  it('lists summer and winter only when the subject runs then or the plan already has that term', () => {
    const s1s2 = keys(addTermChoices(subject({ '2026': ['semester-1', 'semester-2'] }), start, plan, now))
    expect(s1s2.some((k) => k.endsWith('summer') || k.endsWith('winter'))).toBe(false)
    expect(keys(addTermChoices(subject({ '2026': ['summer'] }), start, plan, now))).toContain('2021 summer')
  })

  it('still suggests the first offered term ahead by default', () => {
    const choices = addTermChoices(subject({ '2026': ['semester-2'] }), start, plan, now)
    expect(defaultAddTerm(choices, plan[0], now)).toMatchObject({ year: 2027, period: 'semester-2' })
    const never = addTermChoices(subject({ '2026': [] }), start, plan, now)
    expect(defaultAddTerm(never, plan[0], now)).toMatchObject({ year: 2027, period: 'semester-1' })
  })
})
