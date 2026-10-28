import { computed, shallowRef } from 'vue'
import { exactWam, type Profile } from '@/engine'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { neededAverage, pointsLeft } from '@/utils/wamGoal'

/** A subject typed into the WAM calculator: kept in this page only, never in the record unless saved. */
export interface WamRow {
  code: string
  mark: number | ''
}

/**
 * The WAM calculator's state. The record (marks, target WAM) lives in My record only: the
 * calculator reads it, adds the student's what-if subjects on top in memory, and writes back
 * only the target WAM, or the typed marks when the student saves them (an empty record).
 */
export function useWamCalc() {
  const { data } = useDataset()
  const { profile, setResults, setTargetWam } = useProfile()
  const { course } = usePlan()

  const rows = shallowRef<WamRow[]>([])
  const counts = (code: string) => !data.value.subjects[code]?.passFail
  /** Marked subjects on the record that count in the WAM. */
  const recordCount = computed(() => profile.value.results.filter((r) => r.mark !== undefined && counts(r.code)).length)
  const fromRecord = computed(() => recordCount.value > 0)
  const recordWam = computed(() => {
    const w = exactWam(profile.value.results, data.value)
    return w === null ? null : Math.round(w * 10) / 10
  })

  const extra = computed<Profile['results']>(() => rows.value.filter((r) => r.mark !== '').map((r) => ({ code: r.code, mark: r.mark as number })))
  const results = computed(() => [...profile.value.results, ...extra.value])
  const exact = computed(() => exactWam(results.value, data.value))
  /** The WAM with the typed subjects, to one decimal. */
  const wam = computed(() => (exact.value === null ? null : Math.round(exact.value * 10) / 10))
  const donePoints = computed(() => results.value.filter((r) => r.mark !== undefined && counts(r.code)).reduce((s, r) => s + (data.value.subjects[r.code]?.points ?? 12.5), 0))
  const left = computed(() => pointsLeft(results.value, data.value, course.value?.totalPoints ?? 300, profile.value.credit))

  const target = computed(() => profile.value.targetWam ?? null)
  /** Average needed on the points still to take to reach the target; null without a target, a WAM or points left. */
  const need = computed(() => (target.value === null || exact.value === null ? null : neededAverage(exact.value, donePoints.value, target.value, left.value)))

  return {
    rows,
    recordCount,
    fromRecord,
    recordWam,
    wam,
    left,
    target,
    need,
    add(code: string) {
      if (data.value.subjects[code]) rows.value = [...rows.value, { code, mark: '' }]
    },
    remove(i: number) {
      rows.value = rows.value.filter((_, j) => j !== i)
    },
    setMark(i: number, mark: number | '') {
      const m = mark === '' || !Number.isFinite(mark) ? '' : Math.max(0, Math.min(100, mark))
      rows.value = rows.value.map((r, j) => (j === i ? { ...r, mark: m } : r))
    },
    setTarget(v: number | '') {
      setTargetWam(v === '' ? undefined : v)
    },
    /** The typed marks go into the record (only offered while the record has none). */
    save() {
      if (!extra.value.length) return
      setResults([...profile.value.results, ...extra.value])
      rows.value = []
    },
  }
}
