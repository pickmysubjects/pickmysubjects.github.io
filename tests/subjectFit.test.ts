import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { EMPTY_FILTERS, findRows } from '../src/engine/browse'
import { listPlace, rankSubjects } from '../src/engine/easeRanking'
import { forCourse } from '../src/engine/forCourse'
import { recommend, yearLevel, type Profile, type RecommendOptions } from '../src/engine/recommend'
import { fitBand, leadReasons, subjectDifficulty, subjectFit } from '../src/engine/subjectFit'
import { dataset, subject } from './helpers'

/**
 * The subject page's "Is it hard? Is it right for me?" card must say exactly what Find subjects
 * says: the fit of "sort for me" and the place on the easy/hard lists (real data).
 */
const { dataset: real } = buildDataset('real')
const YEAR = 2026

/** The options BrowseView's "sort for me" passes (no plan: nothing planned, no major). */
const sortForMe = (data: typeof real, p: Profile, course: string): RecommendOptions => ({
  planned: [],
  course,
  maxLevel: yearLevel(p.results, data),
  programme: { courseYear: YEAR, components: [], minors: [] },
})

/** What a Find subjects row shows with "sort for me" on: the rec, its band and its first reasons. */
function browseSays(p: Profile, course: string, code: string) {
  const data = forCourse(real, course)
  const recs = recommend(data, p, sortForMe(data, p, course))
  const rows = findRows(Object.values(data.subjects), { ...EMPTY_FILTERS, mine: true }, { course, rankCourse: course, year: YEAR, recs })
  const row = rows.find((r) => r.subject.code === code)
  return row?.rec ? { betterThan: row.rec.betterThan, band: fitBand(row.rec.betterThan), reasons: leadReasons(row.rec).map((n) => n.key), rank: rows.indexOf(row) } : null
}
function cardSays(p: Profile, course: string, code: string) {
  const data = forCourse(real, course)
  const f = subjectFit(data, p, sortForMe(data, p, course), code, { year: YEAR })
  return f.kind === 'fit' ? { betterThan: f.rec.betterThan, band: f.band, reasons: f.reasons.map((n) => n.key) } : f
}

const coder: Profile = { results: [], skills: { programming: 5, algorithms: 4, writing: 2 }, interests: ['ai', 'machine-learning', 'programming'], goal: 'balanced' }
const commerce: Profile = { results: [], skills: { business: 5, maths: 4 }, interests: ['finance', 'accounting'], goal: 'balanced' }
const writer: Profile = { results: [], skills: { writing: 5, programming: 1 }, interests: ['literature', 'philosophy'], goal: 'balanced' }
const marked: Profile = {
  results: [
    { code: 'COMP10001', mark: 88 },
    { code: 'MAST10006', mark: 60 },
    { code: 'ECON10004', mark: 72 },
  ],
  skills: { programming: 5 },
  interests: ['data-science'],
  goal: 'wam',
}

