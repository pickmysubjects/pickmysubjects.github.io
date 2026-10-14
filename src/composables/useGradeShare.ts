import { computed } from 'vue'
import { RATINGS_FORM } from '@/config'
import { bandOf, computeWam, wamBandOf, type GradeBand } from '@/engine'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { useProfile } from './useProfile'
import { hasQuestion, isFormReady } from '@/utils/googleForm'
import { cleanRated } from '@/utils/sanitize'

/** A band only means something next to the student's level: their WAM without that subject. */
const MIN_OTHER_MARKS = 3
// Subjects whose band this browser already sent (from a rating or the My page card): sent once.
const shared = usePersisted<string[]>('sc:gradesShared', [], cleanRated)

/** Sharing grade bands through the ratings form, with the sharer's WAM range alongside. */
export function useGradeShare() {
  const { profile } = useProfile()
  const { data } = useDataset()
  const ready = computed(() => isFormReady(RATINGS_FORM) && hasQuestion(RATINGS_FORM, 'wamBand'))

  /** "70–74" for the student's WAM without this subject, or null with too few other marks. */
  function wamBandFor(code: string): string | null {
    const others = profile.value.results.filter((r) => r.code !== code && r.mark !== undefined)
    if (others.length < MIN_OTHER_MARKS) return null
    const wam = computeWam(others, data.value)
    return wam === null ? null : wamBandOf(wam)
  }

  /** Subjects on My page with a mark, not yet shared, ready to send. */
  const shareable = computed(() =>
    profile.value.results.flatMap((r) => {
      if (r.mark === undefined || !data.value.subjects[r.code] || data.value.subjects[r.code]?.passFail || shared.value.includes(r.code)) return []
      const wamBand = wamBandFor(r.code)
      return wamBand ? [{ code: r.code, year: r.year, band: bandOf(r.mark) as GradeBand, wamBand }] : []
    }),
  )

  function markShared(codes: string[]): void {
    shared.value = [...new Set([...shared.value, ...codes])]
  }

  return { ready, shared, shareable, wamBandFor, markShared }
}
