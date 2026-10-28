import { computed, shallowRef } from 'vue'

/**
 * The one site search (GlobalSearch in the header) registers its open() here, so another place on
 * a page (the home page) can open the same dialog instead of growing a second search.
 */
const opener = shallowRef<(() => void) | null>(null)

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
/** The keyboard shortcut as shown on screen. */
export const searchShortcut = mac ? '⌘K' : 'Ctrl K'

/** Called by the site search itself; returns the function that unregisters it. */
export function registerSiteSearch(open: () => void): () => void {
  opener.value = open
  return () => {
    if (opener.value === open) opener.value = null
  }
}

export function useSiteSearch() {
  return {
    ready: computed(() => opener.value !== null),
    open: () => opener.value?.(),
  }
}
