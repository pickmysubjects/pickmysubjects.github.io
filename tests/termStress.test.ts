import { describe, expect, it } from 'vitest'
import { calibrateCutoffs, termStress } from '../src/engine/termStress'
import type { Profile } from '../src/engine/recommend'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

const profile = (p: Partial<Profile> = {}): Profile => ({ results: [], skills: {}, interests: [], goal: 'balanced', ...p })
const tasks = (exam: number) => [
  { kind: 'exam', weight: exam },
  { kind: 'assignment', weight: 100 - exam },
]

describe('termStress', () => {
  const plain = (code: string, area: string) =>
    subject({ code, area, prerequisites: 'none', assessment: tasks(50), weekly_contact_hours: 3.5 })
  const data = dataset([plain('MAST10006', 'MAST'), plain('MAST10007', 'MAST'), plain('MAST10005', 'MAST'), plain('BIOL10008', 'BIOL'), plain('HIST10001', 'HIST')])
  const calcAndAlgebra = ['MAST10006', 'MAST10007', 'BIOL10008', 'HIST10001']

  it('two maths subjects for someone who rated maths weak is a heavy term, and says why', () => {
    const s = termStress(calcAndAlgebra, data, profile({ skills: { maths: 2 } }))
    expect(s.level).toBe('heavy')
    expect(s.reasons[0]).toMatchObject({ key: 'stackWeak', params: { skill: 'maths', codes: 'MAST10006, MAST10007', n: 2 } })
  })

  it('three subjects on a weak skill is very heavy', () => {
    expect(termStress(['MAST10005', 'MAST10006', 'MAST10007', 'BIOL10008'], data, profile({ skills: { maths: 1 } })).level).toBe('veryHeavy')
  })

  it('the same pair for someone strong at maths raises nothing', () => {
    expect(termStress(calcAndAlgebra, data, profile({ skills: { maths: 5 } }))).toMatchObject({ level: 'ok', reasons: [] })
  })

  it('without a self-rating, low past maths marks count as a weakness', () => {
    const s = termStress(calcAndAlgebra, data, profile({ results: [{ code: 'MAST10005', mark: 58 }] }))
    expect(s.level).toBe('heavy')
    expect(s.reasons[0]).toMatchObject({ key: 'stackMarks', params: { mark: 58 } })
  })

  it('knowing nothing about the student, two maths subjects is normal and three is a gentle note', () => {
    expect(termStress(calcAndAlgebra, data)).toMatchObject({ level: 'ok', reasons: [] })
    const three = termStress(['MAST10005', 'MAST10006', 'MAST10007', 'BIOL10008'], data)
    expect(three.reasons.map((r) => r.key)).toEqual(['stack'])
  })

  it('adds up the whole semester: long hours, hard subjects and big finals', () => {
    const four = ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004']
    const busy = dataset(
      four.map((code) => subject({ code, prerequisites: 'none', assessment: tasks(75), weekly_contact_hours: 6, signals: { reviews: 5, workload: 4.5, difficulty: 4.5 } })),
    )
    const s = termStress(four, busy)
    expect(s.level).toBe('veryHeavy')
    expect(s.reasons.map((r) => r.key).sort()).toEqual(['effort', 'exams', 'time'])
    const calm = dataset(four.map((code) => subject({ code, prerequisites: 'none', assessment: tasks(40), weekly_contact_hours: 3 })))
    expect(termStress(four, calm)).toMatchObject({ level: 'ok', reasons: [] })
  })

  it('ignores ratings from fewer than three students', () => {
    const four = ['AAAA10001', 'AAAA10002', 'AAAA10003', 'AAAA10004']
    const few = dataset(four.map((code) => subject({ code, prerequisites: 'none', assessment: tasks(40), weekly_contact_hours: 3, signals: { reviews: 2, workload: 5, difficulty: 5 } })))
    expect(termStress(four, few).level).toBe('ok')
  })

  it('stays quiet for a part-time semester', () => {
    expect(termStress(['MAST10006', 'MAST10007'], data, profile({ skills: { maths: 1 } })).level).toBe('ok')
  })
})

describe('termStress calibration (real data)', () => {
  const { dataset: real } = buildDataset('real')
  it('keeps the heavy cutoff at or below the very-heavy one, and typical at or below high', () => {
    const cut = calibrateCutoffs(real, [['MAST10006', 'MAST10007', 'BIOL10008', 'CHEM10003'], ['COMP10001', 'MAST10005', 'BIOL10008', 'ACCT10001'], ['PSYC10003', 'BIOL10010', 'CHEM10004', 'MAST10006']])
    expect(cut.heavy).toBeLessThanOrEqual(cut.veryHeavy)
    for (const d of ['time', 'effort', 'stress'] as const) expect(cut.typical[d]).toBeLessThanOrEqual(cut.high[d])
  })
})

describe('plan builder spreads the load (real data)', () => {
  it('keeps very heavy semesters rare across every major', async () => {
    const { generatePlan } = await import('../src/engine/generate')
    const { dataset: real } = buildDataset('real')
    let terms = 0
    let veryHeavy = 0
    for (const m of real.components.filter((c) => c.kind === 'major')) {
      const { plan } = generatePlan({ data: real, profile: profile(), course: 'B-SCI', courseYear: 2026, major: m.id, startYear: 2027, startPeriod: 'semester-1' })
      for (const t of plan.terms.filter((x) => x.subjects.length >= 3)) {
        terms++
        if (termStress(t.subjects, real).level === 'veryHeavy') veryHeavy++
      }
    }
    expect(veryHeavy / terms).toBeLessThan(0.1)
  })
})
