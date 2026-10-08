import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

export const VIEWS = ['home', 'subject', 'plan', 'recommend', 'record', 'contribute', 'feedback', 'privacy', 'about'] as const
export type View = (typeof VIEWS)[number]

interface Route {
  view: View
  /** Path parameter, e.g. the code in /subject/COMP30027. */
  param: string
  query: URLSearchParams
}

/** Where the site lives, e.g. "/subject-compass/" on GitHub Pages. */
const BASE = import.meta.env.BASE_URL

/** The address of a page inside the site, e.g. link('subject/COMP30027'). */
export function link(path = ''): string {
  return BASE + path.replace(/^\/+/, '')
}

/** Splits "subject/COMP30027" (and a query string) into a route. Exported for tests. */
export function parsePath(path: string, search = ''): Route {
  const [head = '', param = ''] = path.replace(/^\/+|\/+$/g, '').split('/')
  const view = (VIEWS as readonly string[]).includes(head) ? (head as View) : 'home'
  return { view, param: safeDecode(param), query: new URLSearchParams(search) }
}

function current(): Route {
  const path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : ''
  return parsePath(path, location.search)
}

/** A cut-off link like /subject/COMP%3 must not take the whole page down. */
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

// Links shared before the move away from #/ addresses still work.
function upgradeHashLink(): void {
  if (!location.hash.startsWith('#/')) return
  history.replaceState(null, '', link(location.hash.slice(2)))
}

const listeners = new Set<() => void>()

/** Go to a page inside the site without reloading it. */
export function go(path: string): void {
  history.pushState(null, '', link(path))
  for (const l of listeners) l()
}

// Clicks on ordinary links inside the site are handled here, so every page is a
// real address (for sharing and search engines) but moving between them is instant.
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const a = (event.target as Element | null)?.closest('a')
  if (!a || a.target || a.hasAttribute('download')) return
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return
  // Same page, only a #fragment: let the browser scroll.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return
  event.preventDefault()
  go(url.pathname.slice(BASE.length) + url.search)
}

/**
 * The current view, its parameter and query, kept in the address
 * (e.g. /subject/COMP30027 or /feedback?topic=data) so pages can be linked to.
 */
export function useView() {
  upgradeHashLink()
  const route = shallowRef(current())
  const sync = () => {
    route.value = current()
    window.scrollTo({ top: 0 })
  }
  onMounted(() => {
    listeners.add(sync)
    window.addEventListener('popstate', sync)
    document.addEventListener('click', onClick)
  })
  onBeforeUnmount(() => {
    listeners.delete(sync)
    window.removeEventListener('popstate', sync)
    document.removeEventListener('click', onClick)
  })
  return {
    view: computed(() => route.value.view),
    param: computed(() => route.value.param),
    query: computed(() => route.value.query),
  }
}
