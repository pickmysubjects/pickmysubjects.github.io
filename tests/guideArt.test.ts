import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The generated illustrations (scripts/art/gen.cjs) of the guide, the About pages, the subject page and Find subjects must draw
// nothing outside their viewBox, or the hero band and the small panels clip them.
const require = createRequire(import.meta.url)
const { bounds } = require('../scripts/art/bounds.cjs') as { bounds: (svg: string) => { x0: number; y0: number; x1: number; y1: number } }
const DIR = join(__dirname, '../src/components/guide/art')
const ABOUT_DIR = join(__dirname, '../src/components/about/art')
const FILES = readdirSync(DIR).filter((f) => /^(Art|Mini)\w+\.vue$/.test(f))
const ABOUT_FILES = readdirSync(ABOUT_DIR).filter((f) => /^(Art|Mini)\w+\.vue$/.test(f))
const SUBJECT_DIR = join(__dirname, '../src/components/subject/art')
const SUBJECT_FILES = readdirSync(SUBJECT_DIR).filter((f) => /^Mini\w+\.vue$/.test(f))
const BROWSE_DIR = join(__dirname, '../src/components/browse/art')
const BROWSE_FILES = readdirSync(BROWSE_DIR).filter((f) => /^(Art|Mini)\w+\.vue$/.test(f))
const PLAN_DIR = join(__dirname, '../src/components/planner/art')
const PLAN_FILES = readdirSync(PLAN_DIR).filter((f) => /^(Art|Mini)\w+\.vue$/.test(f))

describe('guide illustrations', () => {
  it('has a hero scene and a small one for every page', () => {
    expect(FILES.filter((f) => f.startsWith('Art')).length).toBe(9)
    expect(FILES.filter((f) => f.startsWith('Mini')).length).toBe(8)
  })

  it('has a hero scene and a small one for every About page', () => {
    expect(ABOUT_FILES.filter((f) => f.startsWith('Art')).length).toBe(5)
    expect(ABOUT_FILES.filter((f) => f.startsWith('Mini')).length).toBe(5)
  })

  it('has the small one for the subject page', () => {
    expect(SUBJECT_FILES).toEqual(['MiniSubject.vue'])
  })

  it('has the hero scenes of Find subjects, a major and a career, and their small ones', () => {
    expect(BROWSE_FILES.sort()).toEqual(['ArtBrowse.vue', 'ArtCareer.vue', 'ArtMajor.vue', 'MiniBrowse.vue', 'MiniCareer.vue', 'MiniMajor.vue'])
  })

  it('has the hero scenes of the planner and its compare page', () => {
    expect(PLAN_FILES.sort()).toEqual(['ArtCompare.vue', 'ArtPlan.vue'])
  })

  it.each([...FILES.map((f) => join(DIR, f)), ...ABOUT_FILES.map((f) => join(ABOUT_DIR, f)), ...SUBJECT_FILES.map((f) => join(SUBJECT_DIR, f)), ...BROWSE_FILES.map((f) => join(BROWSE_DIR, f)), ...PLAN_FILES.map((f) => join(PLAN_DIR, f))])('%s keeps every shape inside its viewBox, with some air', (file) => {
    const src = readFileSync(file, 'utf8')
    const svg = /<svg[\s\S]*<\/svg>/.exec(src)![0]
    const [x, y, w, h] = /viewBox="([^"]+)"/.exec(svg)![1]!.split(' ').map(Number) as [number, number, number, number]
    const b = bounds(svg)
    expect(b.x0, 'left').toBeGreaterThanOrEqual(x + 2)
    expect(b.y0, 'top').toBeGreaterThanOrEqual(y + 2)
    expect(b.x1, 'right').toBeLessThanOrEqual(x + w - 2)
    expect(b.y1, 'bottom').toBeLessThanOrEqual(y + h - 2)
  })
})
