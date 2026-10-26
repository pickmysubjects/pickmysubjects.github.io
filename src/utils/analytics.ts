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

let lastPath: string | null = null
let counted = 0

/** Count a page view. A repeat of the page just counted (same path) is skipped. */
export function countPage(pathname: string = typeof location === 'undefined' ? '/' : location.pathname): void {
  const path = countedPath(pathname)
  if (path === lastPath) return
  lastPath = path
  try {
    // The referrer only matters on the first page (where the visit came from); inside the site it's us.
    counter()?.({ path, referrer: counted++ === 0 ? undefined : '' })
  } catch {
    // Counting must never break the page.
  }
}
/** Count an anonymous action, e.g. trackEvent('plan-share'). */
export function trackEvent(name: AnalyticsEvent): void {
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
