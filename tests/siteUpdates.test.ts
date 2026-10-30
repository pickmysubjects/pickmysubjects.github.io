import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SITE_RELEASES } from '@/content/updates'
import { LOCALE_CODES } from '@/i18n/codes'

// The update log by version on /changes/ and in the home version pill: newest first, every language.
describe('site update log', () => {
  it('lists each version once, newest first, the newest being the version being built', () => {
    const versions = SITE_RELEASES.map((r) => r.version)
    expect(new Set(versions).size).toBe(versions.length)
    const num = (v: string) => v.split('.').map(Number)
    for (let i = 1; i < versions.length; i++) {
      const [a, b] = [num(versions[i - 1]!), num(versions[i]!)]
      expect(a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!, `${versions[i - 1]} after ${versions[i]}`).toBeGreaterThan(0)
    }
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(versions[0]).toBe(pkg.version)
  })

  it('dates only shipped versions, never later ones before earlier', () => {
    const dated = SITE_RELEASES.filter((r) => r.date !== null)
    for (const r of dated) expect(r.date, r.version).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const dates = dated.map((r) => r.date!)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it.each(SITE_RELEASES.map((r) => [r.version, r] as const))('v%s has short points in every language', (_, r) => {
    expect(r.points.length).toBeGreaterThan(0)
    expect(r.points.length).toBeLessThanOrEqual(6)
    for (const p of r.points)
      for (const code of LOCALE_CODES) {
        const text = p[code]
        expect(text?.trim(), code).toBeTruthy()
        expect(text!.length, code).toBeLessThanOrEqual(['en', 'vi', 'ms', 'id', 'hi'].includes(code) ? 170 : 90)
      }
  })
})
