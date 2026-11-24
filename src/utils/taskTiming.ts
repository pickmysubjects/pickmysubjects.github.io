import type { Timing } from '@/engine/timing'
import type { SemesterShape } from './semester'

type T = (key: string, params?: Record<string, string | number>) => string

/** A date range in short numeric form for the locale ("3/23–3/29", "23/3–29/3"). */
export function numericRange(locale: string, start: string, end: string): string {
  const f = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', timeZone: 'UTC' })
  const a = new Date(`${start}T00:00:00Z`)
  return start === end ? f.format(a) : f.formatRange(a, new Date(`${end}T00:00:00Z`))
}

/**
 * How a task's timing reads ("Week 6", "Weeks 4–12", "Exam period 6/7–6/25"). With no timing the
 * Handbook gave nothing we could read for sure (or nothing at all), so it points to Canvas rather
 * than guess. `examRange`: the
 * official exam dates, when known.
 */
export function timingLabel(t: T, timing: Timing | undefined, examRange?: string): string {
  if (!timing) return t('timing.untimed')
  switch (timing.kind) {
    case 'week':
      return timing.to ? t('timing.weekRange', { from: timing.from, to: timing.to }) : t('timing.week', { n: timing.from })
    case 'weeks':
      return t('timing.weeks', { list: timing.weeks.join(t('listSep')) })
    case 'afterTeaching':
      return timing.weeks === 1 ? t('timing.afterTeachingOne') : t('timing.afterTeaching', { n: timing.weeks })
    case 'exam':
      return examRange ? t('timing.examDates', { range: examRange }) : t('timing.exam')
    case 'assessmentPeriod':
      return examRange ? t('timing.assessmentPeriodDates', { range: examRange }) : t('timing.assessmentPeriod')
    case 'other':
      // The Handbook's own words, quoted (in English: it's the Handbook's text).
      return t('timing.handbookSays', { text: timing.text })
    default:
      return t(`timing.${timing.kind}`)
  }
}

/** Sort key in teaching weeks: dated tasks by week, then ongoing ones, then the exam period; untimed last. */
export function timingOrder(timing: Timing | undefined): number {
  if (!timing) return 99
  switch (timing.kind) {
    case 'week':
      return timing.from + (timing.to ? (timing.to - timing.from) / 100 : 0)
    case 'weeks':
      return timing.weeks[0]!
    case 'early':
      return 2.5
    case 'mid':
      return 6.5
    case 'late':
      return 9.5
    case 'end':
      return 12.5
    case 'teaching':
      return 13
    case 'exam':
    case 'assessmentPeriod':
      return 20
    case 'afterTeaching':
      return 20 + timing.weeks
    case 'other':
      return 98
  }
}

/**
 * The strip segments (by index) a task falls due in: single or listed teaching weeks, the last
 * teaching week for "end of semester", the exam period for exams. Week ranges, "mid semester"
 * and the like name no one week, so they get no marker (they're listed as ongoing instead).
 */
export function dueSegments(timing: Timing | undefined, sem: SemesterShape): number[] {
  if (!timing) return []
  const teach = (n: number) => sem.segments.findIndex((s) => s.kind === 'teach' && s.week === n)
  let out: number[] = []
  if (timing.kind === 'week' && !timing.to) out = [teach(timing.from)]
  else if (timing.kind === 'weeks') out = timing.weeks.map(teach)
  else if (timing.kind === 'end') out = [teach(sem.weeks)]
  else if (timing.kind === 'exam' || timing.kind === 'assessmentPeriod') out = [sem.segments.findIndex((s) => s.kind === 'exams')]
  return out.filter((i) => i >= 0)
}

/** Segments a ranged task ("Weeks 4–12") runs through. */
export function spanSegments(timing: Timing | undefined, sem: SemesterShape): number[] {
  if (timing?.kind !== 'week' || !timing.to) return []
  const { from, to } = timing
  return sem.segments.flatMap((s, i) => (s.kind === 'teach' && s.week >= from && s.week <= to ? [i] : []))
}
