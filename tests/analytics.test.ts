import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CSP, GOATCOUNTER } from '../vite.config'
import { countPage, countedPath, resetAnalytics, trackEvent } from '@/utils/analytics'

const root = new URL('../', import.meta.url)

afterEach(() => {
  vi.unstubAllGlobals()
  resetAnalytics()
})

describe('GoatCounter wiring', () => {
  it('lets the CSP send counts only to the count endpoint, and keeps scripts on this site', () => {
    expect(GOATCOUNTER).toBe('https://pickmysubjects.goatcounter.com')
    expect(CSP).toMatch(/connect-src [^;]*https:\/\/pickmysubjects\.goatcounter\.com/)
    expect(CSP).toMatch(/img-src [^;]*https:\/\/pickmysubjects\.goatcounter\.com/)
    expect(CSP).toContain("script-src 'self';")
  })

  it('loads the pinned count.js from this site in the page shell (every prerendered page uses it)', () => {
    const shell = readFileSync(new URL('index.html', root), 'utf8')
    const tag = shell.match(/<script[^>]*data-goatcounter=[^>]*>/)?.[0] ?? ''
    expect(tag).toContain('src="/count.js"')
    expect(tag).toContain('data-goatcounter="https://pickmysubjects.goatcounter.com/count"')
    expect(tag).toContain('"no_onload":true')
    // Before the app's module script, so window.goatcounter exists when the app counts.
    expect(shell.indexOf('/count.js')).toBeLessThan(shell.indexOf('/src/main.ts'))
    const prerender = readFileSync(new URL('scripts/prerender.ts', root), 'utf8')
    expect(prerender).toContain("join(DIST, 'index.html')")
  })

  it('never sends the query string from the vendored count.js', () => {
    const js = readFileSync(new URL('public/count.js', root), 'utf8')
    expect(js).not.toMatch(/q:\s*location\.search/)
    expect(js).toContain('https://gc.zgo.at/count.js')
  })
})

describe('counting', () => {
  it('counts the path only, never a query string or fragment', () => {
    expect(countedPath('/zh-CN/plan?share=abc#x')).toBe('/zh-CN/plan')
    expect(countedPath('/subjects/?mine=1')).toBe('/subjects/')
    expect(countedPath('')).toBe('/')
  })

  it('sends page paths and skips a repeat of the same page', () => {
    const count = vi.fn()
    vi.stubGlobal('window', { goatcounter: { count } })
    countPage('/plan?share=XYZ')
    countPage('/plan')
    countPage('/zh-CN/guide')
    expect(count.mock.calls.map((c) => c[0].path)).toEqual(['/plan', '/zh-CN/guide'])
    // Inside the site the referrer is us: only the first page keeps the real one.
    expect(count.mock.calls[0]?.[0].referrer).toBeUndefined()
    expect(count.mock.calls[1]?.[0].referrer).toBe('')
  })

  it('sends events as named events', () => {
    const count = vi.fn()
    vi.stubGlobal('window', { goatcounter: { count } })
    trackEvent('plan-share')
    trackEvent('language-zh-TW')
    expect(count.mock.calls.map((c) => c[0])).toEqual([
      { path: 'plan-share', title: 'plan-share', event: true },
      { path: 'language-zh-TW', title: 'language-zh-TW', event: true },
    ])
  })

  it('is a quiet no-op without count.js (SSR, tests, blocked script) and never throws', () => {
    expect(() => trackEvent('plan-generate')).not.toThrow()
    expect(() => countPage('/')).not.toThrow()
    vi.stubGlobal('window', {})
    expect(() => trackEvent('plan-print')).not.toThrow()
    vi.stubGlobal('window', { goatcounter: { count: () => { throw new Error('blocked') } } })
    resetAnalytics()
    expect(() => countPage('/x')).not.toThrow()
  })
})
