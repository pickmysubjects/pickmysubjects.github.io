import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { usePlan } from '../src/composables/usePlan'
import { useProfile } from '../src/composables/useProfile'
import { provideDataset } from '../src/composables/useDataset'
import { books } from '../src/composables/planStore'
import { setToday } from '../src/engine/dataYear'
import { computeWam, passedCodes, termKey, type Period } from '../src/engine'
import { doneWith, parseMark, recordMarks, termState } from '../src/utils/pastTerms'
import { readFileSync } from 'node:fs'
import { realData } from './realData'

// Today is mid Semester 2, 2026: Semester 1 is over, Semester 2 under way, 2027 ahead.
const TODAY = '2026-10-29'
const NOW = new Date(`${TODAY}T02:00:00Z`)
const data = realData()
beforeAll(() => provideDataset(data))
afterEach(() => {
  setToday(undefined)
  useProfile().setResults([])
  books.value = {}
})
const pts = (cs: string[]) => cs.reduce((s, c) => s + (data.subjects[c]?.points ?? 12.5), 0)
const cloneRecord = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** A Data Science student who started in `start`, planned today, with this record. */
function planned(start: { year: number; period: Period }, results: { code: string; year?: number; period?: Period; mark?: number }[] = []) {
  setToday(TODAY)
  books.value = {}
  const me = useProfile()
  me.setResults(results)
  const plan = usePlan()
  plan.updateSetup({ ...plan.setup.value, course: 'B-SCI', courseYear: start.year, major: 'data-science', specialisation: '', startYear: start.year, startPeriod: start.period })
  plan.generate()
  return { plan, me }
}
/** The last semester with anything in it, planned or on the record. */
function finish(plan: ReturnType<typeof usePlan>, results: { year?: number; period?: string }[]): number {
  const keys = [
    ...plan.terms.value.filter((x) => x.subjects.length).map((x) => termKey(x.year, x.period)),
    ...results.filter((r) => r.year && r.period).map((r) => termKey(r.year!, r.period as Period)),
  ]
  return Math.max(...keys)
}

describe('semesters that have begun', () => {
  it('knows which semesters are over, under way and ahead', () => {
    expect(termState({ year: 2026, period: 'semester-1' }, NOW)).toBe('ended')
    expect(termState({ year: 2026, period: 'semester-2' }, NOW)).toBe('now')
    expect(termState({ year: 2027, period: 'semester-1' }, NOW)).toBe('ahead')
  })

  it('a 2025 S1 starter: the whole degree is planned from 2025 S1, nothing goes to My record', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    expect(me.profile.value.results).toEqual([])
    expect(plan.terms.value[0]).toMatchObject({ year: 2025, period: 'semester-1' })
    expect(plan.terms.value[0]?.subjects.length).toBeGreaterThan(0)
    expect(plan.plan.value.completed).toEqual([])
    expect(pts(plan.plannedCodes.value)).toBe(300)
  })

  it('a 2026 S1 starter: 300 points planned, done in 2028 S2, the record untouched', () => {
    const { plan, me } = planned({ year: 2026, period: 'semester-1' })
    expect(me.profile.value.results).toEqual([])
    expect(pts(plan.plannedCodes.value)).toBe(300)
    expect(finish(plan, [])).toBe(termKey(2028, 'semester-2'))
  })

  it('adding a subject to a begun semester plans it there; the record stays empty', () => {
    const { plan, me } = planned({ year: 2026, period: 'semester-1' })
    plan.addSubject(0, 'PHYC10003')
    expect(plan.terms.value[0]?.subjects).toContain('PHYC10003')
    expect(me.profile.value.results).toEqual([])
  })
})

