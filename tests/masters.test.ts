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
