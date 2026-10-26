import { afterEach, describe, expect, it } from 'vitest'
import { realData } from './realData'
import { periodsFor } from '../src/engine/availability'
import { factsYear, knownNotRunning, latestDataYear, publishedYear, setToday, shareUpdated, thisYear } from '../src/engine/dataYear'
import { forCourse } from '../src/engine/forCourse'
import { generatePlan } from '../src/engine/generate'
import { assumedOfferings, checkTerms } from '../src/engine/planCheck'
import type { Profile } from '../src/engine/recommend'
import type { Dataset, Subject } from '../src/engine/schema'
import { subjectDifficulty } from '../src/engine/subjectFit'
import { interpolate, type Params, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { handbookUrl } from '../src/utils/links'
import { runsLine, subjectPageDescription, subjectPageTitle } from '../src/utils/seo'
import { subject } from './helpers'

/*
 * The year rollover: the 2027 Handbook comes out in November and is entered subject by subject.
 * The clock is injected (setToday), never the real date.
 */
const data = realData()
const sci = forCourse(data, 'B-SCI').subjects
const t: Translate = (key: string, params?: Params) => {
  let node: unknown = en
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part]
  return interpolate(typeof node === 'string' ? node : key, params)
}
const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
// Two representative plans; tests/stress/dataYear.test.ts runs the same checks on more.
const PLANS: [string, string | undefined][] = [
  ['B-SCI', undefined],
  ['B-SCIEXTD', 'chemistry'],
]
const plansFrom = (d: Dataset, startYear: number) =>
  PLANS.map(([course, major]) => generatePlan({ data: d, profile, course, courseYear: 2026, major, startYear, startPeriod: 'semester-1' }).plan)

/** The subject pages' "runs" line as it was before the rule: always the fixed year 2026. */
function runsLineBefore(s: Subject): string {
  if (s.offerings === 'unknown') return t('seo.notRecorded')
  const periods = periodsFor(s, 2026)
  return periods.length ? t('seo.runs', { year: 2026, periods: periods.map((p) => t(`period.${p}`)).join(', ') }) : t('seo.notRunning', { year: 2026 })
}

afterEach(() => setToday(undefined))

describe('today (October 2026), data from the 2026 Handbook only', () => {
  it('the newest data year is 2026 and nothing is behind', () => {
    setToday('2026-10-26')
    expect(latestDataYear(data.subjects)).toBe(2026)
    expect(publishedYear(data.subjects)).toBe(2026)
    expect(shareUpdated(data.subjects, 2026)).toBeGreaterThan(0.99)
  })

  it('subject page titles and descriptions are unchanged for every subject with 2026 data', () => {
    setToday('2026-10-26')
    const year = latestDataYear(data.subjects)
    const changed: string[] = []
    for (const s of Object.values(data.subjects)) {
      const now = runsLine(t, s, year, ', ')
      const has2026 = s.offerings === 'unknown' || s.offerings['2026'] !== undefined
      if (has2026) {
        expect(now, s.code).toBe(runsLineBefore(s))
        expect(subjectPageTitle(t, s, 'en')).toBeTruthy()
      } else if (now !== runsLineBefore(s)) changed.push(s.code)
    }
    // Only a subject whose newest facts are older than 2026 reads differently: it now names the
    // year its timetable is from instead of presenting it as 2026's.
    for (const code of changed) expect(runsLine(t, data.subjects[code]!, year, ', ')).not.toContain('2026')
    const sample = Object.values(sci).slice(0, 40)
    for (const s of sample) {
      const level = subjectDifficulty(sci, s.code, 'B-SCI', year).level
      expect(subjectPageDescription(t, s, 'en', { level, year })).toBe(subjectPageDescription(t, s, 'en', { level, year: 2026 }))
    }
  })

  it('a plan in 2027 gets no markers yet: the 2027 Handbook is not out', () => {
    setToday('2026-10-26')
    const pub = publishedYear(data.subjects)
    for (const s of Object.values(data.subjects).slice(0, 200)) if (s.offerings !== 'unknown' && s.offerings['2026']) expect(factsYear(s, 2027, pub).older).toBe(false)
  })

  it('planner checks on real plans do not depend on the clock', () => {
    setToday('2026-10-26')
    const before = plansFrom(data, 2027).map((p) => checkTerms(p, data))
    setToday('2027-01-05')
    const after = plansFrom(data, 2027).map((p) => checkTerms(p, data))
    expect(after).toEqual(before)
  })
})

