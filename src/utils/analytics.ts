/**
 * Anonymous visit counts with GoatCounter (no cookies, nothing about the student).
 * /count.js (a pinned copy in public/) loads with every page and sets window.goatcounter; it is
 * told not to count on load, so the app counts the first page and every move between pages
 * itself. Off the real site (localhost, tests, prerendering) there is no window.goatcounter or
 * count.js skips the hit, so every call here is a quiet no-op.
 */

/** Anonymous actions. Names only: never a subject code, mark or anything from a student's record. */
export type AnalyticsEvent =
  | 'plan-generate'
  | 'plan-share'
  | 'plan-image-save'
  | 'plan-print'
  | 'rating-submit'
  | 'grades-share'
  | 'career-goal-set'
  | 'shortlist-add'
  | 'compare-open'
  | `language-${string}`

import { LOCALE_CODES } from '@/i18n/codes'

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean; referrer?: string }) => void
}

function counter(): GoatCounter['count'] | undefined {
  if (typeof window === 'undefined') return undefined
  const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter
  return typeof gc?.count === 'function' ? gc.count : undefined
}

/** The address to count: the path only (with its language part), never a query string or #fragment. */
export function countedPath(pathname: string): string {
  return pathname.split(/[?#]/)[0] || '/'
}

/** The site language a path is in: its first segment when that is a locale, else English (served at /). */
export function pathLocale(path: string): string {
  const first = path.split('/')[1] ?? ''
  return (LOCALE_CODES as readonly string[]).includes(first) ? first : 'en'
}

const SKIP_KEY = 'skipgc'

/** True when this browser turned counting off with #toggle-goatcounter. */
export function countingOff(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === 't'
  } catch {
    return false
  }
}

/**
 * Opening the site with #toggle-goatcounter turns counting off in this browser, or back on
 * (the same 'skipgc' flag count.js checks). Runs before the language redirect and before the
 * first count; the hash is then dropped so the redirected page doesn't toggle it back.
 * Returns true when it toggled.
 */
export function optOutToggle(): boolean {
  if (typeof location === 'undefined' || location.hash !== '#toggle-goatcounter') return false
  try {
    if (localStorage.getItem(SKIP_KEY) === 't') localStorage.removeItem(SKIP_KEY)
    else localStorage.setItem(SKIP_KEY, 't')
  } catch {
    // Storage blocked: nothing to remember the choice in.
  }
  try {
    history.replaceState(history.state, '', location.pathname + location.search)
  } catch {
    // Leave the address as it is.
  }
  return true
}

// In-app browsers send no referrer, so "unknown" hides them; their user agent names the app.
const APPS: readonly [string, RegExp][] = [
  ['wechat', /MicroMessenger/i],
  ['xiaohongshu', /xhsdiscover|XiaoHongShu/i],
  ['weibo', /Weibo/i],
  ['douyin', /aweme|BytedanceWebview/i],
  ['qq', /\bQQ\//],
  ['facebook', /FBAN|FBAV/],
  ['instagram', /Instagram/],
  ['line', /\bLine\//],
  ['kakaotalk', /KAKAOTALK/i],
  ['zalo', /Zalo/i],
]

/** Where a visit came from: the app whose in-app browser it is, else 'link' (has a referrer) or 'direct'. */
export function visitSource(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent, referrer: string = typeof document === 'undefined' ? '' : document.referrer): string {
  return APPS.find(([, re]) => re.test(ua))?.[0] ?? (referrer ? 'link' : 'direct')
}

/**
 * Calls `f` once, on the visitor's first real input: a tap, click, key or mouse wheel. Crawlers
 * that run JavaScript load pages but rarely send these (a scripted scroll fires no wheel event),
 * so visits with input against all visits gives roughly the share of real people.
 */
export function onFirstInput(f: () => void): void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  const types = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
  const done = (e?: Event) => {
    // Input a script made up (dispatchEvent) isn't a person; nor a click with no pointer behind it,
    // nor input on a page nobody can see (a background or prerendering tab).
    if (e && (e.isTrusted === false || (e.type === 'pointerdown' && (e as PointerEvent).pointerType === ''))) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    for (const t of types) window.removeEventListener(t, done)
    try {
      f()
    } catch {
      // Counting must never break the page.
    }
  }
  for (const t of types) window.addEventListener(t, done, { passive: true })
}

// Crawlers, AI agents and test browsers that say what they are. GoatCounter drops many known bots
// on its side too; these are the ones that run JavaScript and can send input.
const AUTOMATED = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|gptbot|chatgpt|oai-searchbot|claude|anthropic|perplexity|bytespider|amazonbot|applebot|google-(inspectiontool|extended|read-aloud)|bingpreview|yandex|baiduspider|petalbot|semrush|ahrefs|mj12|dotbot|facebookexternalhit|playwright|puppeteer|phantom|selenium|cypress/i

/** True for a browser that is driven by a program or says it is a crawler: never counted. */
export function looksAutomated(nav: { webdriver?: boolean; userAgent?: string; languages?: readonly string[] } | undefined = typeof navigator === 'undefined' ? undefined : navigator, win: { outerWidth?: number; outerHeight?: number } | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  if (!nav) return false
  if (nav.webdriver === true) return true
  if (AUTOMATED.test(nav.userAgent ?? '')) return true
  // Headless browsers have no window around the page.
  if (win && win.outerWidth === 0 && win.outerHeight === 0) return true
  // A real browser always has at least one language.
  if (Array.isArray(nav.languages) && nav.languages.length === 0) return true
  return false
}

let lastPath: string | null = null
let counted = 0
// Nothing is counted until the visitor's first tap, click, key or wheel: crawlers that run
// JavaScript load pages but rarely send input, so they stay out of the numbers. The page open
// at that moment is counted then; every page after it straight away.
let real = false
let pending: { path: string; title?: string } | null = null
let watching = false

// The address the visit landed on, read before the app tidies it (language redirect, ?share=).
const LANDING_SEARCH = typeof location === 'undefined' ? '' : location.search

/**
 * Where a visit with no referrer came from, so it doesn't show as "(unknown)": a tag on the link
 * (?ref=xhs or utm_source=…, for links posted in groups and apps), else the app whose in-app
 * browser opened it (WeChat, Xiaohongshu… send no referrer). Undefined when the browser sent a
 * referrer (count.js uses it) or nothing is known.
 */
export function referrerFallback(
  referrer: string = typeof document === 'undefined' ? '' : document.referrer,
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  search: string = LANDING_SEARCH,
): string | undefined {
  if (referrer) return undefined
  const q = new URLSearchParams(search)
  const tag = (q.get('ref') ?? q.get('utm_source') ?? '').trim().toLowerCase()
  // Only a short plain tag: never anything else from the address (it can carry a shared plan).
  if (/^[a-z0-9._-]{1,30}$/.test(tag)) return tag
  return APPS.find(([, re]) => re.test(ua))?.[0]
}

function send(path: string, title?: string): void {
  // The referrer only matters on the first page (where the visit came from); inside the site it's us.
  const first = counted++ === 0
  counter()?.({ path, title, referrer: first ? referrerFallback() : '' })
  // Once per visit, the site language it started in and where it came from.
  if (first) {
    counter()?.({ path: `visit-lang-${pathLocale(path)}`, title: 'visit language', event: true })
    counter()?.({ path: `visit-from-${visitSource()}`, title: 'visit source', event: true })
  }
}

/** Count a page view once the visitor has used the page. A repeat of the page just counted (same path) is skipped. */
export function countPage(pathname: string = typeof location === 'undefined' ? '/' : location.pathname, title?: string): void {
  if (countingOff() || looksAutomated()) return
  const path = countedPath(pathname)
  if (path === lastPath) return
  lastPath = path
  try {
    if (real) return send(path, title)
    pending = { path, title }
    if (watching) return
    watching = true
    onFirstInput(() => {
      real = true
      if (pending) send(pending.path, pending.title)
      pending = null
    })
  } catch {
    // Counting must never break the page.
  }
}
/** Count an anonymous action, e.g. trackEvent('plan-share'). */
export function trackEvent(name: AnalyticsEvent): void {
  // Only for a visit that has been counted (a person, see countPage): no events from crawlers.
  if (countingOff() || !real) return
  try {
    counter()?.({ path: name, title: name, event: true })
  } catch {
    // Counting must never break the page.
  }
}

/** For tests. */
export function resetAnalytics(): void {
  lastPath = null
  counted = 0
  real = false
  pending = null
  watching = false
}
