import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diffCounts, diffIsEmpty, diffYears, snapshotOf } from '../src/engine/yearDiff'
import { componentFileSchema } from '../src/engine/schema'
import { buildChanges } from '../scripts/changes'
import { changeSections, changesSummary } from '../src/utils/changesText'
import { interpolate } from '../src/i18n'
import { en } from '../src/i18n/messages/en'
import { dataset, subject } from './helpers'

const t = (key: string, params?: Record<string, string | number>) =>
  interpolate(key.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], en) as string, params)

const exam = (w: number) => (w ? [{ kind: 'exam', weight: w }, { kind: 'assignment', weight: 100 - w }] : [{ kind: 'assignment', weight: 100 }])
const major = (core: string[]) =>
  componentFileSchema.parse({ id: 'stats', course: 'B-X', year: 2026, kind: 'major', title: 'Statistics', points: 50, requirements: [{ all: core }] })

// The fixture pair: the 2026 Handbook, then the same files once 2027 is typed in.
const y2026 = dataset(
  [
    subject({ code: 'AAAA10001', title: 'Intro', offerings: { 2026: ['semester-1'] }, assessment: exam(60) }),
    subject({ code: 'AAAA20001', title: 'Middle', level: 2, offerings: { 2026: ['semester-2'] }, prerequisites: 'AAAA10001' }),
    subject({ code: 'AAAA30001', title: 'Old', level: 3, offerings: { 2026: ['semester-1'] } }),
    subject({ code: 'AAAA10002', title: 'Same', offerings: { 2026: ['semester-1'] } }),
  ],
  { components: [major(['AAAA10001', 'AAAA20001'])] },
)
const y2027 = dataset(
  [
    subject({ code: 'AAAA10001', title: 'Introduction', offerings: { 2026: ['semester-1'], 2027: ['semester-1', 'semester-2'] }, assessment: exam(50) }),
    subject({ code: 'AAAA20001', title: 'Middle', level: 2, offerings: { 2026: ['semester-2'], 2027: ['semester-2'] }, prerequisites: { all: ['AAAA10001', 'AAAA10002'] } }),
    subject({ code: 'AAAA30001', title: 'Old', level: 3, offerings: { 2026: ['semester-1'] }, discontinued_from: 2027 }),
    // Not re-entered for 2027 yet: no change claimed.
    subject({ code: 'AAAA10002', title: 'Same', offerings: { 2026: ['semester-1'] } }),
    subject({ code: 'AAAA30002', title: 'New', level: 3, offerings: { 2027: ['semester-2'] } }),
  ],
  { components: [major(['AAAA10001', 'AAAA30002'])] },
)

describe('diffYears', () => {
  const d = diffYears(snapshotOf(y2026, 2026), snapshotOf(y2027, 2027))

  it('finds new and discontinued subjects', () => {
    expect(d.subjects.added).toEqual(['AAAA30002'])
    expect(d.subjects.discontinued).toEqual(['AAAA30001'])
  })

  it('lists each changed field, and nothing for a subject not re-entered', () => {
    expect(d.subjects.changed).toEqual([
      {
        code: 'AAAA10001',
        changes: [
          { field: 'periods', from: ['semester-1'], to: ['semester-1', 'semester-2'] },
          { field: 'exam', from: 60, to: 50 },
          { field: 'title', from: 'Intro', to: 'Introduction' },
        ],
      },
      { code: 'AAAA20001', changes: [{ field: 'prerequisites', added: ['AAAA10002'], removed: [] }] },
    ])
  })

  it('finds compulsory subjects added to and dropped from a major', () => {
    expect(d.components.changed).toEqual([{ id: 'stats', added: ['AAAA30002'], removed: ['AAAA20001'] }])
    expect(diffCounts(d)).toEqual({ added: 1, discontinued: 1, changed: 2, majors: 1 })
  })

  it('is empty for the same year twice', () => {
    expect(diffIsEmpty(diffYears(snapshotOf(y2026, 2026), snapshotOf(y2026, 2026)))).toBe(true)
  })

  it('reads as a summary and grouped lists', () => {
    expect(changesSummary(t, d, ', ')).toBe('New subjects: 1, No longer running: 1, Changed: 2, Majors changed: 1')
    const sections = changeSections(t, d, { subjectTitle: (c) => c, componentTitle: () => 'Statistics', listSep: ', ' })
    expect(sections.map((s) => s.key)).toEqual(['added', 'discontinued', 'changed', 'majors'])
    expect(sections[2]!.items[0]!.details).toEqual(['Runs: Sem 1 → Sem 1, Sem 2', 'Final exam: 60% → 50%', 'Was called Intro'])
    expect(sections[3]!.items[0]!.details).toEqual(['Now compulsory: AAAA30002', 'No longer compulsory: AAAA20001'])
  })
})

describe('buildChanges (the page exists only when there is something to show)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snap-'))
  it('is null with no snapshot', () => expect(buildChanges(y2027, dir)).toBeNull())
  it('is null before the next year is entered, and when nothing differs', () => {
    writeFileSync(join(dir, '2026.json'), JSON.stringify(snapshotOf(y2026, 2026)))
    expect(buildChanges(y2026, dir)).toBeNull()
  })
  it('gives the diff once it is', () => {
    expect(buildChanges(y2027, dir)?.to).toBe(2027)
  })
})
