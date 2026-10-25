import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { EMPTY_FILTERS, findRows } from '../src/engine/browse'
import { LIST_TOP, listPlace, rankable, rankSubject, rankSubjects } from '../src/engine/easeRanking'
import type { Subject } from '../src/engine/schema'
import { forCourse } from '../src/engine/forCourse'
import { recommend, yearLevel, type Profile, type RecommendOptions } from '../src/engine/recommend'
import { fitBand, fitBasis, leadReasons, subjectDifficulty, subjectFit, whyNotFit } from '../src/engine/subjectFit'
import { SKILLS } from '../src/engine/schema'
import { discussionCount } from '../src/engine/schema'
import { basisText, rankReasonText, whyText } from '../src/i18n/fitText'
import { interpolate } from '../src/i18n/interpolate'
import { en as enMessages } from '../src/i18n/messages/en'
import { dataset, subject } from './helpers'

/**
 * The subject page's "Is it hard? Is it right for me?" card must say exactly what Find subjects
 * says: the fit of "sort for me" and the place on the easy/hard lists (real data).
 */
const { dataset: real } = buildDataset('real')
const YEAR = 2026

/** The list pages' order: reviews' tier, then score, then code. */
function cmp(a: Subject, b: Subject, direction: 'easy' | 'hard'): number {
  const ra = rankSubject(a, 'easy')!
  const rb = rankSubject(b, 'easy')!
  const t = (r: typeof ra) => (r.reviews === null ? 1 : (direction === 'easy' ? r.reviews : -r.reviews) >= 0.25 ? 0 : (direction === 'easy' ? r.reviews : -r.reviews) <= -0.25 ? 2 : 1)
  const sign = direction === 'easy' ? 1 : -1
  return t(ra) - t(rb) || (rb.score - ra.score) * sign || a.code.localeCompare(b.code)
}

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
  for (const course of ['B-SCI', 'B-COM', 'B-ARTS', 'B-DES', 'B-MUS', 'B-FAVISART']) {
    it(`${course}: easier/harder are a top block of the list they lean to, about a third of it, ties kept together`, () => {
      const subjects = forCourse(real, course).subjects
      for (const [direction, level] of [['easy', 'easier'], ['hard', 'harder']] as const) {
        const list = rankSubjects(Object.values(subjects), { direction, course, year: YEAR })
        const levels = list.map((r) => subjectDifficulty(subjects, r.subject.code, course, YEAR).level)
        // A top block: once a subject down the list isn't `level`, none below it is.
        const firstOut = levels.findIndex((l) => l !== level)
        const n = firstOut === -1 ? levels.length : firstOut
        expect(levels.slice(n).includes(level)).toBe(false)
        // About a third of the list (a tie block at the cut-off goes to the side nearer a third).
        if (list.length >= 30) {
          expect(n / list.length).toBeGreaterThanOrEqual(0.2)
          expect(n / list.length).toBeLessThanOrEqual(0.45)
        }
        // Ties never split across the cut-off.
        if (n > 0 && n < list.length) {
          const [x, y] = [list[n - 1]!, list[n]!]
          expect(x.score === y.score && x.reviews === null === (y.reviews === null)).toBe(false)
        }
      }
      // Nothing off both lists' top blocks is easier or harder; easier never leans hard and vice versa.
      for (const s of Object.values(subjects).filter((x) => rankable(x, course, YEAR))) {
        const d = subjectDifficulty(subjects, s.code, course, YEAR)
        if (d.level === 'unknown') continue
        const score = rankSubject(s, 'easy')!.score
        if (d.level === 'easier') expect([s.code, score > 0]).toEqual([s.code, true])
        if (d.level === 'harder') expect([s.code, score < 0]).toEqual([s.code, true])
        if (d.level !== 'average') expect(d.reasons.length).toBeGreaterThan(0)
        // The place is display only, and is the header chip's.
        expect(d.place).toEqual(listPlace(subjects, s.code, course, YEAR))
        if (d.place) expect(d.place.place).toBeLessThanOrEqual(LIST_TOP)
      }
    })
  }

  it('list places: tied subjects share a place, so a tie across #30 is all shown or none', () => {
    for (const course of ['B-SCI', 'B-ARTS', 'B-MUS']) {
      const subjects = forCourse(real, course).subjects
      for (const direction of ['easy', 'hard'] as const) {
        const list = rankSubjects(Object.values(subjects), { direction, course, year: YEAR })
        for (let i = 1; i < list.length; i++) {
          const [a, b] = [list[i - 1]!, list[i]!]
          const pa = listPlace(subjects, a.subject.code, course, YEAR)
          const pb = listPlace(subjects, b.subject.code, course, YEAR)
          if (a.score === b.score && (a.reviews === null) === (b.reviews === null) && pa?.direction === direction) expect(pb).toEqual(pa)
        }
      }
    }
  })

  it('regression: easy-leaning subjects are never "harder" (reviewer repros)', () => {
    const cases: [string, string][] = [
      ['B-ARTS', 'AGRI30048'], ['B-ARTS', 'AHIS30019'], ['B-ARTS', 'AHIS30020'], ['B-ARTS', 'CRIM30015'],
      ['B-COM', 'FINA20044'], ['B-ARTS', 'GEOG30030'], ['B-ARTS', 'ARBC30004'],
    ]
    for (const [course, code] of cases) {
      const subjects = forCourse(real, course).subjects
      if (!subjects[code]) continue
      const d = subjectDifficulty(subjects, code, course, YEAR)
      if (rankSubject(subjects[code]!, 'easy')!.score >= 0) expect([code, d.level]).not.toEqual([code, 'harder'])
    }
  })

  it('regression: a tie at the cut-off lands every tied subject on the same side', () => {
    for (const course of ['B-SCI', 'B-ARTS', 'B-COM']) {
      const subjects = forCourse(real, course).subjects
      const groups = new Map<string, Set<string>>()
      for (const s of Object.values(subjects).filter((x) => rankable(x, course, YEAR))) {
        const r = rankSubject(s, 'easy')
        if (!r || listPlace(subjects, s.code, course, YEAR)) continue
        const d = subjectDifficulty(subjects, s.code, course, YEAR)
        if (d.level === 'unknown') continue
        // Same score, same reviews-or-not, same lean by the lists' rules: same verdict.
        const lean = (['easy', 'hard'] as const).map((x) => rankSubjects([s], { direction: x, course, year: YEAR }).length).join('')
        const k = `${r.score}|${r.reviews === null ? 'facts' : r.reviews}|${lean}`
        groups.set(k, (groups.get(k) ?? new Set()).add(d.level))
      }
      for (const [k, levels] of groups) expect([course, k, levels.size]).toEqual([course, k, 1])
    }
  })

  it('regression: a mid-ranked subject is about average, with no place line', () => {
    const subjects = forCourse(real, 'B-SCI').subjects
    const d = subjectDifficulty(subjects, 'ABPL10005', 'B-SCI', YEAR)
    expect(d.level).toBe('average')
    expect(d.place).toBeNull()
  })

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

