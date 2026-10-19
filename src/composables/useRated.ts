import { computed } from 'vue'
import { usePersisted } from './usePersisted'
import { cleanRated } from '@/utils/sanitize'

// Subjects this browser has already rated, to discourage accidental duplicates.
const rated = usePersisted<string[]>('sc:rated', [], cleanRated)
// Subjects the "rate it?" prompt was already shown for after marking them done: asked once only.
const prompted = usePersisted<string[]>('sc:ratePrompted', [], cleanRated)

export function useRated() {
  return {
    rated: computed(() => new Set(rated.value)),
    markRated: (code: string) => {
      if (!rated.value.includes(code)) rated.value = [...rated.value, code]
    },
    /** Whether to offer rating a subject just marked done: not rated, and not offered before. */
    shouldPrompt: (code: string) => !rated.value.includes(code) && !prompted.value.includes(code),
    markPrompted: (code: string) => {
      if (!prompted.value.includes(code)) prompted.value = [...prompted.value, code]
    },
  }
}
