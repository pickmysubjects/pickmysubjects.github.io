import { afterEach, describe, expect, it, vi } from 'vitest'
import { RATINGS_FORM } from '../src/config'
import { hasQuestion, isFormReady, submitGoogleForm } from '../src/utils/googleForm'

describe('ratings form submission', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is configured, including the optional questions', () => {
    expect(isFormReady(RATINGS_FORM)).toBe(true)
    for (const k of ['examDifficulty', 'usefulness', 'interest', 'teaching'] as const) expect(hasQuestion(RATINGS_FORM, k)).toBe(true)
  })

  it('sends answered questions under their entry ids and skips blank ones', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', fetch)
    await submitGoogleForm(RATINGS_FORM, { code: 'COMP30027', difficulty: '3', usefulness: '5', teaching: '' })
    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(body.get(RATINGS_FORM.entries.code)).toBe('COMP30027')
    expect(body.get(RATINGS_FORM.entries.usefulness)).toBe('5')
    expect(body.has(RATINGS_FORM.entries.teaching)).toBe(false)
  })
})
