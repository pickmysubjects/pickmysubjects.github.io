import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The guide's generated illustrations (scripts/art/gen.cjs) must draw nothing outside their
// viewBox, or the hero band and the small panels clip them.
const require = createRequire(import.meta.url)
const { bounds } = require('../scripts/art/bounds.cjs') as { bounds: (svg: string) => { x0: number; y0: number; x1: number; y1: number } }
const DIR = join(__dirname, '../src/components/guide/art')
const FILES = readdirSync(DIR).filter((f) => /^(Art|Mini)\w+\.vue$/.test(f))

describe('guide illustrations', () => {
  it('has a hero scene and a small one for every page', () => {
    expect(FILES.filter((f) => f.startsWith('Art')).length).toBe(9)
    expect(FILES.filter((f) => f.startsWith('Mini')).length).toBe(8)
  })

  it.each(FILES)('%s keeps every shape inside its viewBox, with some air', (f) => {
    const src = readFileSync(join(DIR, f), 'utf8')
    const svg = /<svg[\s\S]*<\/svg>/.exec(src)![0]
    const [x, y, w, h] = /viewBox="([^"]+)"/.exec(svg)![1]!.split(' ').map(Number) as [number, number, number, number]
    const b = bounds(svg)
    expect(b.x0, 'left').toBeGreaterThanOrEqual(x + 2)
    expect(b.y0, 'top').toBeGreaterThanOrEqual(y + 2)
    expect(b.x1, 'right').toBeLessThanOrEqual(x + w - 2)
    expect(b.y1, 'bottom').toBeLessThanOrEqual(y + h - 2)
  })
})
