import { ref, watch, type Ref } from 'vue'

/**
 * A ref mirrored to localStorage. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and the app works without it.
 */
export function usePersisted<T>(key: string, initial: T, clean: (raw: unknown) => T = (raw) => raw as T): Ref<T> {
  // Whatever was saved is put back in shape first: an old or broken copy mustn't break a page.
  const load = (): T | null => {
    const raw = read<unknown>(key)
    if (raw === null) return null
    try {
      return clean(raw)
    } catch {
      return null
    }
  }
  const state = ref(load() ?? initial) as Ref<T>
  watch(state, (value) => write(key, value), { deep: true })
  // Another tab saved a newer copy: take it, so this tab doesn't later write back a stale one.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key || e.newValue === null) return
      const next = load()
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
