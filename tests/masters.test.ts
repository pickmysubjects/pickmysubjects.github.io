import { describe, expect, it } from 'vitest'
import { realData } from './realData'

// Coursework master's rules (2027 Handbook): one required specialisation per course.
describe("master's course rules", () => {
  const check = async (course: string, specialisation: string | undefined, completed: string[]) => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const r = checkCourse({ course, courseYear: 2027, specialisation, completed, terms: [] } as never, realData())
    return Object.fromEntries(r.statuses.map((s) => [s.ruleId, s.status]))
  }

  const aiFull = [
    'COMP90041', 'COMP90038', 'COMP90007', 'INFO90002', // foundation
    'SWEN90016', 'COMP90049', 'COMP90054', 'COMP90087', // core
    'COMP90042', 'COMP90086', 'COMP90077', 'COMP90051', // selectives
    'COMP90015', 'COMP90024', // CIS electives
    'COMP90055', // capstone
  ]

  it('a complete MC-IT 200-point AI plan passes every rule', async () => {
    const s = await check('MC-IT-200', 'mc-it-200-artificial-intelligence', aiFull)
    expect(s).toEqual({ total: 'ok', specialisation: 'ok' })
  })

  it('the specialisation is required, and too many CIS electives fail it', async () => {
    expect((await check('MC-IT-200', undefined, aiFull)).specialisation).toBe('unknown')
    const tooMany = [...aiFull.filter((c) => c !== 'COMP90051'), 'COMP90057']
    expect((await check('MC-IT-200', 'mc-it-200-artificial-intelligence', tooMany)).specialisation).not.toBe('ok')
  })

  it('MC-DATASC: compulsory subjects, one capstone path and a specialisation', async () => {
    const compulsory = ['MAST90139', 'MAST90138', 'MAST90083', 'COMP90024', 'COMP90050', 'COMP90051']
    const foundational = ['MAST90105', 'MAST90104', 'COMP90041', 'COMP90038', 'COMP20008', 'INFO90002']
    const s = await check('MC-DATASC', 'mc-datasc-foundational', [...compulsory, ...foundational, 'MAST90106', 'MAST90107'])
    expect(s).toEqual({ total: 'ok', compulsory: 'ok', capstone: 'ok', specialisation: 'ok' })
    const noCapstone = await check('MC-DATASC', 'mc-datasc-foundational', [...compulsory, ...foundational])
    expect(noCapstone.capstone).not.toBe('ok')
  })
})

