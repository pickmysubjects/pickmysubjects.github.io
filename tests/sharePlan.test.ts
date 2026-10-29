import { describe, expect, it } from 'vitest'
import { decodePlan, encodePlan } from '../src/utils/sharePlan'
import { realData } from './realData'

describe('shared plan links', () => {
  const setup = { course: 'B-SCI', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' as const, major: 'data-science', specialisation: '', minors: [] as string[] }
  const terms = [
    { year: 2027, period: 'semester-1' as const, subjects: ['COMP10001', 'MAST10006'] },
    { year: 2028, period: 'summer' as const, subjects: [] },
  ]

  it('round-trips a plan', () => {
    expect(decodePlan(encodePlan(setup, terms))).toEqual({ setup, terms })
  })

  it('round-trips every setup field and the plan name, in any script', () => {
    const full = { ...setup, minors: ['mathematics-and-statistics', 'philosophy'], field: 'computing', major2: 'philosophy', diploma: 'D-LANG', diplomaStream: 'french-studies' }
    for (const name of ['Plan with Data', '数据科学 · 方案二', '~100% ok?&=#/+', 'これは😀']) {
      expect(decodePlan(encodePlan(full, terms, name))).toEqual({ setup: full, terms, name })
    }
    // Blank names are left out; long ones are cut like a renamed plan.
    expect(decodePlan(encodePlan(setup, terms, '   '))).toEqual({ setup, terms })
    expect(decodePlan(encodePlan(setup, terms, 'x'.repeat(60)))?.name).toHaveLength(40)
  })

  it('is safe in a URL and ends in a character chat apps keep in a link', () => {
    for (const code of [encodePlan(setup, terms), encodePlan(setup, terms, '数据 plan?&'), encodePlan(setup, [], 'A')]) {
      // RFC 3986 unreserved characters only: nothing a browser or chat app escapes or splits on.
      expect(code).toMatch(/^[A-Za-z0-9~._-]+$/)
    }
    expect(encodePlan(setup, terms, 'name')).toMatch(/\d$/)
  })

  it('reads the same once the query has been decoded, as URLSearchParams does', () => {
    const code = encodePlan(setup, terms, '计划 B+')
    const read = new URLSearchParams(`share=${code}`).get('share')!
    expect(decodePlan(read)).toEqual({ setup, terms, name: '计划 B+' })
  })

  it('is much shorter than the first links for a full degree', () => {
    const all = Object.keys(realData().subjects).slice(0, 24)
    const full = Array.from({ length: 6 }, (_, i) => ({ year: 2027 + Math.floor(i / 2), period: (i % 2 ? 'semester-2' : 'semester-1') as 'semester-1' | 'semester-2', subjects: all.slice(i * 4, i * 4 + 4) }))
    const v1 = btoa(JSON.stringify({ v: 1, s: [setup.course, 2026, 2027, 1, setup.major, '', '', ''], t: full.map((x) => [x.year, 1, x.subjects]) }))
    const v2 = encodePlan(setup, full)
    expect(v2.length).toBeLessThan(v1.length * 0.65)
    expect(decodePlan(v2)?.terms).toEqual(full)
  })

  it('still opens links made before the shorter format', () => {
    // Made by the first (v1, base64 JSON) encoder.
    const v1 =
      'eyJ2IjoxLCJzIjpbIkItU0NJIiwyMDI2LDIwMjcsMSwiZGF0YS1zY2llbmNlIiwiIiwiY29tcHV0aW5nIiwibWF0aGVtYXRpY3MtYW5kLXN0YXRpc3RpY3MiLCJwaGlsb3NvcGh5IiwiRC1MQU5HIiwiZnJlbmNoLXN0dWRpZXMiXSwidCI6W1syMDI3LDEsWyJDT01QMTAwMDEiLCJNQVNUMTAwMDYiXV0sWzIwMjcsMyxbIkNPTVAxMDAwMiJdXV19'
    expect(decodePlan(v1)).toEqual({
      setup: { ...setup, minors: ['mathematics-and-statistics'], field: 'computing', major2: 'philosophy', diploma: 'D-LANG', diplomaStream: 'french-studies' },
      terms: [
        { year: 2027, period: 'semester-1', subjects: ['COMP10001', 'MAST10006'] },
        { year: 2027, period: 'semester-2', subjects: ['COMP10002'] },
      ],
    })
    const short = 'eyJ2IjoxLCJzIjpbIkItQ09NIiwyMDI1LDIwMjUsMywiIiwiIiwiIiwiIl0sInQiOltbMjAyNSwzLFsiRUNPTjEwMDA0Il1dXX0'
    expect(decodePlan(short)).toEqual({
      setup: { course: 'B-COM', courseYear: 2025, startYear: 2025, startPeriod: 'semester-2', major: '', specialisation: '', minors: [] },
      terms: [{ year: 2025, period: 'semester-2', subjects: ['ECON10004'] }],
    })
  })

  it('carries nothing from the record or about the student', () => {
    const mine = { ...setup, international: true, load: 37.5, confirmed: true, commencementYear: 2026 }
    const planTerms = [{ year: 2027, period: 'semester-1' as const, subjects: ['COMP10001'], edited: true, mark: 87, wam: 81.25 }]
    const code = encodePlan(mine, planTerms as never, 'Mine')
    expect(code).not.toMatch(/37\.5|87|81/)
    expect(decodePlan(code)).toEqual({ setup, terms: [{ year: 2027, period: 'semester-1', subjects: ['COMP10001'] }], name: 'Mine' })
    // Anything extra in an old link is not read.
    const sneaky = btoa(JSON.stringify({ v: 1, s: ['B-SCI', 2026, 2027, 1, '', '', '', ''], t: [[2027, 1, ['COMP10001']]], marks: { COMP10001: 90 }, international: true }))
    expect(decodePlan(sneaky)).toEqual({ setup: { ...setup, major: '' }, terms: [{ year: 2027, period: 'semester-1', subjects: ['COMP10001'] }] })
  })

  it('reads every cut-off or edited link as broken, never as a smaller plan', () => {
    const code = encodePlan(setup, [...terms, { year: 2027, period: 'semester-2' as const, subjects: ['COMP10002'] }], 'Mine')
    for (let n = 0; n < code.length; n++) expect(decodePlan(code.slice(0, n)), code.slice(0, n)).toBeNull()
    expect(decodePlan('not-a-plan')).toBeNull()
    expect(decodePlan(code.replace('COMP10001', 'COMP1000X'))).toBeNull()
    expect(decodePlan(code.replace('~2027~', '~1999~'))).toBeNull()
    expect(decodePlan(code.replace('B-SCI', 'B SCI'))).toBeNull()
    expect(decodePlan(`${code}~extra`)).toBeNull()
    // Old links: cut off, or not a plan at all.
    const old = 'eyJ2IjoxLCJzIjpbIkItQ09NIiwyMDI1LDIwMjUsMywiIiwiIiwiIiwiIl0sInQiOltbMjAyNSwzLFsiRUNPTjEwMDA0Il1dXX0'
    expect(decodePlan(old.slice(0, 40))).toBeNull()
    expect(decodePlan(btoa('{"v":1,"s":"x"}'))).toBeNull()
  })

  it('keeps a plan with no semesters when an app drops its trailing "~"', () => {
    const code = encodePlan(setup, [])
    expect(code.endsWith('~')).toBe(true)
    expect(decodePlan(code.slice(0, -1))).toEqual({ setup, terms: [] })
  })

  it('has a URL-safe id for every course and component in the dataset', () => {
    const data = realData()
    for (const id of [...data.courses.map((c) => c.code), ...data.components.map((c) => c.id)]) expect(id).toMatch(/^[A-Za-z0-9-]+$/)
  })
})

describe('share links keep the field', () => {
  it('round-trips a field with no major, and still reads links without one', async () => {
    const { encodePlan, decodePlan } = await import('../src/utils/sharePlan')
    const setup = { course: 'B-SCI', courseYear: 2026, startYear: 2027, startPeriod: 'semester-2' as const, major: '', specialisation: '', minors: [] as string[], field: 'computing' }
    expect(decodePlan(encodePlan(setup, []))?.setup.field).toBe('computing')
    expect(decodePlan(encodePlan({ ...setup, field: undefined }, []))?.setup.field).toBeUndefined()
  })
})
