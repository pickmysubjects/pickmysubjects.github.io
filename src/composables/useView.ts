import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { localeInPath } from '@/i18n/codes'
import { currentLocale, useI18n } from '@/i18n'

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

/** "zh-CN/" for a non-English language, "" for English (English pages have no prefix). */
function prefix(code: string = currentLocale()): string {
  return code === 'en' ? '' : `${code}/`
}

/** The address of a page inside the site, in the current language, e.g. link('subject/COMP30027'). */
export function link(path = ''): string {
  return BASE + prefix() + path.replace(/^\/+/, '')
}

/** The path after the base, without any language part. */
function pagePath(): string {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : ''
  return localeInPath(rest) ? rest.split('/').slice(1).join('/') : rest
}

/** Splits "subject/COMP30027" (and a query string) into a route. Exported for tests. */
export function parsePath(path: string, search = ''): Route {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  if (localeInPath(path)) parts.shift()
  const [head = '', param = ''] = parts
  const view = (VIEWS as readonly string[]).includes(head) ? (head as View) : 'home'
  return { view, param: safeDecode(param), query: new URLSearchParams(search) }
}

function current(): Route {
  return parsePath(pagePath(), location.search)
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

function visit(address: string): void {
  history.pushState(null, '', address)
  for (const l of listeners) l()
}

/** Go to a page inside the site (in the current language) without reloading it. */
export function go(path: string): void {
  visit(link(path))
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
  visit(url.pathname + url.search)
}

/**
 * The current view, its parameter and query, kept in the address
 * (e.g. /subject/COMP30027 or /feedback?topic=data) so pages can be linked to.
 */
export function useView() {
  upgradeHashLink()
  const { locale } = useI18n()
  // Keep the address in the shown language, so a copied link opens the same way.
  const syncAddress = () => {
    const want = BASE + prefix(locale.value) + pagePath()
    if (location.pathname !== want) history.replaceState(null, '', want + location.search + location.hash)
  }
  syncAddress()
  watch(locale, syncAddress)
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