describe('marking done', () => {
  const first = (plan: ReturnType<typeof usePlan>, at = 0) => plan.terms.value[at]!.subjects.find((c) => !data.subjects[c]?.passFail)!

  it('a graded subject needs a mark; a pass/fail one needs none', () => {
    expect(doneWith('', false)).toBeNull()
    expect(doneWith('abc')).toBeNull()
    expect(doneWith('７２')).toEqual({ mark: 72 })
    expect(doneWith('', true)).toEqual({})
  })

  it('done (card button or mark box: both give a mark) goes to My record and the WAM; undo takes it back to planned', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    const code = first(plan)
    const term = { year: plan.terms.value[0]!.year, period: plan.terms.value[0]!.period }
    plan.markDone(code, 80)
    expect(me.profile.value.results).toEqual([{ code, ...term, mark: 80 }])
    expect(plan.terms.value[0]?.subjects).not.toContain(code)
    expect(plan.plan.value.completed).toContain(code)
    expect(computeWam(me.profile.value.results, data)).toBe(80)
    // A new mark in the box replaces the old one.
    plan.markDone(code, 66)
    expect(computeWam(me.profile.value.results, data)).toBe(66)
    plan.markUndone(code)
    expect(me.profile.value.results).toEqual([])
    expect(computeWam(me.profile.value.results, data)).toBeNull()
    expect(plan.terms.value[0]?.subjects).toContain(code)
  })

  it('a pass/fail subject is done without a mark and stays out of the WAM', () => {
    const pf = Object.values(data.subjects).find((s) => s.passFail)!
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    plan.addSubject(0, pf.code)
    plan.markDone(pf.code, undefined)
    expect(me.profile.value.results).toEqual([{ code: pf.code, year: 2025, period: 'semester-1' }])
    expect(computeWam(me.profile.value.results, data)).toBeNull()
  })

  it('a subject in a term not started yet can be marked done (the card only notes it)', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    const i = plan.terms.value.findIndex((x) => termState(x) === 'ahead')
    const code = first(plan, i)
    plan.markDone(code, 70)
    const r = me.profile.value.results.find((x) => x.code === code)!
    expect(termState({ year: r.year!, period: r.period! })).toBe('ahead')
  })

  it('undo keeps an earlier fail on the record', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' }, [{ code: 'COMP10001', year: 2025, period: 'semester-1', mark: 40 }])
    // The retake, in a later semester than the fail.
    const from = plan.terms.value.findIndex((x) => x.subjects.includes('COMP10001'))
    const at = 1
    plan.moveSubject('COMP10001', from, at)
    plan.markDone('COMP10001', 75)
    expect(me.profile.value.results).toHaveLength(2)
    plan.markUndone('COMP10001')
    expect(me.profile.value.results).toEqual([{ code: 'COMP10001', year: 2025, period: 'semester-1', mark: 40 }])
    expect(plan.terms.value[at]?.subjects).toContain('COMP10001')
  })

  it('My record is the one source: a change there shows on the board and the reverse', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    const code = first(plan)
    me.setResults([{ code, year: 2025, period: 'semester-1', mark: 90 }])
    expect(plan.plan.value.completed).toEqual([code])
    plan.markUndone(code)
    expect(plan.plan.value.completed).toEqual([])
  })

  it('a rebuild keeps done subjects and begun semesters the student changed, and re-plans the rest', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-1' })
    const code = first(plan)
    plan.markDone(code, 81)
    const s2 = plan.terms.value.findIndex((x) => x.year === 2025 && x.period === 'semester-2')
    plan.removeSubject(s2, plan.terms.value[s2]!.subjects[0]!)
    plan.addSubject(s2, 'PHYC10003')
    const edited = [...plan.terms.value[s2]!.subjects]
    const record = cloneRecord(me.profile.value.results)
    plan.generate()
    expect(me.profile.value.results).toEqual(record)
    expect(plan.terms.value.find((x) => x.year === 2025 && x.period === 'semester-2')?.subjects).toEqual(edited)
    expect(plan.plannedCodes.value).not.toContain(code)
    expect(pts([...passedCodes(me.profile.value.results), ...plan.plannedCodes.value])).toBeGreaterThanOrEqual(300)
  })

  it('one subject window for done and planned subjects; done cards open it too', () => {
    const view = readFileSync('src/views/PlannerView.vue', 'utf8')
    expect(view.match(/<SubjectPeek\b/g)).toHaveLength(1)
    const card = readFileSync('src/components/planner/TermColumn.vue', 'utf8')
    expect(card).toMatch(/<DoneCard[^>]*@open="emit\('open', r\.code\)"/s)
    const peek = readFileSync('src/components/planner/SubjectPeek.vue', 'utf8')
    expect(peek).not.toMatch(/doneTerm/)
  })
})

describe('marks on the board', () => {
  it('a mark for an unmarked entry updates it in place; an earlier fail stays beside a new attempt', () => {
    expect(recordMarks([{ code: 'COMP10001', year: 2026, period: 'semester-2' }], { year: 2026, period: 'semester-2' }, [{ code: 'COMP10001', mark: 81 }])).toEqual([
      { code: 'COMP10001', year: 2026, period: 'semester-2', mark: 81 },
    ])
    expect(recordMarks([{ code: 'COMP10001', year: 2025, period: 'semester-2', mark: 40 }], { year: 2026, period: 'semester-1' }, [{ code: 'COMP10001', mark: 70 }])).toHaveLength(2)
  })

  it('reads marks typed on any keyboard', () => {
    expect(parseMark('８５')).toBe(85)
    expect(parseMark(' 72 ')).toBe(72)
    expect(parseMark('')).toBeUndefined()
    expect(parseMark('abc')).toBeUndefined()
    expect(parseMark('130')).toBe(100)
  })
})
