import { beforeAll, describe, expect, it } from 'vitest'
import { provideDataset } from '../src/composables/useDataset'
import { usePlan } from '../src/composables/usePlan'
import { useProfile } from '../src/composables/useProfile'
import { checkCourse, checkTerms, computeWam, generatePlan, recordedLoads, VISA_HALF_YEAR_LOAD, type Credit, type Plan, type Profile } from '../src/engine'
import { cleanPlans, cleanProfile } from '../src/utils/sanitize'
import { pointsLeft } from '../src/utils/wamGoal'
import { realData } from './realData'

// Credit for study elsewhere (TAFE, another university, Trinity College Foundation), and a
// part-time load: both change how many points are left and how the plan is spread.
const data = realData()
beforeAll(() => provideDataset(data))
const empty: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
const pts = (cs: string[]) => cs.reduce((s, c) => s + (data.subjects[c]?.points ?? 12.5), 0)
const sci = { data, course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', startYear: 2027, startPeriod: 'semester-1' as const }
const unmet = (p: Plan) => checkCourse(p, data).statuses.filter((s) => s.status !== 'ok').map((s) => s.ruleId)
const semesters = (p: Plan) => p.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2')

describe('credit for study elsewhere', () => {
  const credit: Credit[] = [{ points: 50, level: 1, category: 'science', label: 'TAFE Diploma' }]

  it('plans 250 points around 50 points of level-1 science credit, with every rule met', () => {
    const profile = { ...empty, credit }
    const { plan } = generatePlan({ ...sci, profile })
    const planned = plan.terms.flatMap((t) => t.subjects)
    expect(pts(planned)).toBe(250)
    // The plan keeps the credit as credit, not as made-up subjects.
    expect(plan.completed).toEqual([])
    expect(plan.credit).toEqual(credit)
    expect(unmet(plan)).toEqual([])
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
    // Level 1 is capped at 125 points: the credit's 50 leave 75 to plan.
    expect(pts(planned.filter((c) => data.subjects[c]!.level === 1))).toBeLessThanOrEqual(75)
    // Without the credit the same plan falls 50 points (and the level-1 science) short.
    expect(unmet({ ...plan, credit: undefined })).toEqual(expect.arrayContaining(['total', 'science-l1']))
  })

  it('meets a points prerequisite ("50 points at level 2") on the plan board, as the plan builder counts it', () => {
    // PHYC30025 needs 50 points of level 2, in any area: level-2 credit is exactly that.
    const plan: Plan = { course: 'B-SCI', courseYear: 2026, completed: [], credit: [{ points: 50, level: 2 }], terms: [{ year: 2027, period: 'semester-1', subjects: ['PHYC30025'] }] }
    expect(checkTerms(plan, data).filter((i) => i.kind === 'prereq-unmet')).toEqual([])
    expect(checkTerms({ ...plan, credit: undefined }, data).filter((i) => i.kind === 'prereq-unmet')).toHaveLength(1)
  })

  it('counts towards points, level and category rules, but no area', () => {
    const plan: Plan = { course: 'B-SCI', courseYear: 2026, completed: [], terms: [], credit }
    const status = (pick: (r: { kind: string; level?: number; category?: string }) => boolean) => {
      const rule = data.courses.find((c) => c.code === 'B-SCI')!.rules.find((r) => pick(r as never))!
      return checkCourse(plan, data).statuses.find((s) => s.ruleId === rule.id)!
    }
    expect(status((r) => r.kind === 'points' && r.level === undefined && r.category === undefined).params.have).toBe(50)
    expect(status((r) => r.kind === 'points' && r.level === 1 && r.category === 'science').params.have).toBe(50)
    expect(status((r) => r.kind === 'points' && r.level === undefined && r.category === 'breadth').params.have).toBe(0)
    // Level-1 science must come from two areas: credit is in none, so it adds none.
    expect(status((r) => r.kind === 'level1-areas').params.count).toBe(0)
  })

  it('credit with no category counts in the total and its level, and leaves category rules open', () => {
    const plan: Plan = { course: 'B-SCI', courseYear: 2026, completed: [], terms: [], credit: [{ points: 25, level: 2 }] }
    const statuses = checkCourse(plan, data).statuses
    const rules = data.courses.find((c) => c.code === 'B-SCI')!.rules
    const of = (pick: (r: (typeof rules)[number]) => boolean) => statuses.find((s) => s.ruleId === rules.find(pick)!.id)!
    expect(of((r) => r.kind === 'points' && r.level === undefined && r.category === undefined).params.have).toBe(25)
    expect(of((r) => r.kind === 'points' && r.level === 2 && r.category === 'science').params.uncategorised).toBe(25)
  })

  it('is never in the WAM; the WAM goal counts it as points done', () => {
    const results: Profile['results'] = [
      { code: 'COMP10001', mark: 80 },
      { code: 'MAST10006', credit: true },
    ]
    expect(computeWam(results, data)).toBe(80)
    // 300 − 12.5 marked − 12.5 specified credit − 50 unspecified credit.
    expect(pointsLeft(results, data, 300, credit)).toBe(225)
    expect(pointsLeft(results, data, 300)).toBe(275)
  })

  it('a specified credit (a named subject) is planned around like a passed one', () => {
    const profile: Profile = { ...empty, results: [{ code: 'COMP10001', credit: true }] }
    const { plan } = generatePlan({ ...sci, profile })
    expect(plan.terms.flatMap((t) => t.subjects)).not.toContain('COMP10001')
    expect(pts(plan.terms.flatMap((t) => t.subjects))).toBe(287.5)
  })

  it('old profiles load as before; bad credit is dropped, a mark on credit too', () => {
    const old = cleanProfile({ results: [{ code: 'COMP10001', mark: 70 }], skills: {}, interests: [], goal: 'wam' })
    expect(old.credit).toBeUndefined()
    expect(old.results).toEqual([{ code: 'COMP10001', mark: 70 }])
    const p = cleanProfile({
      results: [{ code: 'MAST10006', credit: true, mark: 90, failed: true }],
      credit: [credit[0], { points: 13, level: 1 }, { points: 25, level: 4 }, { points: 25, level: 2, category: 'Not A Category!' }, 'x'],
    })
    expect(p.results).toEqual([{ code: 'MAST10006', credit: true }])
    expect(p.credit).toEqual([credit[0], { points: 25, level: 2 }])
  })
})

describe('part-time load', () => {
  it('B-SCI at 25 points a semester takes about twice the semesters, every rule met', () => {
    const full = generatePlan({ ...sci, profile: empty }).plan
    const part = generatePlan({ ...sci, profile: empty, load: 25 }).plan
    expect(semesters(full).length).toBe(6)
    expect(semesters(part).length).toBeGreaterThanOrEqual(11)
    expect(semesters(part).length).toBeLessThanOrEqual(13)
    expect(pts(part.terms.flatMap((t) => t.subjects))).toBe(300)
    expect(unmet(part)).toEqual([])
    const issues = checkTerms({ ...part, load: 25 }, data)
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
    // No semester above the chosen 25 points.
    expect(issues.filter((i) => i.kind === 'above-load' || i.kind === 'overload')).toEqual([])
  })

  it('37.5 a semester: a plan in between', () => {
    const part = generatePlan({ ...sci, profile: empty, load: 37.5 }).plan
    expect(semesters(part).length).toBeGreaterThanOrEqual(8)
    expect(semesters(part).length).toBeLessThanOrEqual(9)
    expect(unmet(part)).toEqual([])
  })

  it('more than the chosen load is said (not an overload, which is past the standard 50)', () => {
    const plan: Plan = { course: 'B-SCI', courseYear: 2026, completed: [], load: 25, terms: [{ year: 2027, period: 'semester-1', subjects: ['COMP10001', 'MAST10006', 'CHEM10003'] }] }
    const issues = checkTerms(plan, data)
    expect(issues.find((i) => i.kind === 'above-load')).toMatchObject({ severity: 'info', params: { load: 37.5, chosen: 25 } })
    expect(issues.some((i) => i.kind === 'overload')).toBe(false)
  })

  it('international at 37.5: one visa warning for the plan, not one per half-year', () => {
    const plan = generatePlan({ ...sci, profile: empty, load: 37.5 }).plan
    const issues = checkTerms({ ...plan, international: true, load: 37.5, recordedLoad: recordedLoads([], data) }, data)
    const visa = issues.filter((i) => i.kind.startsWith('visa-'))
    expect(visa.filter((i) => i.kind === 'visa-reduced-load')).toEqual([expect.objectContaining({ severity: 'warning', params: { load: 37.5, min: VISA_HALF_YEAR_LOAD } })])
    expect(visa.filter((i) => i.kind.startsWith('visa-underload'))).toEqual([])
    // Full-time: no such warning.
    const fullPlan = generatePlan({ ...sci, profile: empty }).plan
    expect(checkTerms({ ...fullPlan, international: true }, data).some((i) => i.kind.startsWith('visa-'))).toBe(false)
  })

  it('a saved part-time load survives; anything else is dropped', () => {
    const state = (load: unknown) => ({ real: { active: 'a', plans: [{ id: 'a', label: 'A', setup: { course: 'B-SCI', load }, terms: [], notes: [], unplaced: [] }] } })
    expect(cleanPlans(state(25)).real!.plans[0]!.setup.load).toBe(25)
    expect(cleanPlans(state(37.5)).real!.plans[0]!.setup.load).toBe(37.5)
    expect(cleanPlans(state(50)).real!.plans[0]!.setup.load).toBeUndefined()
    expect(cleanPlans(state(30)).real!.plans[0]!.setup.load).toBeUndefined()
    expect(cleanPlans(state(undefined)).real!.plans[0]!.setup).not.toHaveProperty('load')
  })
})

describe('in the app: My record and the plan questions', () => {
  it('credit on the record and a part-time load reach the plan, its checks and the WAM goal', () => {
    const { setCredit, profile } = useProfile()
    setCredit([{ points: 50, level: 1, category: 'science' }])
    const plan = usePlan()
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', courseYear: 2026, major: 'computing-and-software-systems', specialisation: '', startYear: 2027, startPeriod: 'semester-1', international: true, load: 25 })
    plan.generate()
    expect(plan.load.value).toBe(25)
    expect(plan.plan.value.credit).toEqual(profile.value.credit)
    expect(pts(plan.terms.value.flatMap((t) => t.subjects))).toBe(250)
    expect(semesters(plan.plan.value).length).toBeGreaterThanOrEqual(9)
    expect(plan.courseCheck.value.statuses.filter((s) => s.status === 'fail')).toEqual([])
    expect(plan.termIssues.value.filter((i) => i.kind === 'visa-reduced-load')).toHaveLength(1)
    expect(pointsLeft(profile.value.results, data, 300, profile.value.credit)).toBe(250)
    setCredit([])
    expect(profile.value.credit).toBeUndefined()
  })
})
