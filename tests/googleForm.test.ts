import { afterEach, describe, expect, it, vi } from 'vitest'
import { RATINGS_FORM } from '../src/config'
import { hasQuestion, isFormReady, submitGoogleForm } from '../src/utils/googleForm'

/** As on the deployed site: a production build on the live host. */
function asLiveSite(): void {
  vi.stubEnv('DEV', false)
  vi.stubEnv('MODE', 'production')
  vi.stubEnv('SSR', false)
  vi.stubGlobal('location', { hostname: 'pickmysubjects.github.io' })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('only the live site submits', () => {
  it('skips the request in tests, dev builds and on any other host', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', fetch)
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3' })
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('DEV', false)
    vi.stubGlobal('location', { hostname: 'localhost' })
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3' })
    vi.stubEnv('DEV', true)
    vi.stubGlobal('location', { hostname: 'pickmysubjects.github.io' })
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3' })
    expect(fetch).not.toHaveBeenCalled()
    asLiveSite()
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('ratings form submission', () => {

  it('is configured, including the optional questions', () => {
    expect(isFormReady(RATINGS_FORM)).toBe(true)
    for (const k of ['examDifficulty', 'usefulness', 'interest', 'teaching'] as const) expect(hasQuestion(RATINGS_FORM, k)).toBe(true)
  })

  it('sends answered questions under their entry ids and skips blank ones', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', fetch)
    asLiveSite()
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3', usefulness: '5', teaching: '' })
    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(body.get(RATINGS_FORM.entries.code)).toBe('COMP30027')
    expect(body.get(RATINGS_FORM.entries.usefulness)).toBe('5')
    expect(body.has(RATINGS_FORM.entries.teaching)).toBe(false)
  })
})

describe('rating tags question', () => {
  it('is on the form with a real entry id', () => {
    expect(isFormReady(RATINGS_FORM)).toBe(true)
    expect(RATINGS_FORM.entries.tags).toMatch(/^entry\.\d+$/)
    expect(hasQuestion(RATINGS_FORM, 'tags')).toBe(true)
  })

  it('sends each ticked tag as its own value', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', fetch)
    asLiveSite()
    const cfg = { ...RATINGS_FORM, entries: { ...RATINGS_FORM.entries, tags: 'entry.123' } }
    await submitGoogleForm(cfg, { code: 'COMP30027', tags: ['tough-exam', 'interesting'] })
    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(body.getAll('entry.123')).toEqual(['tough-exam', 'interesting'])
    vi.unstubAllGlobals()
  })
})