describe("master's plans", () => {
  const plan = async (course: string, specialisation: string) => {
    const { generatePlan } = await import('../src/engine/generate')
    const { checkCourse } = await import('../src/engine/courseRules')
    const data = realData()
    const profile = { results: [], skills: { programming: 4 }, interests: ['ai'], goal: 'balanced' } as never
    const r = generatePlan({ data, profile, course, courseYear: 2027, specialisation, startYear: 2027, startPeriod: 'semester-1' })
    const codes = r.plan.terms.flatMap((t) => t.subjects)
    const check = checkCourse({ ...r.plan, course, courseYear: 2027, specialisation } as never, data)
    return { r, codes, data, check }
  }

  for (const [course, spec, terms] of [
    ['MC-IT-200', 'mc-it-200-artificial-intelligence', 4],
    ['MC-IT-150', 'mc-it-150-cyber-security', 3],
    ['MC-IT-100', 'mc-it-100-artificial-intelligence', 2],
    // HCI in the 100-point program from Semester 1 can't fit two semesters: ISYS90039 runs only in
    // Semester 1 after SWEN90016, COMP30019 and COMP90018 only in Semester 2 (2027 Handbook).
    ['MC-IT-100', 'mc-it-100-human-computer-interaction', 3],
    ['MC-IT-200', 'mc-it-200-no-specialisation', 4],
    ['MC-DATASC', 'mc-datasc-statistical', 4],
    ['MC-DATASC', 'mc-datasc-computational', 4],
    ['MC-SOFTENG', 'mc-softeng-no-specialisation', 6],
    ['MC-SOFTENG', 'mc-softeng-artificial-intelligence', 6],
    // The four ENGM core subjects must be in Year 3 (Handbook): planned there, six semesters.
    ['MC-SOFTENG', 'mc-softeng-business', 6],
    ['MC-SOFTENG', 'mc-softeng-cyber-security', 6],
    ['MC-SOFTENG', 'mc-softeng-distributed-computing', 6],
    ['MC-SOFTENG', 'mc-softeng-human-computer-interaction', 6],
    ['MC-DATASC', 'mc-datasc-foundational', 4],
  ] as const) {
    it(`${course} ${spec}: only course subjects, full-time length, every rule met`, async () => {
      const { r, codes, data, check } = await plan(course, spec)
      expect(codes.filter((c) => data.subjects[c]?.categories[course] === undefined)).toEqual([])
      expect(r.plan.terms.filter((t) => t.subjects.length).length).toBe(terms)
      expect(check.statuses.filter((s) => s.status !== 'ok').map((s) => `${s.ruleId}: ${s.detail}`)).toEqual([])
      // Subjects a specialisation says must be done in a course year are never earlier.
      const comp = data.components.find((c) => c.id === spec)
      const termsWith = r.plan.terms.filter((t) => t.subjects.length && t.period.startsWith('semester'))
      for (const req of comp && comp.requirements !== 'unknown' ? comp.requirements : []) {
        if (!req.year) continue
        for (const c of 'all' in req ? req.all : req.choose.from) {
          const at = termsWith.findIndex((t) => t.subjects.includes(c))
          if (at >= 0) expect(Math.floor(at / 2) + 1, `${c} in year`).toBeGreaterThanOrEqual(req.year)
        }
      }
    })
  }
})

describe('MC-SOFTENG Year 1 Group A and B', () => {
  const base = ['COMP30026', 'INFO20003', 'SWEN20003', 'SWEN30006', 'ENGR90051', 'COMP20007', 'COMP30023', 'SWEN90004', 'SWEN90006', 'SWEN90009', 'SWEN90014', 'SWEN90016', 'SWEN90007', 'SWEN90010', 'SWEN90017', 'SWEN90018']
  const electives = ['COMP90048', 'COMP90049', 'COMP90050', 'COMP90053', 'COMP90054', 'COMP90073']
  const check = async (extra: string[]) => {
    const { checkCourse } = await import('../src/engine/courseRules')
    const r = checkCourse({ course: 'MC-SOFTENG', courseYear: 2027, specialisation: 'mc-softeng-no-specialisation', completed: [...base, ...electives, ...extra], terms: [] } as never, realData())
    return Object.fromEntries(r.statuses.map((s) => [s.ruleId, s.status]))
  }
  it('a Bachelor of Science level-2 subject can be half of the 25 (Group A)', async () => {
    expect(await check(['MAST20005', 'COMP30019'])).toMatchObject({ 'group-ab': 'ok', 'group-b': 'ok' })
  })
  it('at least 12.5 must be Group B, and no more than 25 of the two', async () => {
    expect((await check(['MAST20005', 'MAST20009']))['group-b']).not.toBe('ok')
    expect((await check(['MAST20005', 'COMP30019', 'COMP30024']))['group-ab']).not.toBe('ok')
  })
})

describe('admission to a course entry program', () => {
  const status = async (code: string, course: string) => {
    const { evaluateField } = await import('../src/engine/expr')
    const data = realData()
    return evaluateField(data.subjects[code]!.prerequisites, { completed: new Set(), subjects: data.subjects, admittedCourse: course }).status
  }
  it('a note naming the 100- and 150-point entry points leaves the 200-point program out (COMP90042)', async () => {
    expect(await status('COMP90042', 'MC-IT-150')).toBe('ok')
    expect(await status('COMP90042', 'MC-IT-100')).toBe('ok')
    expect(await status('COMP90042', 'MC-IT-200')).not.toBe('ok')
  })
  it('a note naming the whole course takes every entry program (COMP90041)', async () => {
    for (const c of ['MC-IT-200', 'MC-IT-150', 'MC-IT-100']) expect(await status('COMP90041', c)).toBe('ok')
  })
})
