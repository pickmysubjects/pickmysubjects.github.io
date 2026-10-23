import { computed } from 'vue'
import { usePersisted } from './usePersisted'
import { cleanShortlist, SHORTLIST_MAX } from '@/utils/sanitize'

// Subjects the student saved to look at again, in the order they were saved. No account: this
// browser only, and part of the backup file like the rest of the profile.
const saved = usePersisted<string[]>('sc:shortlist', [], cleanShortlist)

/** Most subjects compared side by side. */
export const COMPARE_MAX = 3

/** Codes from a ?compare=A,B,C address: well-formed, each once, at most COMPARE_MAX. */
export function compareFromQuery(value: string | null): string[] {
  return cleanShortlist((value ?? '').split(',')).slice(0, COMPARE_MAX)
}

export function useShortlist() {
  const codes = computed(() => saved.value)
  const has = (code: string) => saved.value.includes(code)
  function add(code: string): void {
    if (has(code) || saved.value.length >= SHORTLIST_MAX) return
    saved.value = [...saved.value, code]
  }
  function remove(code: string): void {
    saved.value = saved.value.filter((c) => c !== code)
  }
  return { codes, has, add, remove, toggle: (code: string) => (has(code) ? remove(code) : add(code)) }
}
