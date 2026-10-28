import { describe, expect, it } from 'vitest'
import { SITE_UPDATES } from '@/content/updates'
import { LOCALE_CODES } from '@/i18n/codes'

// The update log on /changes/: one short entry per day, newest first, in every language.
describe('site update log', () => {
  it('has one entry per date, newest first, from October 2026', () => {
    const dates = SITE_UPDATES.map((u) => u.date)
    expect(new Set(dates).size).toBe(dates.length)
    expect([...dates].sort().reverse()).toEqual(dates)
    for (const d of dates) expect(d >= '2026-10-01', d).toBe(true)
  })

  it.each(SITE_UPDATES.map((u) => [u.date, u] as const))('%s is short and in every language', (_, u) => {
    for (const code of LOCALE_CODES) {
      const text = u.text[code]
      expect(text?.trim(), code).toBeTruthy()
      // One sentence or a few brief points, not a list of details.
      expect(text!.length, code).toBeLessThanOrEqual(code === 'en' || code === 'vi' || code === 'ms' || code === 'id' || code === 'hi' ? 170 : 90)
    }
  })
})
