import type { GoogleFormConfig } from '@/config'

const ENTRY = /^entry\.\d+$/

/**
 * The form exists and every required question has an entry id. An optional question without a
 * real id yet (blank, or a TODO placeholder) doesn't hold the form back: it's just hidden.
 */
export function isFormReady<K extends string>(cfg: GoogleFormConfig<K>): boolean {
  return (
    cfg.formId !== '' &&
    (Object.entries(cfg.entries) as [K, string][]).every(
      ([k, e]) => ENTRY.test(e) || (cfg.optional ?? []).includes(k),
    )
  )
}

/** Whether this particular question exists on the form yet. */
export function hasQuestion<K extends string>(cfg: GoogleFormConfig<K>, key: K): boolean {
  return ENTRY.test(cfg.entries[key])
}

/** The only origin whose answers go to the real forms. */
export const LIVE_HOST = 'pickmysubjects.github.io'
let warned = false

/** True only on the deployed site in a production build (not dev, tests or prerendering). */
export function liveSite(): boolean {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.SSR) return false
  return typeof location !== 'undefined' && location.hostname === LIVE_HOST
}

/**
 * Submit straight to a Google Form's public response endpoint, so people can send
 * ratings and feedback without an account or leaving the app. The request is
 * `no-cors`, so the response is opaque: a resolved promise means "sent", not "stored".
 */
export async function submitGoogleForm<K extends string>(
  cfg: GoogleFormConfig<K>,
  values: Partial<Record<K, string | string[]>>,
): Promise<void> {
  if (!isFormReady(cfg)) throw new Error('form not configured')
  if (!liveSite()) {
    // Local, preview and test runs never reach the real forms: answers there are counted.
    if (import.meta.env.DEV && !warned) {
      warned = true
      console.info('[googleForm] not the live site: form submissions are skipped')
    }
    return
  }
  const body = new URLSearchParams()
  for (const [field, value] of Object.entries(values) as [K, string | string[] | undefined][]) {
    const entry = cfg.entries[field]
    if (!ENTRY.test(entry) || value === undefined) continue
    for (const v of [value].flat()) if (v !== '') body.append(entry, v)
  }
  await fetch(`https://docs.google.com/forms/d/e/${cfg.formId}/formResponse`, {
    method: 'POST',
    mode: 'no-cors',
    body,
  })
}
