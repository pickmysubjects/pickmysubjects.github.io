import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { careerGap, careerGoal } from '../src/engine/careerGoal'
import { checkCourse, findCourse, withinCaps } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import type { Plan } from '../src/engine/plan'
import { relieveTerm } from '../src/engine/relieve'
import { recommend, type Exclusion, type Profile, type RecommendOptions } from '../src/engine/recommend'
import { cleanPlans, cleanProfile } from '../src/utils/sanitize'
import { reasonText } from '../src/i18n/format'
import { interpolate, type Params } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhTW } from '../src/i18n/messages/zh-TW'

const real = realData()

function translator(messages: unknown) {
  return (key: string, params?: Params) => {
    let node: unknown = messages
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
    if (typeof node !== 'string') throw new Error(`missing ${key}`)
    return interpolate(node, params)
  }
}

const marked = (codes: string[], mark = 72) => codes.map((code) => ({ code, mark }))
// An accounting student who has done first and second year (no law yet).
const accounting: Profile = {
  results: marked(['ACCT10001', 'ACCT10002', 'ECON10004', 'ECON10005', 'FNCE10002', 'MGMT10002', 'BUSA10001', 'ECON10003', 'ACCT20001', 'ACCT20002', 'FNCE20005', 'MKTG20001']),
  skills: {},
  interests: [],
  goal: 'balanced',
}
const accOpts: RecommendOptions = { course: 'B-COM', maxLevel: 3, programme: { courseYear: 2025, components: ['accounting'], minors: [] } }
const software: Profile = { results: marked(['COMP10001', 'COMP10002', 'MAST10006', 'MAST10007', 'SWEN20003', 'COMP20003', 'INFO20003'], 75), skills: { programming: 4 }, interests: ['machine-learning'], goal: 'wam' }
const swOpts: RecommendOptions = { course: 'B-SCI', maxLevel: 3, programme: { courseYear: 2025, components: ['computing-and-software-systems'], minors: [] } }

describe('career goal: none set', () => {
  it('leaves recommend() exactly as it was (no goal, a cleared goal, an unknown id)', () => {
    for (const [p, o] of [[accounting, accOpts], [software, swOpts], [{ ...software, goal: 'challenge' as const }, {}]] as const) {
      const base = JSON.stringify(recommend(real, p, o))
      expect(base).not.toContain('career')
      expect(JSON.stringify(recommend(real, { ...p, career: undefined }, o))).toBe(base)
      expect(JSON.stringify(recommend(real, { ...p, career: 'no-such-career' }, o))).toBe(base)
    }
  })
})

describe('career goal: accountant', () => {
  const skipped = new Map<string, Exclusion>()
  const recs = recommend(real, { ...accounting, career: 'accountant' }, { ...accOpts, skipped })
  const top = recs.slice(0, 12)

  it('puts the route’s missing required subjects and required breadth near the top, where the student can take them', () => {
    for (const code of ['ACCT30002', 'ACCT30004']) {
      if (skipped.has(code)) continue
      expect(top.map((r) => r.code), code).toContain(code)
    }
    expect(top.some((r) => ['BLAW10001', 'BLAW20001', 'BLAW30002'].includes(r.code))).toBe(true)
    // ACCT30004 needs the major's core ACCT30001 first; once that's planned it comes up too.
    expect(skipped.get('ACCT30004')?.key).toBe('needsFirst')
    const next = recommend(real, { ...accounting, career: 'accountant' }, { ...accOpts, planned: ['ACCT30001'] }).slice(0, 12)
    expect(next.map((r) => r.code)).toEqual(expect.arrayContaining(['ACCT30002', 'ACCT30004']))
    const req = recs.find((r) => r.code === 'ACCT30002')!
    expect(req.reasons.map((n) => n.key).slice(0, 2)).toEqual(['majorOption', 'careerRequired'])
    expect(req.factors!.find((f) => f.key === 'career')!.effect).toBeGreaterThan(recs.find((r) => r.reasons.some((n) => n.key === 'careerHelps'))!.factors!.find((f) => f.key === 'career')!.effect)
  })

  it('never marks down a subject that isn’t related, and only boosts what keeps the plan within its caps', () => {
    const before = new Map(recommend(real, accounting, accOpts).map((r) => [r.code, r.score]))
    const course = findCourse(real, 'B-COM', 2025)!
    const taken = accounting.results.map((r) => r.code)
    for (const r of recs) {
      expect(r.score, r.code).toBeGreaterThanOrEqual(before.get(r.code)!)
      if (r.factors?.some((f) => f.key === 'career')) expect(withinCaps(real.subjects[r.code]!, taken, course, real, ['accounting']), r.code).toBe(true)
    }
  })

  it('gives breadth no career nudge once the plan’s breadth is full', () => {
    // 62.5 points of breadth already planned: the course allows no more.
    const breadth = Object.values(real.subjects).filter((s) => s.categories['B-COM'] === 'breadth' && !s.code.startsWith('BLAW') && s.points === 12.5 && s.level === 2).slice(0, 5).map((s) => s.code)
    const full = recommend(real, { ...accounting, career: 'accountant' }, { ...accOpts, planned: breadth })
    for (const r of full) if (real.subjects[r.code]?.categories['B-COM'] === 'breadth') expect(r.factors?.some((f) => f.key === 'career'), r.code).toBeFalsy()
  })

  it('says why in the reader’s language, with the career’s own name', () => {
    const req = recs.find((r) => r.code === 'ACCT30002')!.reasons.find((n) => n.key === 'careerRequired')!
    expect(reasonText(translator(en), req)).toMatch(/^Required for CPA Australia .* accreditation \(Accountant\)\.$/)
    expect(reasonText(translator(zhTW), req)).toContain('會計')
  })
})

