import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { cleanPlans } from '../src/utils/sanitize'
import { addPlan, bookOf, MAX_PLANS, removePlan, renamePlan, switchPlan } from '../src/utils/planBook'
import { alignTimeline, betterOn, careersNotInAll, compareQuery, planProblems, readCompareAddress, summaryLines, wamAboutSame, wamGapSd, type Issue, type PlanFacts, type PlanTerm } from '../src/engine'
import { compareGroups } from '../src/components/compare/compareRows'
import type { ComparedPlan } from '../src/composables/usePlanCompare'
import { compareMoved, parsePath } from '../src/composables/useView'
import { activePlan, books, prefsOf, withPrefs, type PlanState } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'

const state = (course: string, subjects: string[] = []): PlanState => ({
  setup: { course, courseYear: 2026, startYear: 2027, startPeriod: 'semester-1', major: '', specialisation: '', minors: [] },
  terms: [{ year: 2027, period: 'semester-1', subjects }],
  notes: [],
  unplaced: [],
})

describe('saved plans from before there could be several', () => {
  it('the single plan becomes Plan A, with the switched-away degree plans kept on it', () => {
    const old = { real: state('B-SCI', ['COMP10001']), 'real|B-COM': state('B-COM', ['FNCE10002']), demo: state('EX-SCI') }
    const out = cleanPlans(old)
    expect(Object.keys(out).sort()).toEqual(['demo', 'real'])
    const a = activePlan(out.real)!
    expect(a).toMatchObject({ label: 'A', setup: { course: 'B-SCI' }, terms: [{ subjects: ['COMP10001'] }] })
    expect(a.kept?.['B-COM']?.terms[0]?.subjects).toEqual(['FNCE10002'])
    expect(out.demo!.plans).toHaveLength(1)
  })
  it('a lone switched-away plan is kept rather than lost', () => {
    const out = cleanPlans({ 'real|B-COM': state('B-COM', ['FNCE10002']) })
    expect(activePlan(out.real)?.terms[0]?.subjects).toEqual(['FNCE10002'])
  })
  it('the new shape comes back as saved, broken plans dropped and a missing active fixed', () => {
    const book = addPlan(bookOf(state('B-SCI', ['A'])), state('B-COM', ['B']), { skills: { maths: 4 }, interests: ['ai'], goal: 'wam' })
    const saved = JSON.parse(JSON.stringify({ real: { ...book, plans: [...book.plans, { id: 'x', setup: {} }] } }))
    const out = cleanPlans(saved)
    expect(out.real).toEqual(book)
    expect(cleanPlans({ real: { active: 'gone', plans: book.plans } }).real!.active).toBe(book.plans[0]!.id)
  })
  it('a plan saved before plans had their own strengths and goal takes the profile’s', () => {
    const profile = { skills: { maths: 2 }, interests: ['ai'], goal: 'challenge' as const }
    expect(prefsOf(activePlan(cleanPlans({ real: state('B-SCI') }).real), profile)).toEqual(profile)
    expect(prefsOf({ prefs: { skills: {}, interests: [], goal: 'wam' } }, profile).goal).toBe('wam')
  })
})

describe('adding, renaming, switching and deleting plans', () => {
  it('works on the book and keeps its limits', () => {
    let book = bookOf(state('B-SCI', ['A']))
    book = addPlan(book, state('B-SCI', ['B']))
    expect(book.plans.map((p) => p.label)).toEqual(['A', 'B'])
    const b = book.active
    expect(activePlan(book)?.terms[0]?.subjects).toEqual(['B'])
    book = switchPlan(book, 'a')
    expect(book.active).toBe('a')
    expect(switchPlan(book, 'nope')).toBe(book)
    book = renamePlan(book, b, '  Software  ')
    expect(book.plans[1]!.name).toBe('Software')
    expect(renamePlan(book, b, ' ').plans[1]!.name).toBeUndefined()
    for (let i = 0; i < 10; i++) book = addPlan(book, state('B-SCI'))
    expect(book.plans).toHaveLength(MAX_PLANS)
    // Deleting the open plan opens the one before it; the last one can't go.
    book = switchPlan(book, b)
    book = removePlan(book, b)
    expect(book.active).toBe('a')
    expect(book.plans.map((p) => p.label)).toEqual(['A', 'C', 'D', 'E'])
    expect(addPlan(book, state('B-SCI')).plans.at(-1)!.label).toBe('B')
    let one = bookOf(state('B-SCI'))
    one = removePlan(one, 'a')
    expect(one.plans).toHaveLength(1)
  })
})

