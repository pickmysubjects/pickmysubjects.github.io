import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { useDataset } from './useDataset'
import { isFail } from '@/engine'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { KEY_DATES, melbourneToday } from '@/utils/keyDates'

/**
 * "Copy subject codes to enrol": the list to enrol from in my.unimelb, each term still to take
 * with its subjects by code and official (English) title, the way the enrolment page names them.
 * Subjects already passed, and terms whose teaching has started (enrolled already), are left out.
 * Shared by the plan's Save menu and the plan hero's next step during re-enrolment.
 */
export function useEnrolCopy() {
  const { t } = useI18n()
  const plan = usePlan()
  const { profile } = useProfile()
  const { data } = useDataset()

  const enrolText = computed(() => {
    const today = melbourneToday()
    const started = (term: { year: number; period: string }) => KEY_DATES.some((d) => d.kind === 'teaching' && d.year === term.year && d.term === term.period && d.start <= today)
    const passed = new Set(profile.value.results.filter((r) => !isFail(r)).map((r) => r.code))
    return plan.terms.value
      .map((term) => ({ term, codes: term.subjects.filter((c) => !passed.has(c)) }))
      .filter((x) => x.codes.length && !started(x.term))
      .map(({ term, codes }) => [termFullLabel(t.value, term), ...codes.map((c) => `${c}  ${data.value.subjects[c]?.title ?? ''}`.trim())].join('\n'))
      .join('\n\n')
  })

  const copied = shallowRef<'idle' | 'ok' | 'failed'>('idle')
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  async function copyEnrol(): Promise<void> {
    clearTimeout(copyTimer)
    try {
      await navigator.clipboard.writeText(enrolText.value)
      copied.value = 'ok'
    } catch {
      // No clipboard (an old browser, a blocked permission): say so instead of nothing happening.
      copied.value = 'failed'
    }
    copyTimer = setTimeout(() => (copied.value = 'idle'), 2500)
  }
  onBeforeUnmount(() => clearTimeout(copyTimer))

  return { enrolText, copied, copyEnrol }
}
