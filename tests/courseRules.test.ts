import { describe, expect, it } from 'vitest'

describe('rule fixes from the code review', () => {
  it('first-semester rule skips a summer term in front; points never count a subject twice', async () => {
    const { buildDataset } = await import('../scripts/dataset')
    const { checkCourse } = await import('../src/engine/courseRules')
    const { dataset: real } = buildDataset('real')
    const plan = (terms: { year: number; period: string; subjects: string[] }[], completed: string[] = []) =>
      ({ course: 'B-SCI', courseYear: 2026, completed, terms }) as never
    const first = checkCourse(plan([{ year: 2026, period: 'summer', subjects: [] }, { year: 2026, period: 'semester-1', subjects: ['SCIE10005'] }]), real)
    expect(first.statuses.find((s) => s.ruleId === 'scie10005')?.status).toBe('ok')
    const twice = checkCourse(plan([{ year: 2026, period: 'semester-1', subjects: ['MAST10006'] }], ['MAST10006']), real)
    expect(twice.statuses.find((s) => s.ruleId === 'total')?.detail).toMatch(/^12\.5 /)
  })

  it('a condition naming a major in the course is not met just by being in the course', async () => {
    const { buildDataset } = await import('../scripts/dataset')
    const { evaluateField } = await import('../src/engine/expr')
    const { dataset: real } = buildDataset('real')
    const s = real.subjects.BMEN30008!
    const r = evaluateField(s.prerequisites, { completed: new Set(['BMEN30006']), subjects: real.subjects, admittedCourse: 'B-SCI' })
    expect(r.status).not.toBe('ok')
  })

  it('a subject not in our data counts 12.5 towards the total, and only its own level elsewhere', async () => {
    const { buildDataset } = await import('../scripts/dataset')
    const { checkCourse } = await import('../src/engine/courseRules')
    const { dataset: real } = buildDataset('real')
    const code = 'ZZZZ20001' // level 2, not in the data
    const r = checkCourse({ course: 'B-SCI', courseYear: 2026, completed: ['MAST10006', code], terms: [] } as never, real)
    expect(r.statuses.find((s) => s.ruleId === 'total')?.detail).toMatch(/^25 /)
    // A level-2 unknown can't touch level-1 rules: they're decided, not "unknown".
    expect(r.statuses.find((s) => s.ruleId === 'breadth-l1-cap')?.status).toBe('ok')
    expect(r.statuses.find((s) => s.ruleId === 'science-l1')?.status).toBe('fail')
  })
})
