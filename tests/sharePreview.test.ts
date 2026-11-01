import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)

// Link previews in chat apps and social posts: one 1200×630 picture for every page.
describe('share preview', () => {
  it('ships a 1200×630 PNG under 1 MB', () => {
    const png = readFileSync(new URL('public/og.png', root))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
    expect(png.length).toBeLessThan(1024 * 1024)
  })

  it('every prerendered page points to it, with a large card', () => {
    const src = readFileSync(new URL('scripts/prerender.ts', root), 'utf8')
    expect(src).toContain('og:image" content="${SITE}og.png"')
    expect(src).toContain('summary_large_image')
  })
})
