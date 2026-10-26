import { describe, expect, it } from 'vitest'
import { realData } from './realData'

describe('rule fixes from the code review', () => {
  it('first-semester rule skips a summer term in front; points never count a subject twice', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const real = realData()
    const plan = (terms: { year: number; period: string; subjects: string[] }[], completed: string[] = []) =>
      ({ course: 'B-SCI', courseYear: 2026, completed, terms }) as never
    const first = checkCourse(plan([{ year: 2026, period: 'summer', subjects: [] }, { year: 2026, period: 'semester-1', subjects: ['SCIE10005'] }]), real)
    expect(first.statuses.find((s) => s.ruleId === 'scie10005')?.status).toBe('ok')
    const twice = checkCourse(plan([{ year: 2026, period: 'semester-1', subjects: ['MAST10006'] }], ['MAST10006']), real)
    expect(twice.statuses.find((s) => s.ruleId === 'total')?.detail).toMatch(/^12\.5 /)
  })

  it('a condition naming a major in the course is not met just by being in the course', async () => {
    const { evaluateField } = await import('../src/engine/expr')
    const real = realData()
    const s = real.subjects.BMEN30008!
    const r = evaluateField(s.prerequisites, { completed: new Set(['BMEN30006']), subjects: real.subjects, admittedCourse: 'B-SCI' })
    expect(r.status).not.toBe('ok')
  })

  it('a subject not in our data counts 12.5 towards the total, and only its own level elsewhere', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const real = realData()
    const code = 'ZZZZ20001' // level 2, not in the data
    const r = checkCourse({ course: 'B-SCI', courseYear: 2026, completed: ['MAST10006', code], terms: [] } as never, real)
    expect(r.statuses.find((s) => s.ruleId === 'total')?.detail).toMatch(/^25 /)
    // A level-2 unknown can't touch level-1 rules: they're decided, not "unknown".
    expect(r.statuses.find((s) => s.ruleId === 'breadth-l1-cap')?.status).toBe('ok')
    expect(r.statuses.find((s) => s.ruleId === 'science-l1')?.status).toBe('fail')
  })

  it('an unknown subject counts towards a category when its prefix is all that category', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const real = realData()
    const { forCourse } = await import('../src/engine/forCourse')
    const r = checkCourse({ course: 'B-SCI', courseYear: 2026, completed: ['MAST29999'], terms: [] } as never, forCourse(real, 'B-SCI'))
    expect(r.statuses.find((s) => s.ruleId === 'science')?.detail).toMatch(/^12\.5 /)
  })
})

