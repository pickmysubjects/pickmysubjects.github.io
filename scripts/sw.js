/*
 * Service worker for offline use. Built by the `service-worker` plugin in vite.config.ts, which
 * fills in VERSION, PRECACHE (the app shell, its JS/CSS and the core subject data) and KNOWN (every
 * hashed file of this deploy, so older ones can be dropped).
 *
 * - Hashed files under /assets/ never change: served from cache first. Language chunks, fonts and
 *   per-area detail data are cached the first time they are used.
 * - Page loads try the network first (so a new deploy shows up on the next navigation), keep a copy,
 *   and offline fall back to that copy or to the app shell, which renders any page from the address.
 * - A new version installs and takes over straight away; old caches are dropped.
 */
const VERSION = __VERSION__
const PRECACHE = __PRECACHE__
const KNOWN = __KNOWN__
const SHELL = '/404.html'
const STATIC = `pms-static-${VERSION}`
const ASSETS = 'pms-assets'
const PAGES = `pms-pages-${VERSION}`
const OTHER = 'pms-other'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, ASSETS, PAGES, OTHER])
      for (const key of await caches.keys()) if (key.startsWith('pms-') && !keep.has(key)) await caches.delete(key)
      // Hashed files from older deploys are no longer referenced by anything we serve.
      const known = new Set(KNOWN)
      const assets = await caches.open(ASSETS)
      for (const req of await assets.keys()) if (!known.has(new URL(req.url).pathname)) await assets.delete(req)
      await self.clients.claim()
    })(),
  )
})

async function fromCacheFirst(request) {
  const hit = await caches.match(request, { ignoreVary: true })
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    caches.open(ASSETS).then((c) => c.put(request, copy))
  }
  return response
}

async function page(event) {
  const { request } = event
  const cache = await caches.open(PAGES)
  try {
    const response = await fetch(request)
    if (response.ok) {
      const copy = response.clone()
      event.waitUntil(cache.put(request, copy))
    }
    return response
  } catch (err) {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(SHELL)) ||
      Response.error()
    )
  }
}

async function staleWhileRevalidate(event) {
  const { request } = event
  const cache = await caches.open(OTHER)
  const hit = await caches.match(request)
  const update = fetch(request).then((response) => {
    if (response.ok) event.waitUntil(cache.put(request, response.clone()))
    return response
  })
  if (hit) {
    event.waitUntil(update.catch(() => {}))
    return hit
  }
  return update
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') event.respondWith(page(event))
  else if (url.pathname.startsWith('/assets/')) event.respondWith(fromCacheFirst(request))
  else if (url.pathname !== '/sw.js') event.respondWith(staleWhileRevalidate(event))
})
