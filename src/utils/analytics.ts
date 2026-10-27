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

let lastPath: string | null = null
let counted = 0

/** Count a page view. A repeat of the page just counted (same path) is skipped. */
export function countPage(pathname: string = typeof location === 'undefined' ? '/' : location.pathname): void {
  if (countingOff()) return
  const path = countedPath(pathname)
  if (path === lastPath) return
  lastPath = path
  try {
    // The referrer only matters on the first page (where the visit came from); inside the site it's us.
    const first = counted++ === 0
    counter()?.({ path, referrer: first ? undefined : '' })
    // Once per visit, the site language it started in, so the dashboard shows visits per language.
    if (first) counter()?.({ path: `visit-lang-${pathLocale(path)}`, title: 'visit language', event: true })
  } catch {
    // Counting must never break the page.
  }
}
/** Count an anonymous action, e.g. trackEvent('plan-share'). */
export function trackEvent(name: AnalyticsEvent): void {
  if (countingOff()) return
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
}