describe('comparing two plans', () => {
  const t = (year: number, period: PlanTerm['period'], subjects: string[]): PlanTerm => ({ year, period, subjects })
  it('lines every semester up across plans and marks what differs', () => {
    const a = [t(2027, 'semester-1', ['X', 'Y']), t(2027, 'semester-2', ['Z', 'M']), t(2028, 'semester-1', [])]
    const b = [t(2027, 'semester-1', ['X', 'W']), t(2027, 'winter', ['V', 'M']), t(2027, 'semester-2', ['Z'])]
    const pts = (ts: PlanTerm[], i: number) => ts[i]!.subjects.length * 12.5
    const d = alignTimeline([a, b], pts)
    expect(d.rows.map((r) => r.period)).toEqual(['semester-1', 'winter', 'semester-2'])
    expect(d.rows[1]!.cells[0]).toBeNull()
    expect(d.rows[0]!.cells[0]!.chips).toEqual([{ code: 'X', state: 'same' }, { code: 'Y', state: 'only' }])
    expect(d.rows[1]!.cells[1]!.chips[1]).toEqual({ code: 'M', state: 'moved', from: { year: 2027, period: 'semester-2' } })
    expect(d.rows[2]!.same).toBe(false)
    expect([d.differ, d.moved]).toEqual([3, 1])
  })
})

describe('comparing plans: retakes, three plans, careers', () => {
  const t = (year: number, period: PlanTerm['period'], subjects: string[]): PlanTerm => ({ year, period, subjects })
  const pts = (ts: PlanTerm[], i: number) => ts[i]!.subjects.length * 12.5
  it('a subject planned twice is matched copy by copy: the retake the other plan lacks is "only", not "moved"', () => {
    const a = [t(2027, 'semester-1', ['X']), t(2027, 'semester-2', ['X'])]
    const b = [t(2027, 'semester-1', ['X'])]
    const d = alignTimeline([a, b], pts)
    expect(d.rows[0]!.cells[0]!.chips).toEqual([{ code: 'X', state: 'same' }])
    expect(d.rows[1]!.cells[0]!.chips).toEqual([{ code: 'X', state: 'only' }])
    expect([d.differ, d.moved]).toEqual([1, 0])
  })
  it('with three plans, "moved" only when no other plan has it in that semester, and "some" when some do', () => {
    const a = [t(2027, 'semester-1', ['X'])]
    const b = [t(2027, 'semester-1', ['X'])]
    const c = [t(2027, 'semester-2', ['X'])]
    const d = alignTimeline([a, b, c], pts)
    expect(d.rows[0]!.cells[0]!.chips[0]).toEqual({ code: 'X', state: 'some' })
    expect(d.rows[1]!.cells[2]!.chips[0]).toEqual({ code: 'X', state: 'moved', from: { year: 2027, period: 'semester-1' } })
    // The second plan's X was "moved" before (it was only compared with the first one's).
    const e = alignTimeline([c, a, b], pts)
    expect(e.rows[0]!.cells[1]!.chips[0]).toEqual({ code: 'X', state: 'some' })
  })
  it('jobs: "only" when no other plan has it, "not in every plan" when some do; the same jobs in another order are the same', () => {
    const plan = (label: string, careers: string[]) =>
      ({ entry: { label, prefs: { goal: 'wam', interests: [] } }, careers, facts: { rules: { total: 0, failed: 0 }, problems: 0, short: 0, heavy: 0, exams: { known: 0 }, hurdles: 0, wam: null }, statuses: [], rules: [] }) as unknown as ComparedPlan
    const ctx = { t: ((k: string) => k) as never, editLink: () => '', careerName: (id: string) => id }
    const careersRow = (plans: ComparedPlan[]) => compareGroups(plans, ctx).flatMap((g) => g.rows).find((r) => r.id === 'careers')!
    const three = careersRow([plan('A', ['Analyst', 'Actuary']), plan('B', ['Analyst', 'Banker']), plan('C', ['Banker', 'Analyst'])])
    expect(three.cells[0]!.items).toEqual([{ text: 'Analyst' }, { text: 'Actuary', mark: 'only' }])
    expect(three.cells[1]!.items).toEqual([{ text: 'Analyst' }, { text: 'Banker', mark: 'notAll' }])
    expect(careersRow([plan('A', ['Analyst', 'Banker']), plan('B', ['Banker', 'Analyst'])]).same).toBe(true)
    expect(careersNotInAll([['Analyst', 'Actuary'], ['Analyst', 'Banker'], ['Banker', 'Analyst']])).toEqual(['Actuary', 'Banker'])
  })
  it('counts problems the way the planner does: course-check errors too, not a passed subject planned again', () => {
    const issue = (o: Partial<Issue>): Issue => ({ severity: 'error', kind: 'prereq-unmet', message: '', params: {}, ...o })
    const issues = [issue({}), issue({ kind: 'duplicate', subject: 'X' }), issue({ kind: 'duplicate', subject: 'Y' }), issue({ ruleId: 'r1', kind: 'rule' }), issue({ severity: 'warning' })]
    expect(planProblems(issues, new Set(['X']))).toHaveLength(3)
  })
})

