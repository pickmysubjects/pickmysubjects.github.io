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

export default defineConfig({
  plugins: [vue(), contentSecurityPolicy()],
  // Relative base so the static build works from any path (e.g. GitHub Pages).
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5180 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