describe('majors with entry points (routes)', () => {
  it('checks and plans the route the record points to', async () => {
    const { routeFor, checkCourse } = await import('../src/engine/courseRules')
    const { dataset, subject } = await import('./helpers')
    const major = {
      id: 'lang', course: 'X', year: 2026, kind: 'major', title: 'Language', points: 25, requiresMajor: [], verifiedOn: null,
      requirements: [{ all: ['AAAA20001'] }],
      routes: [
        { title: 'Entry Point 1', requirements: [{ all: ['AAAA20001', 'AAAA20002'] }] },
        { title: 'Entry Point 3', requirements: [{ all: ['AAAA20003', 'AAAA20004'] }] },
      ],
    } as never
    expect(routeFor(major, [])).toEqual([{ all: ['AAAA20001', 'AAAA20002'] }])
    expect(routeFor(major, ['AAAA20003'])).toEqual([{ all: ['AAAA20003', 'AAAA20004'] }])
    const data = dataset(['AAAA20001', 'AAAA20002', 'AAAA20003', 'AAAA20004'].map((code) => subject({ code, prerequisites: 'none' })))
    data.components.push(major)
    data.courses.push({ code: 'X', title: 'X', year: 2026, totalPoints: 25, standardLoad: 50, categories: [], closed: [], listed: true, rules: [{ id: 'major', kind: 'major', count: 1, description: 'A major' }] } as never)
    const check = (codes: string[]) => checkCourse({ course: 'X', courseYear: 2026, major: 'lang', completed: codes, terms: [] } as never, data).statuses.find((s) => s.ruleId === 'major')?.status
    expect(check(['AAAA20003', 'AAAA20004'])).toBe('ok')
    expect(check(['AAAA20001'])).toBe('fail')
  })

  it('counts no more than a limit allows from a pool across the whole major', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const { dataset, subject } = await import('./helpers')
    // Two electives, each French or "other" (EURO), but only one "other" in all.
    const major = {
      id: 'fren', course: 'X', year: 2026, kind: 'major', title: 'French', points: 25, requiresMajor: [], verifiedOn: null,
      requirements: [{ choose: { points: 12.5, from: ['FREN20001', 'EURO20001', 'EURO20002'] } }, { choose: { points: 12.5, from: ['FREN30001', 'EURO30001'] } }],
      limits: [{ max: 12.5, from: ['EURO20001', 'EURO20002', 'EURO30001'] }],
    } as never
    const data = dataset(['FREN20001', 'EURO20001', 'EURO20002', 'FREN30001', 'EURO30001'].map((code) => subject({ code, prerequisites: 'none' })))
    data.components.push(major)
    data.courses.push({ code: 'X', title: 'X', year: 2026, totalPoints: 25, standardLoad: 50, categories: [], closed: [], listed: true, rules: [{ id: 'major', kind: 'major', count: 1, description: 'A major' }] } as never)
    const check = (codes: string[]) => checkCourse({ course: 'X', courseYear: 2026, major: 'fren', completed: codes, terms: [] } as never, data).statuses.find((s) => s.ruleId === 'major')?.status
    expect(check(['EURO20001', 'FREN30001'])).toBe('ok')
    expect(check(['EURO20001', 'EURO30001'])).toBe('fail')
  })
})

describe('rule fixes from the second review', () => {
  it('a year-long level-1 subject started in Semester 1 is not finished before a level-2 subject that Semester 2', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const real = realData()
    const data = { ...real, subjects: { ...real.subjects, MAST10006: { ...real.subjects.MAST10006!, yearLong: true } } }
    const plan = {
      course: 'B-SCI',
      courseYear: 2026,
      completed: [],
      terms: [
        { year: 2027, period: 'semester-1', subjects: ['MAST10006', 'MAST10007', 'BIOL10008', 'CHEM10003'] },
        { year: 2027, period: 'semester-2', subjects: ['MAST20009'] },
      ],
    } as never
    const status = (d: typeof real) => checkCourse(plan, d).statuses.find((s) => s.ruleId === 'progress-to-l2')
    expect(status(real)?.status).toBe('ok')
    expect(status(data)?.status).toBe('fail')
    expect(status(data)?.params.have).toBe(37.5)
  })

  it('an unknown subject above level 1 cannot add a level-1 area', async () => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const real = realData()
    const check = (code: string) =>
      checkCourse({ course: 'B-SCI', courseYear: 2026, completed: ['MAST10006', code], terms: [] } as never, real).statuses.find((s) => s.ruleId === 'level1-areas')?.status
    expect(check('ZZZZ20001')).toBe('fail')
    expect(check('ZZZZ10001')).toBe('unknown')
  })

  it('a course year with no version of its own uses the nearest earlier version', async () => {
    const { findCourse } = await import('../src/engine/courseRules')
    const v = (year: number) => ({ code: 'X', year }) as never
    const data = { courses: [v(2024), v(2026), v(2028)] } as never
    expect(findCourse(data, 'X', 2027)?.year).toBe(2026)
    expect(findCourse(data, 'X', 2026)?.year).toBe(2026)
    expect(findCourse(data, 'X', 2030)?.year).toBe(2028)
    expect(findCourse(data, 'X', 2020)?.year).toBe(2024)
    expect(findCourse(data, 'Y', 2026)).toBeUndefined()
  })
})
