import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { usePlan } from '../src/composables/usePlan'
import { useProfile } from '../src/composables/useProfile'
import { provideDataset } from '../src/composables/useDataset'
import { books } from '../src/composables/planStore'
import { setToday } from '../src/engine/dataYear'
import { computeWam, passedCodes, termKey, type Period } from '../src/engine'
import { parseMark, recordMarks, removeFromRecord, setRecordMark, termState } from '../src/utils/pastTerms'
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
const at = (year: number, period: Period) => (r: { year?: number; period?: string }) => r.year === year && r.period === period

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

  it('a 2026 S1 starter: the whole degree from 2026 S1, 300 points, done in 2028 S2; begun semesters go to My record', () => {
    const { plan, me } = planned({ year: 2026, period: 'semester-1' })
    const results = me.profile.value.results
    // The columns start at entry; the begun ones hold nothing in the plan (the record has them).
    expect(plan.terms.value[0]).toMatchObject({ year: 2026, period: 'semester-1', subjects: [] })
    expect(results.some(at(2026, 'semester-1'))).toBe(true)
    expect(results.some(at(2026, 'semester-2'))).toBe(true)
    expect(results.every((r) => r.mark === undefined)).toBe(true)
    expect(pts([...passedCodes(results), ...plan.plannedCodes.value])).toBe(300)
    expect(finish(plan, results)).toBe(termKey(2028, 'semester-2'))
  })

  it('a 2025 S2 starter finishes by 2028 S1', () => {
    const { plan, me } = planned({ year: 2025, period: 'semester-2' })
    expect(finish(plan, me.profile.value.results)).toBeLessThanOrEqual(termKey(2028, 'semester-1'))
    expect(pts([...passedCodes(me.profile.value.results), ...plan.plannedCodes.value])).toBe(300)
  })

  it('keeps what My record already has for a semester, and a rebuild keeps edits to begun semesters', () => {
    const mine = [
      { code: 'MAST10006', year: 2026, period: 'semester-1' as const, mark: 75 },
      { code: 'COMP10001', year: 2026, period: 'semester-1' as const },
    ]
    const { plan, me } = planned({ year: 2026, period: 'semester-1' }, mine)
    expect(me.profile.value.results.filter(at(2026, 'semester-1'))).toEqual(mine)
    // The student fixes Semester 2: takes one guess off, adds what they took, types a mark.
    const s2 = { year: 2026, period: 'semester-2' as const }
    const guess = me.profile.value.results.find(at(2026, 'semester-2'))!.code
    me.setResults(setRecordMark(recordMarks(removeFromRecord(me.profile.value.results, s2, guess), s2, [{ code: 'MAST10007' }]), s2, 'MAST10007', 68))
    const edited = me.profile.value.results.filter((r) => r.year === 2026)
    plan.generate()
    expect(me.profile.value.results.filter((r) => r.year === 2026)).toEqual(edited)
    expect(me.profile.value.results.some((r) => r.code === guess && at(2026, 'semester-2')(r))).toBe(false)
    // Nothing on the record is planned again later.
    expect(plan.plannedCodes.value.filter((c) => edited.some((r) => r.code === c))).toEqual([])
  })

  it('adding a subject to a begun semester puts it on the record, not in the plan', () => {
    const { plan, me } = planned({ year: 2026, period: 'semester-1' })
    plan.addSubject(0, 'PHYC10003')
    expect(plan.terms.value[0]?.subjects).toEqual([])
    expect(me.profile.value.results.find((r) => r.code === 'PHYC10003')).toMatchObject({ year: 2026, period: 'semester-1' })
  })
})

describe('marks on the board', () => {
  it('swap a subject, type marks: the record and WAM follow; a subject without a mark stays out of the WAM', () => {
    const term = { year: 2026, period: 'semester-1' as const }
    let record = recordMarks([], term, ['MAST10006', 'COMP10001', 'BIOL10004', 'CHEM10003'].map((code) => ({ code })))
    expect(computeWam(record, data)).toBeNull()
    record = recordMarks(removeFromRecord(record, term, 'CHEM10003'), term, [{ code: 'MAST10007' }])
    expect(record.map((r) => r.code).sort()).toEqual(['BIOL10004', 'COMP10001', 'MAST10006', 'MAST10007'])
    record = setRecordMark(record, term, 'MAST10006', 80)
    expect(computeWam(record, data)).toBe(80)
    record = setRecordMark(record, term, 'COMP10001', 60)
    expect(computeWam(record, data)).not.toBe(80)
    record = setRecordMark(record, term, 'COMP10001', undefined)
    expect(computeWam(record, data)).toBe(80)
    expect(record).toHaveLength(4)
  })

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
