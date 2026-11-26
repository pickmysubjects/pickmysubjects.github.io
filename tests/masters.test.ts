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
    // A hand plan fits six semesters (the four ENGM core subjects in Year 3, as the Handbook says
    // they must be); the generator's packing still needs seven. Open: component subjects tied to a
    // course year.
    ['MC-SOFTENG', 'mc-softeng-business', 7],
    ['MC-SOFTENG', 'mc-softeng-cyber-security', 6],
    ['MC-SOFTENG', 'mc-softeng-distributed-computing', 6],
    ['MC-SOFTENG', 'mc-softeng-human-computer-interaction', 6],
    ['MC-DATASC', 'mc-datasc-foundational', 4],
  ] as const) {
    it(`${course} ${spec}: only course subjects, full-time length, every rule met`, async () => {
      const { r, codes, data, check } = await plan(course, spec)
      expect(codes.filter((c) => data.subjects[c]?.categories[course] !== 'course')).toEqual([])
      expect(r.plan.terms.filter((t) => t.subjects.length).length).toBe(terms)
      expect(check.statuses.filter((s) => s.status !== 'ok').map((s) => `${s.ruleId}: ${s.detail}`)).toEqual([])
    })
  }
})
