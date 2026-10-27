import { computed, shallowRef, watch } from 'vue'
import { localeInPath } from '@/i18n/codes'
import { currentLocale, useI18n } from '@/i18n'
import { newVersionReady } from '@/utils/serviceWorker'
import { countPage } from '@/utils/analytics'
import { VIEW_LOADERS } from '@/views/loaders'

export const VIEWS = ['home', 'subject', 'plan', 'recommend', 'record', 'contribute', 'feedback', 'privacy', 'about', 'guide', 'subjects', 'majors', 'shortlist', 'careers', 'changes', 'tools'] as const
export type View = (typeof VIEWS)[number]

interface Route {
  view: View
  /** Path parameter, e.g. the code in /subject/COMP30027. */
  param: string
  query: URLSearchParams
}

/** Where the site lives, e.g. "/" on GitHub Pages. */
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

/**
 * An address without a language part (/, /subject/X) when another language was chosen before:
 * the same page in that language, to load in full before anything is drawn. Otherwise null.
 * Without this the English page's static HTML showed first and the app then painted the saved
 * language's parts over it (an English page with Chinese subject titles) before moving.
 */
export function savedLocaleAddress(): string | null {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : null
  if (rest === null || currentLocale() === 'en' || localeInPath(rest) || /^subject-compass(?:\/|$)/.test(rest)) return null
  return BASE + prefix() + rest + location.search + location.hash
}

/** Splits "subject/COMP30027" (and a query string) into a route. Exported for tests. */
export function parsePath(path: string, search = ''): Route {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  if (localeInPath(path)) parts.shift()
  const [head = '', param = ''] = parts
  const view = (VIEWS as readonly string[]).includes(head) ? (head as View) : 'home'
  return { view, param: safeDecode(param), query: new URLSearchParams(search) }
}

/**
 * Old pages that now live inside another one: where they go (after the site and language part).
 * Suggestions became "sort for me" on Find subjects. Exported for tests.
 */
export function movedTo(view: View): string | null {
  return view === 'recommend' ? 'subjects/?mine=1' : null
}

function current(): Route {
  const r = parsePath(pagePath(), location.search)
  const to = movedTo(r.view)
  if (!to) return r
  history.replaceState(null, '', link(to) + location.hash)
  return parsePath(pagePath(), location.search)
}

/** Swap the address for another page's in place (no new history entry), e.g. as filters change. */
export function replaceAddress(path: string): void {
  history.replaceState(null, '', link(path))
  route.value = current()
}

/** A cut-off link like /subject/COMP%3 must not take the whole page down. */
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

// Addresses that still carry the old project path (/subject-compass/…, from before the
// site moved to the root, or mixed up by a search engine or an AI answer) lead to the same page.
const OLD_PATH = /^subject-compass(?:\/|$)/
function dropOldPath(): void {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : ''
  if (OLD_PATH.test(rest)) history.replaceState(null, '', BASE + rest.replace(OLD_PATH, '') + location.search + location.hash)
}

// Links shared before the move away from #/ addresses still work.
function upgradeHashLink(): void {
  if (!location.hash.startsWith('#/')) return
  history.replaceState(null, '', link(location.hash.slice(2)))
}

// One route for the whole app; every useView() reads the same one.
const route = shallowRef<Route | null>(null)

function sync(): void {
  route.value = current()
  countPage()
  window.scrollTo({ top: 0 })
  revealHash()
}

/** The #anchor of the last link whose part of the page isn't there (no plan, no grades yet). */
export const missedAnchor = shallowRef<string | null>(null)

// Each look for an anchor belongs to one visit: moving on cancels it, so an old page's anchor
// never scrolls the new page or flags it as missing.
let anchorVisit = 0

/**
 * A link into part of a page (/plan/#calendar, /record/#sec-backup): once that part is drawn,
 * open any folded section around it and bring it into view. The page's code is loaded first
 * (the first visit downloads it), then the page draws in steps, so this looks again for a
 * moment before giving up.
 */
function revealHash(): void {
  missedAnchor.value = null
  const visit = ++anchorVisit
  const id = safeDecode(location.hash.slice(1))
  if (!id) return
  const view = route.value?.view
  const loaded = view ? VIEW_LOADERS[view]().then(() => undefined, () => undefined) : Promise.resolve()
  void loaded.then(() => {
    let tries = 0
    const look = () => {
      if (visit !== anchorVisit) return
      const el = document.getElementById(id)
      if (!el) {
        if (++tries < 40) window.setTimeout(look, 50)
        else missedAnchor.value = id
        return
      }
      for (let d = el.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true
      el.scrollIntoView({ block: 'start' })
    }
    window.setTimeout(look, 0)
  })
}

function visit(address: string): void {
  // A new version was deployed and has taken over: load the next page in full to pick it up.
  if (newVersionReady()) {
    location.assign(address)
    return
  }
  history.pushState(null, '', address)
  sync()
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
  // Files like sitemap.xml or llms.txt aren't app pages.
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return
  // Same page, only a #fragment: let the browser scroll.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return
  event.preventDefault()
  visit(url.pathname + url.search + url.hash)
}

// Listeners are installed once, however many components ask for the route
// (two click handlers would push every page twice onto the history).
function install(): void {
  dropOldPath()
  upgradeHashLink()
  const { locale, setLocale } = useI18n()
  // Keep the address in the shown language, so a copied link opens the same way.
  const syncAddress = () => {
    const want = BASE + prefix(locale.value) + pagePath()
    if (location.pathname !== want) history.replaceState(null, '', want + location.search + location.hash)
  }
  syncAddress()
  watch(locale, syncAddress)
  // Back/forward can land on an address in another language: follow it.
  window.addEventListener('popstate', () => {
    const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : ''
    const inUrl = localeInPath(rest) ?? 'en'
    if (inUrl !== locale.value) setLocale(inUrl)
    sync()
  })
  document.addEventListener('click', onClick)
  window.addEventListener('hashchange', revealHash)
  route.value = current()
  countPage()
  revealHash()
}

/**
 * The current view, its parameter and query, kept in the address
 * (e.g. /subject/COMP30027 or /feedback?topic=data) so pages can be linked to.
 */
export function useView() {
  if (route.value === null) install()
  const r = computed(() => route.value ?? current())
  return {
    view: computed(() => r.value.view),
    param: computed(() => r.value.param),
    query: computed(() => r.value.query),
  }
}
