import { describe, expect, it } from 'vitest'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import type { Plan } from '../src/engine/plan'
import type { Profile } from '../src/engine/recommend'
import type { Dataset } from '../src/engine/schema'
import { demo } from './helpers'

const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }

/** The demo data with the Data Science major barring EXEC subjects (bar `except`) and `subjects` as breadth. */
function barred(except: string[] = ['EXEC20001'], subjects = ['EXMG10001']): Dataset {
  const d = demo()
  return {
    ...d,
    components: d.components.map((c) =>
      c.id === 'ex-data-science' ? { ...c, nonAllowedBreadth: { subjects, areas: ['EXEC'], except } } : c,
    ),
  }
}

function plan(major: string, terms: string[][]): Plan {
  return {
    course: 'EX-SCI',
    courseYear: 2026,
    major,
    completed: [],
    terms: terms.map((subjects, i) => ({ year: 2026 + Math.floor(i / 2), period: i % 2 ? 'semester-2' : 'semester-1', subjects })),
  } as Plan
}

const breadth = (data: Dataset, p: Plan) => checkCourse(p, data).statuses.find((s) => s.ruleId === 'breadth')!.params.have
const total = (data: Dataset, p: Plan) => checkCourse(p, data).statuses.find((s) => s.ruleId === 'total')!.params.have

describe('non-allowed breadth', () => {
  const data = barred()
  const subjects = [['EXEC10001', 'EXEC20001', 'EXMG10001', 'EXAR10001']]

  it("doesn't count a barred subject as breadth for that major, but does for another", () => {
    const mine = plan('ex-data-science', subjects)
    // EXEC20001 is the exception, EXAR10001 isn't listed: only those two count.
    expect(breadth(data, mine)).toBe(25)
    expect(total(data, mine)).toBe(50)
    const info = checkCourse(mine, data).issues.filter((i) => i.kind === 'breadth-not-allowed')
    expect(info.map((i) => i.subject).sort()).toEqual(['EXEC10001', 'EXMG10001'])
    expect(info.every((i) => i.severity === 'info' && i.params.major === data.components.find((c) => c.id === 'ex-data-science')!.title)).toBe(true)

    const other = plan('ex-computing', subjects)
    expect(breadth(data, other)).toBe(50)
    expect(checkCourse(other, data).issues.some((i) => i.kind === 'breadth-not-allowed')).toBe(false)
  })

  it('never picks a barred subject to fill breadth, and still meets breadth', () => {
    const data = barred([], [])
    const { plan: p, notes } = generatePlan({ data, profile, course: 'EX-SCI', courseYear: 2026, major: 'ex-data-science', startYear: 2026, startPeriod: 'semester-1' })
    // It may still be taken as a free elective towards the total, never for breadth.
    const forBreadth = notes.filter((n) => n.key === 'added' && String(n.params.rule).startsWith('breadth')).map((n) => String(n.params.code))
    expect(forBreadth.length).toBeGreaterThan(0)
    expect(forBreadth.filter((c) => c.startsWith('EXEC'))).toEqual([])
    expect(checkCourse(p, data).statuses.find((s) => s.ruleId === 'breadth')!.status).toBe('ok')
  })
})