describe('January 2027, data still from the 2026 Handbook only', () => {
  it('2027 counts as published, and the site-wide notice condition holds', () => {
    setToday('2027-01-05')
    expect(thisYear()).toBe(2027)
    expect(publishedYear(data.subjects)).toBe(2027)
    expect(shareUpdated(data.subjects, 2027)).toBeLessThan(0.5)
  })

  it('subjects use their 2026 facts, marked, and link to the 2026 Handbook', () => {
    setToday('2027-01-05')
    const pub = publishedYear(data.subjects)
    const s = Object.values(data.subjects).find((x) => x.offerings !== 'unknown' && (x.offerings['2026']?.length ?? 0) > 0)!
    expect(factsYear(s, 2027, pub)).toEqual({ year: 2026, older: true })
    expect(handbookUrl(s.code, factsYear(s, 2027, pub).year)).toContain('/2026/')
    expect(runsLine(t, s, 2027, ', ')).toContain('2026')
  })

  it('no "not offered in 2027" errors on real plans starting in 2027', () => {
    setToday('2027-01-05')
    for (const p of plansFrom(data, 2027)) {
      const issues = checkTerms(p, data)
      expect(issues.filter((i) => i.kind === 'not-offered')).toEqual([])
      // Each 2027 subject is planned on its 2026 timetable, said once for the plan, not per subject.
      expect(issues.some((i) => i.kind === 'offering-assumed')).toBe(false)
      expect(assumedOfferings(p, data)).toEqual({ year: 2027, from: 2026 })
    }
  })

  it('a subject not running in 2026 is not called "not running in 2027"', () => {
    const paused = subject({ code: 'TEST10001', offerings: { 2026: [] } })
    expect(knownNotRunning(paused, 2026)).toBe(true)
    expect(knownNotRunning(paused, 2027)).toBe(false)
  })
})

describe('one subject already has 2027 data', () => {
  const updatedCode = Object.values(data.subjects).find((s) => s.offerings !== 'unknown' && (s.offerings['2026']?.length ?? 0) > 0)!.code
  const before = data.subjects[updatedCode]!
  const mixed: Dataset = {
    ...data,
    subjects: { ...data.subjects, [updatedCode]: { ...before, offerings: { ...(before.offerings as Record<string, never>), 2027: ['semester-2'] } } },
  }
  const other = Object.values(mixed.subjects).find((s) => s.code !== updatedCode && s.offerings !== 'unknown' && (s.offerings['2026']?.length ?? 0) > 0)!

  it('that subject shows 2027 facts and links; the rest stay 2026, marked', () => {
    setToday('2026-12-01')
    expect(latestDataYear(mixed.subjects)).toBe(2027)
    const pub = publishedYear(mixed.subjects)
    expect(pub).toBe(2027)
    const s = mixed.subjects[updatedCode]!
    expect(factsYear(s, 2027, pub)).toEqual({ year: 2027, older: false })
    expect(runsLine(t, s, 2027, ', ')).toBe(t('seo.runs', { year: 2027, periods: t('period.semester-2') }))
    expect(handbookUrl(s.code, factsYear(s, 2027, pub).year)).toContain('/2027/')
    expect(factsYear(other, 2027, pub)).toEqual({ year: 2026, older: true })
    expect(runsLine(t, other, 2027, ', ')).toContain('2026')
    expect(handbookUrl(other.code, factsYear(other, 2027, pub).year)).toContain('/2026/')
    // Most subjects still behind: the notice stays up.
    expect(shareUpdated(mixed.subjects, pub)).toBeLessThan(0.5)
  })

  it('looking at 2026 still shows 2026 facts for the updated subject', () => {
    setToday('2026-12-01')
    expect(factsYear(mixed.subjects[updatedCode]!, 2026, 2027)).toEqual({ year: 2026, older: false })
  })
})

describe('the plan’s one line about assumed teaching periods', () => {
  const own = subject({ code: 'TEST10002', offerings: { 2026: ['semester-1', 'semester-2'] } })
  const d: Dataset = { ...data, subjects: { ...data.subjects, TEST10002: own } }
  it('says nothing while every planned subject has its own year’s data', () => {
    expect(assumedOfferings({ terms: [{ year: 2026, period: 'semester-2', subjects: ['TEST10002'] }] }, d)).toBeNull()
  })
  it('names the first planned year on an earlier timetable, and which year', () => {
    const terms = [
      { year: 2026, period: 'semester-2' as const, subjects: ['TEST10002'] },
      { year: 2028, period: 'semester-1' as const, subjects: ['TEST10002'] },
      { year: 2027, period: 'semester-2' as const, subjects: ['TEST10002'] },
    ]
    expect(assumedOfferings({ terms }, d)).toEqual({ year: 2027, from: 2026 })
    // Not one note per subject any more.
    expect(checkTerms({ course: 'B-SCI', courseYear: 2026, completed: [], terms }, d).some((i) => i.kind === 'offering-assumed')).toBe(false)
  })
})
