import { describe, expect, it } from 'vitest'
import { buildLeadsTo, buildTakenWith, relatedSubjects } from '../src/engine/related'
import { componentFileSchema } from '../src/engine/schema'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

const s1 = { offerings: { 2026: ['semester-1'] } }
const major = (id: string, codes: string[]) =>
  componentFileSchema.parse({ id, course: 'B-X', year: 2026, kind: 'major', title: id, points: 50, requirements: [{ all: codes }] })

describe('buildTakenWith', () => {
  const subjects = [
    subject({ code: 'AAAA20001', level: 2, ...s1, topics: ['programming'] }),
    subject({ code: 'AAAA20002', level: 2, ...s1, topics: ['programming'] }),
    subject({ code: 'BBBB20001', level: 2, ...s1, topics: ['biology'] }),
    subject({ code: 'CCCC20001', level: 2, offerings: { 2026: ['semester-2'] } }), // other semester
    subject({ code: 'AAAA30001', level: 3, ...s1, prerequisites: 'AAAA20001' }), // other level
    subject({ code: 'DDDD20001', level: 2, ...s1, non_allowed: ['AAAA20001'] }), // can't count together
    subject({ code: 'EEEE10001', level: 1, ...s1 }),
    subject({ code: 'EEEE10002', level: 1, ...s1 }),
    subject({ code: 'EEEE20001', level: 2, ...s1, prerequisites: { all: ['EEEE10001', 'EEEE10002'] } }),
  ]
  const data = dataset(subjects, {
    components: [
      major('one', ['AAAA20001', 'AAAA20002', 'BBBB20001', 'CCCC20001', 'AAAA30001', 'DDDD20001']),
      major('two', ['AAAA20001', 'BBBB20001']),
      major('three', ['EEEE20001']),
    ],
  })
  const tw = buildTakenWith(data, 2026)

  it('ranks by shared majors, then shared topics, and keeps only same level, same semester, allowed pairs', () => {
    expect(tw.AAAA20001).toEqual(['BBBB20001', 'AAAA20002'])
    expect(tw.AAAA20002).toEqual(['AAAA20001', 'BBBB20001', 'DDDD20001']) // DDDD only clashes with AAAA20001
  })

  it('pairs first-year subjects that lead into the same major', () => {
    expect(tw.EEEE10001).toEqual(['EEEE10002'])
  })

  it('caps the list', () => {
    expect(buildTakenWith(data, 2026, 1).AAAA20001).toEqual(['BBBB20001'])
  })
})

describe('relatedSubjects', () => {
  const subjects = Object.fromEntries(
    [
      subject({ code: 'AAAA10001' }),
      subject({ code: 'AAAA20001', level: 2, prerequisites: 'AAAA10001' }),
      subject({ code: 'AAAA20002', level: 2, prerequisites: { all: ['AAAA20001', 'ZZZZ10001'] } }),
      subject({ code: 'AAAA20003', level: 2 }),
    ].map((s) => [s.code, s]),
  )
  const index = { leadsTo: buildLeadsTo(subjects), takenWith: { AAAA20001: ['AAAA20003', 'AAAA20002'] } }

  it('gives leads-to, taken-with and before, never the subject itself, a missing page or a repeat', () => {
    expect(relatedSubjects(subjects.AAAA20001!, subjects, index)).toEqual({ leadsTo: ['AAAA20002'], takenWith: ['AAAA20003'], before: ['AAAA10001'] })
    expect(relatedSubjects(subjects.AAAA20002!, subjects, index).before).toEqual(['AAAA20001']) // ZZZZ10001 has no page
  })

  it('leaves out links already on the page', () => {
    expect(relatedSubjects(subjects.AAAA20001!, subjects, index, ['AAAA20002', 'AAAA10001'])).toEqual({ leadsTo: [], takenWith: ['AAAA20003'], before: [] })
  })
})

describe('related subjects on real data', () => {
  const { dataset: real } = buildDataset('real')
  it('works out the whole dataset at once, quickly', () => {
    const t0 = performance.now()
    const tw = buildTakenWith(real, 2026)
    expect(performance.now() - t0).toBeLessThan(5000)
    expect(tw.COMP10001?.length).toBeGreaterThan(0)
    for (const [code, list] of Object.entries(tw)) for (const c of list) expect(real.subjects[c]!.level).toBe(real.subjects[code]!.level)
  })
})
