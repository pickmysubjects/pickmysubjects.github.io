import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { cleanPlans } from '../src/utils/sanitize'
import { addPlan, bookOf, MAX_PLANS, removePlan, renamePlan, switchPlan } from '../src/utils/planBook'
import { comparePlans, type PlanTerm } from '../src/engine'
import { activePlan, books, prefsOf, type PlanState } from '../src/composables/planStore'
import { provideDataset } from '../src/composables/useDataset'
import type { Dataset } from '../src/engine'

const state = (course: string, subjects: string[] = []): PlanState => ({
  setup: { course, courseYear: 2026, startYear: 2027, startPeriod: 'semester-1', major: '', specialisation: '' },
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
  it('splits the subjects and lines the semesters up by date', () => {
    const a = [t(2027, 'semester-1', ['X', 'Y']), t(2027, 'semester-2', ['Z']), t(2028, 'semester-1', [])]
    const b = [t(2027, 'semester-1', ['X', 'W']), t(2027, 'winter', ['V']), t(2027, 'semester-2', [])]
    const d = comparePlans({ terms: a, levels: ['heavy', 'ok', 'ok'] }, { terms: b }, (c) => (c === 'V' ? 6.25 : 12.5))
    expect(d.onlyA).toEqual(['Y', 'Z'])
    expect(d.onlyB).toEqual(['V', 'W'])
    expect(d.both).toEqual(['X'])
    expect(d.rows.map((r) => r.period)).toEqual(['semester-1', 'winter', 'semester-2'])
    expect(d.rows[0]).toEqual({ year: 2027, period: 'semester-1', a: { points: 25, count: 2, level: 'heavy' }, b: { points: 25, count: 2 } })
    expect(d.rows[1]!.a).toBeNull()
    expect(d.rows[2]!.b).toBeNull()
    expect([d.totalA, d.totalB]).toEqual([37.5, 31.25])
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
})
