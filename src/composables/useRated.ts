import { computed } from 'vue'
import { usePersisted } from './usePersisted'
import { cleanRated } from '@/utils/sanitize'

// Subjects this browser has already rated, to discourage accidental duplicates.
const rated = usePersisted<string[]>('sc:rated', [], cleanRated)

export function useRated() {
  return {
    rated: computed(() => new Set(rated.value)),
    markRated: (code: string) => {
      if (!rated.value.includes(code)) rated.value = [...rated.value, code]
    },
  }
}
