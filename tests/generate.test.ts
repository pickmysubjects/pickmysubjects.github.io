import { describe, expect, it } from 'vitest'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import type { Profile } from '../src/engine/recommend'
import { demo } from './helpers'

const data = demo()
const profile: Profile = {
  results: [],
  skills: { programming: 4, maths: 4, statistics: 3 },
  interests: ['machine-learning', 'ai', 'data-science'],
  goal: 'balanced',
}

function generate(over: Partial<Parameters<typeof generatePlan>[0]> = {}) {
  return generatePlan({
    data,
    profile,
    course: 'EX-SCI',
    courseYear: 2026,
    major: 'ex-data-science',
    startYear: 2026,
    startPeriod: 'semester-1',
    ...over,
  })
}

describe('generatePlan (demo course)', () => {
  it('builds a complete three-year plan with no term errors and every course rule met', () => {
    const { plan, unplaced } = generate()
    expect(unplaced).toEqual([])
    expect(plan.terms).toHaveLength(6)

    const termErrors = checkTerms(plan, data).filter((i) => i.severity === 'error')
    expect(termErrors).toEqual([])

    const { statuses } = checkCourse(plan, data)
    const notOk = statuses.filter((s) => s.status !== 'ok').map((s) => `${s.ruleId}: ${s.detail}`)
    expect(notOk).toEqual([])
  })

  it('puts the compulsory subject in the first semester and respects the load', () => {
    const { plan } = generate()
    expect(plan.terms[0]?.subjects).toContain('EXSC10001')
    for (const t of plan.terms) {
      const pts = t.subjects.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 0), 0)
      expect(pts).toBeLessThanOrEqual(50)
    }
  })

  it('includes the whole major plus the prerequisite chain it needs', () => {
    const { plan } = generate()
    const all = plan.terms.flatMap((t) => t.subjects)
    for (const c of ['EXCS30001', 'EXST30001', 'EXCS20002', 'EXMA10002', 'EXST20001', 'EXST10001']) {
      expect(all).toContain(c)
    }
  })

  it('works for a mid-degree student starting in semester 2', () => {
    const { plan, unplaced } = generate({
      major: 'ex-computing',
      startPeriod: 'semester-2',
      profile: {
        ...profile,
        results: [
          { code: 'EXSC10001', mark: 75 },
          { code: 'EXCS10001', mark: 82 },
          { code: 'EXMA10001', mark: 70 },
          { code: 'EXST10001', mark: 78 },
        ],
      },
    })
    expect(unplaced).toEqual([])
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
    const notOk = checkCourse(plan, data).statuses.filter((s) => s.status !== 'ok').map((s) => s.ruleId)
    expect(notOk).toEqual([])
  })

  it('re-plans a failed subject before the subjects that need it', () => {
    const { plan } = generate({ profile: { ...profile, results: [{ code: 'EXSC10001', mark: 70 }, { code: 'EXCS10001', mark: 40 }] } })
    const termOf = (c: string) => plan.terms.findIndex((t) => t.subjects.includes(c))
    expect(termOf('EXCS10001')).toBeGreaterThanOrEqual(0)
    expect(termOf('EXCS20002')).toBeGreaterThan(termOf('EXCS10001'))
  })

  it('explains what it could not do instead of silently dropping requirements', () => {
    const { notes } = generate({ major: 'no-such-major' })
    expect(notes.join(' ')).toMatch(/no-such-major isn't in the dataset/)
  })
})
