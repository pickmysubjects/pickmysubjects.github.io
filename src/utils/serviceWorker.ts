/**
 * Registers the offline service worker (built site only). When a new deploy's worker takes over,
 * the open page keeps running; the next in-site link then loads as a full page, so it picks up the
 * new version without a prompt. Plans and profile live in localStorage, so nothing is lost.
 */
let updated = false

/** True once a newer version of the site has taken over this page. */
export function newVersionReady(): boolean {
  return updated
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  // A local preview build: never cache it, and drop any worker an earlier local build left behind,
  // so a rebuild shows up on a plain reload.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => void r.unregister()))
    if ('caches' in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)))
    return
  }
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The first install also claims the page; that isn't an update.
    if (hadController) updated = true
  })
  const register = () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