describe('comparing plans', () => {
  const facts = (o: Partial<PlanFacts>): PlanFacts => ({
    points: 300, required: 300, short: 0, rules: { total: 14, failed: 0, unknown: 0 }, finish: { year: 2028, period: 'semester-2' },
    heaviest: { year: 2027, period: 'semester-1', points: 50, level: 'ok' }, heavy: 0, problems: 0, problemTerm: null,
    exams: { withExam: 10, known: 20 }, hurdles: 3, wam: { mark: 74, low: 70, high: 78 }, ...o,
  })
  it('marks better only where fewer is plainly better, and nothing when all are equal', () => {
    expect(betterOn('rules', [facts({}), facts({ rules: { total: 14, failed: 1, unknown: 0 } })])).toEqual([0])
    expect(betterOn('heavy', [facts({}), facts({})])).toEqual([])
  })
  it('the summary leaves out equal facts and says when predicted WAMs are about the same', () => {
    expect(summaryLines([facts({}), facts({})])).toEqual([])
    expect(summaryLines([facts({}), facts({ wam: { mark: 71, low: 67, high: 75 } })])).toEqual([{ kind: 'wam', aboutSame: true }])
    expect(summaryLines([facts({}), facts({ wam: { mark: 60, low: 57, high: 63 }, finish: { year: 2029, period: 'semester-1' } })])).toEqual([{ kind: 'finish' }, { kind: 'wam', aboutSame: false }])
  })
  it('WAMs are about the same only within the uncertainty of the subjects that differ', () => {
    // Same 20 shared subjects, one different subject each: the shared error cancels.
    const shared = Array.from({ length: 20 }, (_, i) => ({ code: `S${i}`, share: 1 / 24, sd: 6 }))
    const a = { mark: 74, low: 70, high: 78, planned: [...shared, { code: 'A1', share: 1 / 24, sd: 6 }] }
    const b = { mark: 73, low: 69, high: 77, planned: [...shared, { code: 'B1', share: 1 / 24, sd: 6 }] }
    expect(wamGapSd(a, b)).toBeCloseTo(Math.sqrt(2) * 6 / 24, 5)
    // A gap of 1 is inside each plan's own range (old rule: "about the same"), but plainly apart here.
    expect(wamAboutSame([facts({ wam: a }), facts({ wam: b })])).toBe(false)
    expect(wamAboutSame([facts({ wam: a }), facts({ wam: { ...b, mark: 73.8 } })])).toBe(true)
    // With no planned subjects given, each plan's own range still decides.
    expect(wamAboutSame([facts({}), facts({ wam: { mark: 71, low: 67, high: 75 } })])).toBe(true)
  })
  it('the summary leads with majors, jobs and subjects when they differ', () => {
    const lines = summaryLines([facts({}), facts({ wam: { mark: 60, low: 57, high: 63 } })], {
      majors: ['Data Science|', 'Finance|'],
      careers: [['Analyst'], ['Analyst', 'Banker']],
      subjects: { differ: 16, moved: 1 },
    })
    expect(lines.map((l) => l.kind)).toEqual(['majors', 'careers', 'subjects', 'wam'])
    expect(lines[1]).toEqual({ kind: 'careers', n: 1 })
    expect(summaryLines([facts({}), facts({})], { majors: ['M|', 'M|'], careers: [['A'], ['A']], subjects: { differ: 0, moved: 0 } })).toEqual([])
  })
  it('keeps the plans, their order and the switch in the address', () => {
    const q = compareQuery({ plans: ['B', 'A'], diff: false })
    expect(q).toBe('plans=B,A&diff=0')
    expect(readCompareAddress(new URLSearchParams(q), ['A', 'B'])).toEqual({ plans: ['B', 'A'], diff: false })
    expect(readCompareAddress(new URLSearchParams('plans=a,Z,a'), ['A', 'B'])).toEqual({ plans: ['A'], diff: true })
  })
  it('an old ?compare=1 address moves to the compare page, keeping the rest', () => {
    expect(compareMoved(parsePath('plan/', '?compare=1'))).toBe('plan/compare/')
    expect(compareMoved(parsePath('zh-CN/plan/', '?compare=1&plans=A,B'))).toBe('plan/compare/?plans=A,B')
    expect(compareMoved(parsePath('plan/', ''))).toBeNull()
    expect(parsePath('plan/compare/').param).toBe('compare')
  })
})

