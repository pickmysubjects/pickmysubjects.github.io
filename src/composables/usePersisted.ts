import { ref, watch, type Ref } from 'vue'

/**
 * A ref mirrored to localStorage. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the app works without it.
 */
export function usePersisted<T>(key: string, initial: T): Ref<T> {
  const state = ref(read(key) ?? initial) as Ref<T>
  watch(state, (value) => write(key, value), { deep: true })
  // Another tab saved a newer copy: take it, so this tab doesn't later write back a stale one.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key || e.newValue === null) return
      const next = read<T>(key)
      if (next !== null) state.value = next
    })
  }
  return state
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}
