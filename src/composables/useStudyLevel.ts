import { computed, watchEffect } from 'vue'
import type { Subject } from '@/engine'
import { usePersisted } from './usePersisted'

/**
 * Bachelor's or master's: which side of the site a student is on. Kept apart so an undergraduate
 * never sees master's subjects mixed into their lists and search (and the other way round). Saved
 * on this device; bachelor's by default. Master's pages use the purple accent (data-level on <html>).
 */
export type StudyLevel = 'bachelor' | 'master'

const level = usePersisted<StudyLevel>('sc:level', 'bachelor', (raw) => (raw === 'master' ? 'master' : 'bachelor'))

if (typeof document !== 'undefined') {
  watchEffect(() => {
    if (level.value === 'master') document.documentElement.dataset.level = 'master'
    else delete document.documentElement.dataset.level
  })
}

/**
 * Whether a subject belongs on this side. Bachelor's: undergraduate subjects, plus a graduate one
 * only when the student's degree counts it (as "sort for me" already decides). Master's: graduate
 * subjects.
 */
export function onSide(s: Subject, side: StudyLevel, course?: string): boolean {
  const graduate = s.level > 3
  if (side === 'master') return graduate
  return !graduate || (!!course && !!s.categories[course])
}

export function useStudyLevel() {
  return { level, isMaster: computed(() => level.value === 'master') }
}