describe('plans in the app', () => {
  provideDataset(JSON.parse(readFileSync(new URL('../src/generated/real.json', import.meta.url), 'utf8')) as Dataset)
  it('each plan keeps its own subjects and settings; the record is shared', async () => {
    const { usePlan } = await import('../src/composables/usePlan')
    const { usePlans } = await import('../src/composables/usePlans')
    const { useProfile } = await import('../src/composables/useProfile')
    books.value = {}
    const plan = usePlan()
    const plans = usePlans()
    const me = useProfile()
    me.setResults([{ code: 'MAST10006', mark: 80 }])
    me.setGoal('wam')
    me.setInterests(['ai'])
    plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', major: 'data-science', startYear: 2027, startPeriod: 'semester-1' })
    plan.addSubject(0, 'COMP10001')
    const idA = plans.active.value.id

    plans.create('copy')
    expect(plans.list.value).toHaveLength(2)
    expect(plan.plannedCodes.value).toContain('COMP10001')
    expect(me.profile.value.goal).toBe('wam')
    plan.removeSubject(0, 'COMP10001')
    me.setGoal('challenge')
    expect(me.profile.value.results).toHaveLength(1)

    plans.switchTo(idA)
    expect(plan.plannedCodes.value).toContain('COMP10001')
    expect(me.profile.value.goal).toBe('wam')
    expect(me.profile.value.interests).toEqual(['ai'])

    plans.create('fresh')
    expect(plan.setupChosen.value).toBe(false)
    expect(plan.isEmpty.value).toBe(true)
    expect(plan.setup.value.major).toBe('data-science')
    plans.remove(plans.active.value.id)
    expect(plans.active.value.id).not.toBe(idA)
    expect(plans.list.value).toHaveLength(2)
  })

  it('keeps a career goal per plan: clearing it in one leaves the other’s', async () => {
    const { usePlans } = await import('../src/composables/usePlans')
    const { useProfile } = await import('../src/composables/useProfile')
    books.value = {}
    const plans = usePlans()
    const me = useProfile()
    me.setCareer('accountant')
    const idA = plans.active.value.id
    plans.create('copy')
    expect(me.profile.value.career).toBe('accountant')
    me.setCareer(undefined)
    expect(me.profile.value.career).toBeUndefined()
    plans.switchTo(idA)
    expect(me.profile.value.career).toBe('accountant')
  })
})

describe('a plan sees its own career, never the record\'s old one', () => {
  it('a cleared career stays cleared even when the record still has a pre-plans career', () => {
    const stored = { results: [], skills: {}, interests: [], goal: 'balanced' as const, career: 'accountant' }
    const prefs = prefsOf({}, stored)
    expect(withPrefs(stored, prefs).career).toBe('accountant')
    const { career: _c, ...cleared } = prefs
    expect(withPrefs(stored, cleared).career).toBeUndefined()
    expect(withPrefs(stored, { ...cleared, career: 'nurse' }).career).toBe('nurse')
  })
})
