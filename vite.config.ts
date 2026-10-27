/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { themePreview } from './scripts/themePreview'

/**
 * GitHub Pages can't send headers, so the Content-Security-Policy goes in a
 * meta tag — on the built site only (the dev server needs inline scripts and a
 * websocket). Scripts come only from this site; the only other host the page
 * talks to is Google Forms, for ratings and feedback, plus GoatCounter's count endpoint
 * (anonymous visit counts; count.js itself is a copy served from this site).
 */
export const GOATCOUNTER = 'https://pickmysubjects.goatcounter.com'

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Vue :style bindings
  `img-src 'self' data: ${GOATCOUNTER}`, // count.js falls back to an image if sendBeacon fails
  "font-src 'self' data:", // small font files are inlined by the build
  `connect-src 'self' https://docs.google.com ${GOATCOUNTER}`, // navigator.sendBeacon
  "worker-src 'self'", // the offline service worker (/sw.js)
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

/**
 * The app fetches the core subject data before it mounts; start that download with the page
 * instead of after the script has run.
 */
const preloadCoreData = (): Plugin => ({
  name: 'preload-core-data',
  apply: 'build',
  transformIndexHtml: (html, ctx) => {
    const core = Object.values(ctx.bundle ?? {}).find((f) => f.type === 'asset' && f.originalFileNames.some((n) => n.endsWith('real-core.json')))
    if (!core) return html
    return html.replace('</head>', `  <link rel="preload" href="/${core.fileName}" as="fetch" type="application/json" crossorigin />\n  </head>`)
  },
})

/**
 * Writes /sw.js (template: scripts/sw.js) for offline use. Precached: the app shell, every JS and
 * CSS file except other languages' messages, the core subject data, icons and the manifest.
 * Language chunks, fonts, per-area detail data and visited pages are cached when first used.
 */
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const files = Object.values(bundle)
    const isMessages = (f: (typeof files)[number]) => f.type === 'chunk' && !!f.facadeModuleId && /\/i18n\/messages\/(?!en\.ts)/.test(f.facadeModuleId)
    const precache = files
      .filter((f) => !isMessages(f) && (/\.(js|css)$/.test(f.fileName) || (f.type === 'asset' && f.originalFileNames.some((n) => n.endsWith('real-core.json')))))
      .map((f) => `/${f.fileName}`)
      .sort()
    const shell = ['/404.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']
    const known = files.map((f) => `/${f.fileName}`).filter((f) => f.startsWith('/assets/')).sort()
    const version = createHash('sha256').update(known.join('\n')).digest('hex').slice(0, 12)
    const source = readFileSync(fileURLToPath(new URL('./scripts/sw.js', import.meta.url)), 'utf8')
      .replace('__VERSION__', JSON.stringify(version))
      .replace('__PRECACHE__', JSON.stringify([...shell, ...precache]))
      .replace('__KNOWN__', JSON.stringify(known))
    this.emitFile({ type: 'asset', fileName: 'sw.js', source })
  },
})

// The light/dark/RT preview switch: dev server and `npm run local` only, never the real build.
const PREVIEW = process.env.VITE_FORCE_GLASS === '1' || process.argv.every((a) => a !== 'build')

// The site version (package.json) and build date, shown in the home hero and the footer.
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_UPDATED__: JSON.stringify(new Date().toISOString()),
  },
  css: { postcss: { plugins: PREVIEW ? [themePreview()] : [] } },
  plugins: [vue(), contentSecurityPolicy(), preloadCoreData(), serviceWorker()],
  // The site is served from / on GitHub Pages. Pages have real
  // addresses (/subject/COMP30027), so assets need an absolute base.
  base: '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Data files are fetched, and the CSP only allows fetching from this site: never inline them as data: URLs.
    assetsInlineLimit: (file) => (file.endsWith('.json') ? false : undefined),
  },
  server: { port: 5180 },
  test: {
    include: ['tests/**/*.test.ts'],
    // Many tests plan on the real data; on shared CI runners they run past the 5s default.
    testTimeout: 30_000,
    // Locally, leave most cores free so the laptop stays cool; CI uses all of its runner.
    // Override with TEST_WORKERS=<n>.
    maxWorkers: process.env.CI ? undefined : Number(process.env.TEST_WORKERS) || 3,
  },
})