describe('fit bands and what a fit rests on', () => {
  it('band boundaries: great ≥90, good ≥60, ok 30–59, low under 30', () => {
    expect([100, 90, 89, 60, 59, 30, 29, 11, 0].map(fitBand)).toEqual(['great', 'great', 'good', 'good', 'ok', 'ok', 'low', 'low', 'low'])
  })

  it('a low-band subject is low in Find subjects and on the card alike', () => {
    const data = forCourse(real, 'B-SCI')
    const recs = recommend(data, coder, sortForMe(data, coder, 'B-SCI'))
    const low = recs.filter((r) => r.betterThan < 30).slice(0, 5)
    expect(low.length).toBe(5)
    for (const r of low) {
      expect(browseSays(coder, 'B-SCI', r.code)?.band).toBe('low')
      expect(cardSays(coder, 'B-SCI', r.code)).toMatchObject({ band: 'low', betterThan: r.betterThan })
    }
  })

  const en = JSON.parse(JSON.stringify(enMessages)) as Record<string, unknown>
  const lookup = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) as string | undefined
  const t = (key: string, params?: Record<string, string | number>) => interpolate(lookup(key) ?? key, params)

  it('counts marks, interests and rated strengths from the profile, and names only what is missing', () => {
    expect(fitBasis({ results: [{ code: 'A', mark: 70 }, { code: 'B', mark: 80 }, { code: 'C' }], skills: {}, interests: ['ai'] })).toEqual({ marks: 2, skills: 0, interests: 1, missing: 'marks' })
    expect(basisText(t, fitBasis({ results: [{ code: 'A', mark: 70 }, { code: 'B', mark: 80 }], skills: {}, interests: ['ai'] }))).toBe(
      'Based on 2 marks, 1 interest — add more marks for a surer fit',
    )
    const three = [70, 75, 80].map((mark, i) => ({ code: `X${i}`, mark }))
    expect(basisText(t, fitBasis({ results: three, skills: { programming: 5 }, interests: [] }))).toBe('Based on 3 marks, 1 rated strength — add your interests for a surer fit')
    expect(basisText(t, fitBasis({ results: three, skills: {}, interests: ['ai', 'maths'] }))).toBe('Based on 3 marks, 2 interests — rate your strengths for a surer fit')
    expect(basisText(t, fitBasis({ results: three, skills: { maths: 4, writing: 2 }, interests: ['ai'] }))).toBe('Based on 3 marks, 1 interest, 2 rated strengths')
  })

  it('difficulty says how many student reviews it rests on, or that it has none', () => {
    const subjects = forCourse(real, 'B-SCI').subjects
    const reviewed = Object.values(subjects).find((s) => (s.discussions ?? []).length && subjectDifficulty(subjects, s.code, 'B-SCI', YEAR).level !== 'unknown')!
    const d = subjectDifficulty(subjects, reviewed.code, 'B-SCI', YEAR)
    expect(d.factsOnly).toBe(false)
    expect(d.reviews).toBeGreaterThanOrEqual(reviewed.discussions!.reduce((a, x) => a + discussionCount(x), 0))
    expect(subjectDifficulty(subjects, 'ACCT20008', 'B-SCI', YEAR)).toMatchObject({ factsOnly: true, reviews: 0 })
  })
})