describe('fit card = Find subjects "sort for me"', () => {
  const cases: [string, Profile, string, string[]][] = [
    ['B-SCI computing', coder, 'B-SCI', ['COMP10001', 'ENGL10001', 'PHIL10002', 'MAST10006', 'ACCT10001']],
    ['B-COM finance', commerce, 'B-COM', ['FNCE10002', 'ACCT10001', 'ECON10004', 'COMP10001', 'CRIM10001']],
    ['B-ARTS writer', writer, 'B-ARTS', ['ENGL10001', 'PHIL10002', 'COMP10001', 'CRIM10001']],
    ['B-SCI with marks, protect WAM', marked, 'B-SCI', ['COMP10002', 'MAST10007', 'ECON10005', 'ENGL10001']],
  ]
  for (const [name, p, course, codes] of cases) {
    it(`${name}: same betterThan, band and first reasons`, () => {
      let checked = 0
      for (const code of codes) {
        const b = browseSays(p, course, code)
        const c = cardSays(p, course, code)
        if (!b) {
          expect(c).toHaveProperty('kind', 'out')
          continue
        }
        expect({ ...c }).toEqual({ betterThan: b.betterThan, band: b.band, reasons: b.reasons })
        checked++
      }
      expect(checked).toBeGreaterThanOrEqual(2)
    })
  }

  it('a computing student: the COMP subject fits better than a writing-heavy arts one', () => {
    const comp = cardSays(coder, 'B-SCI', 'COMP10001') as { betterThan: number; band: string }
    const engl = cardSays(coder, 'B-SCI', 'ENGL10001') as { betterThan: number; band: string }
    expect(comp.betterThan).toBeGreaterThan(engl.betterThan)
    expect(comp.band).not.toBe('ok')
    // And the other way round for a literature student.
    const w1 = cardSays(writer, 'B-ARTS', 'ENGL10001') as { betterThan: number }
    const w2 = cardSays(writer, 'B-ARTS', 'COMP10001') as { betterThan: number }
    expect(w1.betterThan).toBeGreaterThan(w2.betterThan)
  })

  it('protect WAM vs stretch me: the goal changes the scores as the engine defines, and the card follows', () => {
    const codes = ['COMP10001', 'MAST10006', 'ENGL10001', 'PHIL10002', 'ACCT10001', 'ECON10004']
    const fits = (goal: Profile['goal']) => codes.map((c) => (cardSays({ ...coder, goal }, 'B-SCI', c) as { betterThan: number }).betterThan)
    const wam = fits('wam')
    const stretch = fits('challenge')
    expect(wam).not.toEqual(stretch)
    for (const goal of ['wam', 'challenge'] as const)
      for (const c of codes) expect(cardSays({ ...coder, goal }, 'B-SCI', c)).toMatchObject({ betterThan: browseSays({ ...coder, goal }, 'B-SCI', c)!.betterThan })
  })

  it('left out of the list: says why instead of a score', () => {
    expect(cardSays(marked, 'B-SCI', 'COMP10001')).toMatchObject({ kind: 'out', why: { key: 'done' } })
    // Year 1 (under 100 points done): a level-3 subject waits.
    expect(cardSays(coder, 'B-SCI', 'COMP30027')).toMatchObject({ kind: 'out', why: { key: 'aboveLevel', level: 1 } })
    // MAST10006 builds on MAST10005: done the later one, the earlier is behind.
    const behind = cardSays(marked, 'B-SCI', 'MAST10005')
    expect(behind).toMatchObject({ kind: 'out', why: { key: 'behind' } })
    expect((behind as { why: { codes: string[] } }).why.codes).toContain('MAST10006')
    // Prerequisite not met (a year-2 student, so the level doesn't hide it first).
    const year2: Profile = { ...coder, results: ['MAST10006', 'MAST10007', 'ECON10004', 'ECON10005', 'PHIL10002', 'ENGL10001', 'CRIM10001', 'MGMT10002', 'FNCE10002'].map((code) => ({ code, mark: 70 })) }
    const data = forCourse(real, 'B-SCI')
    const skipped = new Map()
    recommend(data, year2, { ...sortForMe(data, year2, 'B-SCI'), skipped })
    const needs = [...skipped].filter(([, w]) => w.key === 'needsFirst').map(([c]) => c)
    expect(needs.length).toBeGreaterThan(10)
    for (const code of needs.slice(0, 5)) {
      expect(cardSays(year2, 'B-SCI', code)).toMatchObject({ kind: 'out', why: { key: 'needsFirst' } })
      expect(browseSays(year2, 'B-SCI', code)).toBeNull()
    }
  })

  it('a subject the degree closes: scored as Find subjects scores it, with a caution', () => {
    const data = forCourse(real, 'B-COM')
    const f = subjectFit(data, commerce, sortForMe(data, commerce, 'B-COM'), 'ACCT10002', { year: YEAR })
    expect(f.kind === 'missing' ? [] : f.cautions).toContainEqual({ key: 'closed' })
    expect(f.kind === 'fit' ? f.rec.betterThan : 'out').toEqual(browseSays(commerce, 'B-COM', 'ACCT10002')?.betterThan ?? 'out')
  })

  it('a subject not in the course: not open to the degree', () => {
    const notSci = Object.values(real.subjects).find((s) => s.level === 1 && !s.categories['B-SCI'] && Object.keys(s.categories).length && s.offerings !== 'unknown')!
    expect(cardSays(coder, 'B-SCI', notSci.code)).toMatchObject({ kind: 'out', why: { key: 'notInCourse' } })
  })

  it('not running this year but next: still scored, with a caution', () => {
    const s = subject({ code: 'NEXT10001', offerings: { 2026: [], 2027: ['semester-1'] }, categories: { 'B-SCI': 'breadth' }, topics: ['ai'] })
    const other = subject({ code: 'NOWW10001', offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'breadth' } })
    const data = dataset([s, other])
    const f = subjectFit(data, coder, { course: 'B-SCI', year: YEAR }, 'NEXT10001', { year: YEAR })
    expect(f).toMatchObject({ kind: 'fit', cautions: [{ key: 'notThisYear', year: YEAR }] })
    const gone = dataset([subject({ code: 'GONE10001', offerings: { 2025: ['semester-1'] }, discontinued_from: 2026, categories: { 'B-SCI': 'breadth' } })])
    expect(subjectFit(gone, coder, { course: 'B-SCI', year: YEAR }, 'GONE10001', { year: YEAR })).toMatchObject({ kind: 'out', why: { key: 'notRunning' } })
  })

  it('unknown prerequisites: scored with the "check the Handbook" warning', () => {
    const s = subject({ code: 'UNKN10001', offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'breadth' }, prerequisites: 'unknown' })
    const f = subjectFit(dataset([s]), coder, { course: 'B-SCI', year: YEAR }, 'UNKN10001', { year: YEAR })
    expect(f.kind === 'fit' && f.rec.warnings.map((w) => w.key)).toContain('prereqNotCurated')
  })

  it('a year-long subject and a pass/fail subject still get a fit when open', () => {
    for (const code of ['DNCE20039', 'CMCE20001']) {
      const s = real.subjects[code]!
      const course = Object.keys(s.categories)[0]!
      const year2: Profile = { ...writer, results: ['ENGL10001', 'PHIL10002', 'CRIM10001', 'MGMT10002', 'ECON10004', 'ECON10005', 'FNCE10002', 'ACCT10001', 'MAST10006'].map((c) => ({ code: c, mark: 70 })) }
      const b = browseSays(year2, course, code)
      const c = cardSays(year2, course, code)
      if (b) expect(c).toMatchObject({ betterThan: b.betterThan, band: b.band })
      else expect(c).toHaveProperty('kind', 'out')
    }
  })
})

