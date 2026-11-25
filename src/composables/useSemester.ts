import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import type { Period } from '@/engine'
import { KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'
import { semesterNow, type SemesterNow } from '@/utils/semester'
import { currentTerms, subjectsIn } from '@/utils/whatsNext'

/**
 * Today's place in the semester, shared by the home preview and /this-semester/. Only worked out
 * in the browser after mounting (the prerendered page would freeze the build day); in dev,
 * ?today=YYYY-MM-DD looks at any day.
 */
export function useSemester() {
  const { t, locale } = useI18n()
  const { data } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()

  const today = shallowRef('')
  onMounted(() => {
    const fake = import.meta.env.DEV ? new URLSearchParams(location.search).get('today') : null
    today.value = fake && /^\d{4}-\d{2}-\d{2}$/.test(fake) ? fake : melbourneToday()
    if (fake) return
    // An installed app is resumed days later, and a tab can stay open past midnight.
    const refresh = () => {
      const d = melbourneToday()
      if (d !== today.value) today.value = d
    }
    const onShow = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onShow)
    const timer = setInterval(refresh, 60_000)
    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', onShow)
      clearInterval(timer)
    })
  })

  const now = computed<SemesterNow | null>(() => (today.value ? semesterNow(KEY_DATES, today.value) : null))

  /**
   * A Summer or Winter Term under way (classes or its exams) with the student's subjects in it.
   * The page is built around the semesters; this keeps those subjects from going missing.
   */
  const shortTerm = computed(() => {
    if (!today.value) return null
    for (const t of currentTerms(KEY_DATES, today.value)) {
      if (t.term !== 'summer' && t.term !== 'winter') continue
      const codes = subjectsIn(t.year, t.term, plan.terms.value, profile.value.results).filter((c) => c in data.value.subjects)
      if (!codes.length) continue
      const of = (kind: KeyDate['kind']) => KEY_DATES.find((d) => d.kind === kind && d.year === t.year && d.term === t.term)
      return { year: t.year, term: t.term, subjects: codes, teaching: of('teaching')!, exams: of('exams') }
    }
    return null
  })

  /** The student's subjects in the semester shown, whatever the phase (the calendar file wants them before it starts too). */
  const termSubjects = computed<string[]>(() => {
    const n = now.value
    if (!n) return []
    return subjectsIn(n.sem.year, n.sem.term, plan.terms.value, profile.value.results).filter((c) => c in data.value.subjects)
  })

  /** The student's subjects in the semester shown (planned there or on the record), known codes only. */
  const subjects = computed<string[]>(() => {
    const n = now.value
    if (!n || n.phase === 'before') return []
    return subjectsIn(n.sem.year, n.sem.term, plan.terms.value, profile.value.results).filter((c) => c in data.value.subjects)
  })

  const fmt = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))
  const day = (d: string) => fmt.value.format(new Date(`${d}T00:00:00Z`))
  const range = (d: Pick<KeyDate, 'start' | 'end'>) => (d.start === d.end ? day(d.start) : fmt.value.formatRange(new Date(`${d.start}T00:00:00Z`), new Date(`${d.end}T00:00:00Z`)))
  const termName = (year: number, term: string) => termFullLabel(t.value, { year, period: term as Period })

  /**
   * A key date's name, with its term when it's a Summer or Winter Term date ("Exams · Summer
   * 2027"): those fall around the semesters and would otherwise read as the semester's own.
   * Semester dates need no label (the next semester's orientation is plainly the next one).
   */
  function dateLabel(d: KeyDate): string {
    const name = t.value(`guide.kd.kind.${d.kind}`)
    const sem = now.value?.sem
    const short = d.term === 'summer' || d.term === 'winter'
    const shown = sem !== undefined && d.year === sem.year && d.term === sem.term
    return short && !shown && d.kind !== 'reenrol' && d.kind !== 'reenrolLate' ? `${name} · ${termName(d.year, d.term)}` : name
  }

  /** Relative for near days ("in 9 days"), absolute for far ones ("on 7 Jun"). */
  function when(days: number, date: string): string {
    if (days === 0) return t.value('next.today')
    if (days === 1) return t.value('next.tomorrow')
    if (days > 1 && days <= 14) return t.value('next.inDays', { n: days })
    return t.value('sem.onDate', { date: day(date) })
  }

  /** "Semester 1 2027 · Week 6 of 12", and the like, for any phase. */
  const status = computed(() => {
    const n = now.value
    if (!n) return ''
    const term = termName(n.sem.year, n.sem.term)
    const sep = ' · '
    switch (n.phase) {
      case 'before': {
        const w = n.days > 14 ? t.value('sem.inWeeks', { n: Math.round(n.days / 7) }) : when(n.days, n.sem.teaching.start)
        return t.value('sem.starts', { term, when: w })
      }
      case 'teach':
        return term + sep + t.value('sem.weekOf', { n: n.week, total: n.sem.weeks })
      case 'break':
        return term + sep + t.value('sem.break')
      case 'swotvac':
        return term + sep + t.value('sem.swotvac')
      case 'exams':
        return term + sep + t.value('sem.exams')
      case 'waiting': {
        const r = n.sem.results
        const days = r ? Math.round((Date.parse(r.start) - Date.parse(today.value)) / 86_400_000) : 0
        return term + sep + t.value('sem.waiting') + (r ? sep + t.value('sem.resultsOn', { when: when(days, r.start) }) : '')
      }
      case 'results':
        return term + sep + t.value('sem.resultsOut')
    }
    return ''
  })

  return { today, now, subjects, termSubjects, shortTerm, day, range, when, termName, status, dateLabel }
}
