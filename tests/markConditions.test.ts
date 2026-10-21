import { describe, expect, it } from 'vitest'
import { evaluate } from '../src/engine/expr'
import { computeWam, marksForConditions, recommend, type Profile } from '../src/engine/recommend'
import { checkTerms } from '../src/engine/planCheck'
import { planFor } from '../src/composables/usePlan'
import type { PlanState } from '../src/composables/planStore'
import { dataset, subject } from './helpers'

// A first-year subject and the level-2 one that needs 75 in it (the shape of MUSI10221 → MUSI20201).
const data = dataset([
  subject({ code: 'AAAA10001', area: 'AAAA', offerings: { '2026': ['semester-1', 'semester-2'] } }),
  subject({ code: 'AAAA20001', level: 2, area: 'AAAA', offerings: { '2026': ['semester-1', 'semester-2'] }, prerequisites: { average: { min: 75, from: ['AAAA10001'] } } }),
  subject({ code: 'BBBB10001', area: 'BBBB', offerings: { '2026': ['semester-1'] } }),
])

const profile = (results: Profile['results']): Profile => ({ results, skills: {}, interests: [], goal: 'balanced' })
const failThenPass: Profile['results'] = [
  { code: 'AAAA10001', mark: 45, year: 2026, period: 'semester-1' },
  { code: 'AAAA10001', mark: 82, year: 2026, period: 'semester-2' },
]
const passThenFail = [...failThenPass].reverse()

describe('a retaken subject’s mark, as conditions read it', () => {
  it('is the best attempt, whatever order the attempts were entered in', () => {
    expect(marksForConditions(failThenPass, data)).toEqual({ AAAA10001: 82 })
    expect(marksForConditions(passThenFail, data)).toEqual({ AAAA10001: 82 })
  })

  it('opens the follow-on subject in recommend, either order', () => {
    for (const results of [failThenPass, passThenFail]) {
      const rec = recommend(data, profile(results), { year: 2027 })
      expect(rec.find((r) => r.code === 'AAAA20001')?.eligibility).toBe('ok')
    }
  })

  it('opens it in the planner and the plan check, either order', () => {
    const state: PlanState = {
      setup: { course: 'X', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1', major: '', specialisation: '', minors: [] },
      terms: [{ year: 2027, period: 'semester-1', subjects: ['AAAA20001'] }],
      notes: [],
      unplaced: [],
    }
    for (const results of [failThenPass, passThenFail]) {
      const plan = planFor(state, profile(results), data)
      expect(plan.marks).toEqual({ AAAA10001: 82 })
      expect(checkTerms(plan, data).filter((i) => i.kind === 'prereq-unmet')).toEqual([])
    }
  })
})

describe('average and WAM conditions count the whole marked record', () => {
  const ctx = (completed: string[], marks: Record<string, number>, wam?: number | null) => ({ completed: new Set(completed), subjects: data.subjects, marks, wam })

  it('an average includes a subject failed and never passed', () => {
    // Passed AAAA10001 with 90, failed BBBB10001 with 40: the level-1 average is 65, not 90.
    const rule = { average: { min: 70, levels: [1] } }
    expect(evaluate(rule, ctx(['AAAA10001'], { AAAA10001: 90, BBBB10001: 40 })).status).toBe('fail')
    expect(evaluate(rule, ctx(['AAAA10001'], { AAAA10001: 90 })).status).toBe('ok')
  })

  it('a WAM condition reads the WAM over every attempt, as computeWam does', () => {
    const results = [{ code: 'AAAA10001', mark: 90 }, { code: 'BBBB10001', mark: 40 }]
    const wam = computeWam(results, data)
    expect(wam).toBe(65)
    expect(evaluate({ wam: { min: 70 } }, ctx(['AAAA10001'], marksForConditions(results, data), wam)).status).toBe('fail')
  })
})