describe('career goal: software engineer (no accreditation list)', () => {
  it('nudges the subjects whose field is the job’s', () => {
    const recs = recommend(real, { ...software, career: 'software-engineer' }, swOpts)
    const helped = recs.filter((r) => r.reasons.some((n) => n.key === 'careerHelps'))
    expect(helped.length).toBeGreaterThan(0)
    expect(recs.some((r) => r.reasons.some((n) => n.key === 'careerRequired'))).toBe(false)
  })
})

describe('the plan’s reminder', () => {
  it('lists what the route still needs, leaving out what the plan has or already warns about', () => {
    const goal = careerGoal(real, 'accountant', ['accounting'])!
    const gap = careerGap(real, goal, new Set(['ECON10003', 'ACCT30002', 'BLAW10001']), new Set())
    expect(gap.required).toEqual(['ACCT30004'])
    expect(gap.breadth).toEqual(['BLAW20001', 'BLAW30002'])
    expect(careerGap(real, goal, new Set(), new Set(['ACCT30004'])).required).not.toContain('ACCT30004')
    // Without the career's major there is no route to remind about.
    expect(careerGap(real, careerGoal(real, 'accountant', ['finance'])!, new Set())).toEqual({ required: [], breadth: [] })
  })
})

describe('saved goal', () => {
  it('keeps a career id per plan and drops anything else', () => {
    expect(cleanProfile({ career: 'accountant' }).career).toBe('accountant')
    expect(cleanProfile({ career: '<script>' }).career).toBeUndefined()
    const book = cleanPlans({ x: { active: 'p1', plans: [{ id: 'p1', label: 'A', setup: { course: 'B-COM' }, terms: [], prefs: { goal: 'wam', career: 'accountant' } }] } })
    expect(book.x!.plans[0]!.prefs!.career).toBe('accountant')
  })
})

describe('career goal: not counted twice', () => {
  const first = { ...accounting, results: accounting.results.filter((r) => !['ACCT20001', 'ACCT20002', 'FNCE20005', 'MKTG20001'].includes(r.code)) }
  const o: RecommendOptions = { ...accOpts, maxLevel: 2 }
  const factor = (p: Profile, code: string) => recommend(real, p, o).find((r) => r.code === code)?.factors?.find((f) => f.key === 'career')?.effect
  it('gives a subject the major makes compulsory no career nudge on top of the major’s (the reason still says it)', () => {
    const rec = recommend(real, { ...first, career: 'accountant' }, o).find((r) => r.code === 'ACCT20002')!
    expect(rec.reasons.map((n) => n.key)).toContain('careerHelps')
    expect(rec.factors?.some((f) => f.key === 'career')).toBe(false)
    // A choice in the major still gets it: the goal is what tells the choices apart.
    expect(factor({ ...first, career: 'accountant' }, 'ACCT20001')).toBe(4)
  })
  it('gives no field nudge when every field it covers is already one of the student’s interests', () => {
    expect(factor({ ...first, career: 'accountant', interests: ['accounting'] }, 'ACCT20001')).toBeUndefined()
    // A route subject is more than an interest: it keeps its nudge.
    expect(factor({ ...first, career: 'accountant', interests: ['accounting'] }, 'BLAW10001')).toBe(12)
  })
  it('puts a route subject above unrelated breadth that only scores on ease', () => {
    const recs = recommend(real, { results: [], skills: {}, interests: [], goal: 'balanced', career: 'accountant' }, { course: 'B-COM', category: 'breadth', level: 1, term: { year: 2027, period: 'semester-1' }, goalComponents: ['accounting'], eligibleWith: [] })
    expect(recs[0]!.code).toBe('BLAW10001')
  })
})

describe('career goal in the plan builder and the heavy-term fix', () => {
  const route = ['ECON10003', 'ACCT30002', 'ACCT30004', 'BLAW10001', 'BLAW20001', 'BLAW30002']
  const build = (career?: string) =>
    generatePlan({ data: real, profile: { results: [], skills: {}, interests: [], goal: 'balanced', ...(career ? { career } : {}) }, course: 'B-COM', courseYear: 2026, major: 'accounting', startYear: 2027, startPeriod: 'semester-1' })
  it('plans the accreditation route when the major leads to the goal, and the plan still checks out', () => {
    const { plan } = build('accountant')
    const codes = plan.terms.flatMap((t) => t.subjects)
    expect(codes).toEqual(expect.arrayContaining(route))
    const unmet = (p: Plan) => checkCourse(p, real).statuses.filter((r) => r.status !== 'ok').map((r) => r.ruleId)
    expect(unmet(plan)).toEqual(unmet(build().plan))
    expect(checkTerms(plan, real).filter((i) => i.severity === 'error')).toEqual([])
  })
  it('never swaps a subject the route needs for one it doesn’t', () => {
    const plan: Plan = { course: 'B-COM', courseYear: 2026, major: 'accounting', minors: [], completed: [], terms: [{ year: 2027, period: 'semester-1', subjects: ['BLAW10001', 'ACCT20001', 'ACCT20002', 'FNCE20005'] }, { year: 2027, period: 'semester-2', subjects: [] }] }
    const student: Profile = { results: [], skills: { writing: 1 }, interests: [], goal: 'balanced' }
    expect(relieveTerm(plan, real, 0, student)).toMatchObject({ kind: 'replace', code: 'BLAW10001' })
    const r = relieveTerm(plan, real, 0, { ...student, career: 'accountant' })
    if (r && r.kind === 'replace') expect(r.code).not.toBe('BLAW10001')
  })
})
