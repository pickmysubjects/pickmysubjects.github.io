import { computed, onMounted, shallowRef } from 'vue'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import type { Period } from '@/engine'
import { KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'
import { semesterNow, type SemesterNow } from '@/utils/semester'
import { subjectsIn } from '@/utils/whatsNext'

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
  })

  const now = computed<SemesterNow | null>(() => (today.value ? semesterNow(KEY_DATES, today.value) : null))

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

  return { today, now, subjects, day, range, when, termName, status }
}
