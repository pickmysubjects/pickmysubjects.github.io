/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * GitHub Pages can't send headers, so the Content-Security-Policy goes in a
 * meta tag — on the built site only (the dev server needs inline scripts and a
 * websocket). Scripts come only from this site; the only other host the page
 * talks to is Google Forms, for ratings and feedback.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Vue :style bindings
  "img-src 'self' data:",
  "font-src 'self' data:", // small font files are inlined by the build
  "connect-src 'self' https://docs.google.com",
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

export default defineConfig({
  plugins: [vue(), contentSecurityPolicy(), preloadCoreData()],
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
  },
})
