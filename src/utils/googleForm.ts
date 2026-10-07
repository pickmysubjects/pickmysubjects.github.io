import type { GoogleFormConfig } from '@/config'

const ENTRY = /^entry\.\d+$/

/** The form exists and every required question has an entry id. */
export function isFormReady<K extends string>(cfg: GoogleFormConfig<K>): boolean {
  return (
    cfg.formId !== '' &&
    (Object.entries(cfg.entries) as [K, string][]).every(
      ([k, e]) => ENTRY.test(e) || (e === '' && (cfg.optional ?? []).includes(k)),
    )
  )
}

/** Whether this particular question exists on the form yet. */
export function hasQuestion<K extends string>(cfg: GoogleFormConfig<K>, key: K): boolean {
  return ENTRY.test(cfg.entries[key])
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