describe('which way each difficulty reason pushes', () => {
  it('easier items come from the easy ranking, harder ones from the hard ranking, together the shown reasons', () => {
    const subjects = forCourse(real, 'B-SCI').subjects
    let mixed = 0
    for (const s of Object.values(subjects).slice(0, 600)) {
      const d = subjectDifficulty(subjects, s.code, 'B-SCI', YEAR)
      if (d.level === 'unknown') continue
      const easyKeys = new Set(rankSubject(s, 'easy')!.reasons.map((r) => r.key))
      const hardKeys = new Set(rankSubject(s, 'hard')!.reasons.map((r) => r.key))
      for (const r of d.pushes.easier) expect(easyKeys.has(r.key)).toBe(true)
      for (const r of d.pushes.harder) expect(hardKeys.has(r.key)).toBe(true)
      expect([...d.pushes.easier, ...d.pushes.harder].length).toBe(d.reasons.length)
      if (d.pushes.easier.length && d.pushes.harder.length) mixed++
    }
    expect(mixed).toBeGreaterThan(0)
  })
})

describe('why a fit is low (recommend factors)', () => {
  const en = JSON.parse(JSON.stringify(enMessages)) as Record<string, unknown>
  const lookup = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) as string | undefined
  const t = (key: string, params?: Record<string, string | number>) => interpolate(lookup(key) ?? key, params)
  // Like the user's: every strength rated, no marks, no interests.
  const levels = [5, 4, 2, 3, 1, 4, 2, 5, 3, 2, 4, 1, 3, 5, 2, 3]
  const strengthsOnly: Profile = { results: [], skills: Object.fromEntries(SKILLS.map((k, i) => [k, levels[i % levels.length]!])), interests: [], goal: 'balanced' }

  it('the factors add up to the score (they explain it, not change it), and scores still equal sort for me', () => {
    const data = forCourse(real, 'B-SCI')
    for (const p of [coder, strengthsOnly, marked]) {
      const recs = recommend(data, p, sortForMe(data, p, 'B-SCI'))
      for (const r of recs.slice(0, 200)) {
        const sum = (r.factors ?? []).reduce((a, f) => a + f.effect, 0)
        expect(Math.abs(50 + sum - r.score)).toBeLessThanOrEqual(2)
      }
      expect(cardSays(p, 'B-SCI', recs[150]!.code)).toMatchObject({ betterThan: recs[150]!.betterThan })
    }
  })

  it('strengths only: a low-fit subject says why, naming the actual skills; and that no interests are picked', () => {
    const data = forCourse(real, 'B-SCI')
    const recs = recommend(data, strengthsOnly, sortForMe(data, strengthsOnly, 'B-SCI'))
    const lows = recs.filter((r) => fitBand(r.betterThan) === 'low')
    expect(lows.length).toBeGreaterThan(20)
    let named = 0
    for (const r of lows.slice(0, 40)) {
      const why = whyNotFit(r, strengthsOnly, data.subjects[r.code]!, data)
      const text = why.map((f) => whyText(t, f))
      expect(text.length).toBeGreaterThan(0)
      expect(text).toContain("Nothing in it matches your interests — you haven't picked any yet")
      for (const line of text) expect(line).not.toMatch(/fit\.why|\{/)
      // The skills it names are the student's own ratings of this subject's skills.
      const skillLine = why.find((f) => f.key === 'skillFit' || f.key === 'neutral' || f.key === 'offTopicStruggle')
      if (skillLine) {
        const listed = String(skillLine.params.weak || skillLine.params.uses || skillLine.params.skills).split(', ')
        expect(listed.length).toBeGreaterThan(0)
        for (const k of listed) expect(SKILLS).toContain(k)
        if (skillLine.params.weak || skillLine.key === 'offTopicStruggle') for (const k of listed) expect(strengthsOnly.skills[k as keyof typeof strengthsOnly.skills]!).toBeLessThanOrEqual(2)
        named++
      }
    }
    expect(named).toBeGreaterThan(10)
  })

  it('for marks only, interests and strengths are never given as what holds a subject back', () => {
    const data = forCourse(real, 'B-SCI')
    const easy: Profile = { ...strengthsOnly, goal: 'easy' }
    const recs = recommend(data, easy, sortForMe(data, easy, 'B-SCI'))
    for (const r of recs.filter((x) => fitBand(x.betterThan) === 'low').slice(0, 40)) {
      const keys = whyNotFit(r, easy, data.subjects[r.code]!, data).map((f) => f.key)
      expect(keys).not.toContain('noInterests')
      expect(keys).not.toContain('neutral')
    }
  })

  it('a modest WAM isn\'t given as what holds one subject back: every option shares it', () => {
    const data = forCourse(real, 'B-SCI')
    // Marks only in music: for a science subject the likely mark is just the overall average (66).
    const p: Profile = { ...strengthsOnly, results: [{ code: 'MUSI10023', mark: 64 }, { code: 'MUSI10047', mark: 68 }, { code: 'MUSI10204', mark: 66 }] }
    const recs = recommend(data, p, sortForMe(data, p, 'B-SCI'))
    let seen = 0
    for (const r of recs.filter((x) => fitBand(x.betterThan) === 'low').slice(0, 60)) {
      const predicted = r.factors?.find((f) => f.key === 'predicted')
      if (!predicted || predicted.effect > -1 || predicted.params.codes) continue
      seen++
      expect(whyNotFit(r, p, data.subjects[r.code]!, data).map((f) => f.key)).not.toContain('predicted')
    }
    expect(seen).toBeGreaterThan(5)
  })

  it('difficulty shows every factor each way with its numbers', () => {
    const subjects = forCourse(real, 'B-SCI').subjects
    const d = subjectDifficulty(subjects, 'ABPL10005', 'B-SCI', YEAR)
    expect(d.factors.easier.map((r) => rankReasonText(t, r))).toContain('Only 2 class hours a week')
    expect(d.factors.harder.map((r) => r.key)).toContain('examHurdle')
    for (const s of Object.values(subjects).slice(0, 300)) {
      const x = subjectDifficulty(subjects, s.code, 'B-SCI', YEAR)
      expect(x.factors.easier.length).toBeLessThanOrEqual(4)
      expect(x.factors.harder.length).toBeLessThanOrEqual(4)
      for (const r of [...x.factors.easier, ...x.factors.harder]) expect(rankReasonText(t, r)).not.toMatch(/\{|rank\.reason/)
    }
  })
})
