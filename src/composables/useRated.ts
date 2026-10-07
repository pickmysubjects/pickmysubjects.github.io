import { computed } from 'vue'
import { usePersisted } from './usePersisted'

// Subjects this browser has already rated, to discourage accidental duplicates.
const rated = usePersisted<string[]>('sc:rated', [])

export function useRated() {
  return {
    rated: computed(() => new Set(rated.value)),
    markRated: (code: string) => {
      if (!rated.value.includes(code)) rated.value = [...rated.value, code]
    },
  }
}