describe('difficulty = the easy/hard lists', () => {
  for (const course of ['B-SCI', 'B-COM', 'B-ARTS']) {
    it(`${course}: every listed subject's verdict and place are the list's own`, () => {
      const subjects = forCourse(real, course).subjects
      const easy = rankSubjects(Object.values(subjects), { direction: 'easy', course, year: YEAR })
      const hard = rankSubjects(Object.values(subjects), { direction: 'hard', course, year: YEAR })
      expect(easy.length).toBeGreaterThan(5)
      easy.forEach((r, i) => expect(subjectDifficulty(subjects, r.subject.code, course, YEAR)).toMatchObject({ level: 'easier', place: { direction: 'easy', place: i + 1 } }))
      hard.forEach((r, i) => expect(subjectDifficulty(subjects, r.subject.code, course, YEAR)).toMatchObject({ level: 'harder', place: { direction: 'hard', place: i + 1 } }))
      // The header chip (top 30) agrees with the card.
      for (const r of easy.slice(0, 30)) expect(listPlace(subjects, r.subject.code, course, YEAR)).toEqual(subjectDifficulty(subjects, r.subject.code, course, YEAR).place)
      // Ranked but on neither list: about average, never a place.
      const listed = new Set([...easy, ...hard].map((r) => r.subject.code))
      for (const s of Object.values(subjects).filter((x) => x.level <= 3 && !listed.has(x.code)).slice(0, 200)) {
        const d = subjectDifficulty(subjects, s.code, course, YEAR)
        expect(d.place).toBeNull()
        expect(d.level === 'average' || d.level === 'unknown' || d.unranked !== undefined).toBe(true)
      }
    })
  }

  it('reasons come from the list, at most three, first-year only when nothing else', () => {
    const subjects = forCourse(real, 'B-SCI').subjects
    for (const r of rankSubjects(Object.values(subjects), { direction: 'easy', course: 'B-SCI', year: YEAR }).slice(0, 20)) {
      const d = subjectDifficulty(subjects, r.subject.code, 'B-SCI', YEAR)
      expect(d.reasons.length).toBeGreaterThan(0)
      expect(d.reasons.length).toBeLessThanOrEqual(3)
      expect(d.reasons).toEqual(r.reasons.filter((x) => x.key !== 'firstYear').slice(0, 3))
    }
  })

  it('no reviews and no assessment: not enough data, never a guess', () => {
    const subjects = forCourse(real, 'B-COM').subjects
    expect(subjectDifficulty(subjects, 'ACCT30007', 'B-COM', YEAR)).toMatchObject({ level: 'unknown', place: null })
    const thin = subject({ code: 'THIN10001', offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'breadth' }, weekly_contact_hours: 2 })
    expect(subjectDifficulty({ THIN10001: thin }, 'THIN10001', 'B-SCI', YEAR).level).toBe('unknown')
    expect(subjectDifficulty({}, 'NONE10001', 'B-SCI', YEAR).level).toBe('unknown')
  })

  it('pass/fail, not running, not in the course: off the lists, said why', () => {
    const pf = real.subjects.CMCE20001!
    const c = Object.keys(pf.categories)[0]!
    const d = subjectDifficulty(forCourse(real, c).subjects, 'CMCE20001', c, YEAR)
    if (d.level !== 'unknown') expect(d).toMatchObject({ place: null, unranked: 'passFail' })
    const gone = subject({ code: 'GONE10001', offerings: { 2026: [] }, categories: { 'B-SCI': 'breadth' }, assessment: [{ kind: 'assignment', weight: 100 }] })
    expect(subjectDifficulty({ GONE10001: gone }, 'GONE10001', 'B-SCI', YEAR)).toMatchObject({ level: 'easier', place: null, unranked: 'notRunning' })
    expect(subjectDifficulty({ GONE10001: { ...gone, offerings: { 2026: ['semester-1'] } } }, 'GONE10001', 'B-COM', YEAR)).toMatchObject({ unranked: 'notInCourse' })
  })
})
