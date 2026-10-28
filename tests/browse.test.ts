import { describe, expect, it } from 'vitest'
import { activeCount, activePreset, applyQuick, chooseOrder, choosePreset, orderOf, PRESETS, PRESET_SLUGS, activeFilters, historyStep, browse, browseAddress, browseIndex, clearFilters, EASY_CUTS, EMPTY_FILTERS, facetCounts, filterIndex, filtersFromQuery, filtersToQuery, findRows, quickChoice, QUICK_CHOICES, rankCourseOf, type BrowseFilters } from '../src/engine/browse'
import { rankSubjects } from '../src/engine/easeRanking'
import { simplifyFor } from '../src/engine/expr'
import { prereqStatus, recommend, standingOf, type Profile } from '../src/engine/recommend'
import { realData } from './realData'
import { subject } from './helpers'

describe('browse (real data)', () => {
  const data = realData()
  const all = Object.values(data.subjects)
  const run = (f: Partial<BrowseFilters>) => browse(all, { ...EMPTY_FILTERS, ...f }, 'B-SCI', 2026)

  it('lists everything running this year with no filters, by code; the rest when asked for', () => {
    const rows = run({})
    expect(rows.map((r) => r.subject.code)).toEqual([...rows.map((r) => r.subject.code)].sort())
    expect(rows.every((r) => r.periods.length > 0 || r.subject.offerings === 'unknown')).toBe(true)
    expect(rows.length).toBeLessThan(all.length)
    expect(run({ running: false })).toHaveLength(all.length)
  })

  it('summer & winter lists only subjects offered in summer or winter that year', () => {
    const rows = run(PRESETS.summerWinter)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.periods.some((p) => p === 'summer' || p === 'winter')).toBe(true)
    const semesterOnly = run({}).filter((r) => r.periods.length > 0 && r.periods.every((p) => p === 'semester-1' || p === 'semester-2'))
    expect(semesterOnly.length).toBeGreaterThan(0)
    const codes = new Set(rows.map((r) => r.subject.code))
    for (const r of semesterOnly) expect(codes.has(r.subject.code)).toBe(false)
  })

  it('summer & winter round-trips through its address and the query', () => {
    const f = applyQuick(EMPTY_FILTERS, 'summerWinter')
    // The shortcut is the study-period filter, summer and winter: nothing else, nothing hidden.
    expect(f).toEqual({ ...EMPTY_FILTERS, period: ['summer', 'winter'] })
    expect(browseAddress(f)).toBe('subjects/summer-winter/')
    expect(browseAddress({ ...f, level: [1] })).toBe('subjects/?level=1&when=summer%2Cwinter')
    // The old switch's address opens the same filters.
    expect(filtersFromQuery(new URLSearchParams('level=1&offterm=1'))).toEqual({ ...f, level: [1] })
    expect(quickChoice(filtersFromQuery(new URLSearchParams(''), 'summer-winter'))).toBe('summerWinter')
    // Another shortcut starts over, so the summer & winter filter goes.
    expect(applyQuick(f, 'noExam').period).toEqual([])
  })

  it('finds breadth subjects for B-SCI', () => {
    const rows = run({ category: ['breadth'] })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.subject.categories['B-SCI'] === 'breadth')).toBe(true)
    expect(rows.map((r) => r.subject.code)).toContain('ACCT10001')
  })

  it('level, semester and prerequisite filters combine', () => {
    const rows = run({ level: [1], period: ['semester-1'], prereq: 'none' })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.level).toBe(1)
      // As the student's degree reads them: an entry rule that degree meets counts as none.
      expect(simplifyFor(r.subject.prerequisites, 'B-SCI')).toBe('none')
      expect(r.periods).toContain('semester-1')
    }
  })

  it('"exam not a hurdle" leaves out subjects whose final exam is a hurdle, and unknown assessments', () => {
    const rows = run({ noHurdle: true, running: false })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.assessment).toBeDefined()
      expect(r.subject.assessment!.some((t) => t.kind === 'exam' && t.hurdle)).toBe(false)
    }
    const hurdles = all.filter((s) => s.assessment?.some((t) => t.kind === 'exam' && t.hurdle))
    expect(hurdles.length).toBeGreaterThan(0)
    expect(rows.length).toBe(all.filter((s) => s.assessment).length - hurdles.length)
    expect(filtersToQuery({ ...EMPTY_FILTERS, noHurdle: true })).toBe('nohurdle=1')
  })

  it('"no in-semester test" keeps only subjects whose recorded assessment has no test', () => {
    const rows = run({ noTest: true })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.subject.assessment!.some((t) => t.kind === 'test')).toBe(false)
    expect(run({}).some((r) => (r.test ?? 0) > 0)).toBe(true)
  })

  it('"no exam" keeps only subjects whose recorded assessment has no exam', () => {
    const rows = run({ exam: ['none'] })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.assessment).toBeDefined()
      expect(r.subject.assessment!.some((t) => t.kind === 'exam')).toBe(false)
    }
  })

  it('sorts by exam share, lowest first, unknowns last', () => {
    const exams = run({ sort: 'exam' }).map((r) => r.exam)
    const known = exams.filter((x): x is number => x !== null)
    expect(known).toEqual([...known].sort((a, b) => a - b))
    expect(exams.slice(known.length).every((x) => x === null)).toBe(true)
  })

  it('matches text in code or title, ignoring case', () => {
    expect(run({ text: 'comp10001' }).map((r) => r.subject.code)).toContain('COMP10001')
    expect(run({ text: 'accounting reports' }).map((r) => r.subject.code)).toEqual(['ACCT10001'])
  })
})

describe('browse filters in the address', () => {
  it('round-trips', () => {
    const f: BrowseFilters = {
      text: 'maths',
      category: ['breadth', 'arts'],
      topics: ['history', 'biology'],
      level: [2, 3],
      period: ['semester-2', 'summer'],
      points: [12.5, 25],
      exam: ['none', 'light'],
      hours: ['mid'],
      ease: ['easy'],
      prereq: 'met',
      noGroup: true,
      noHurdle: true,
      noTest: true,
      reviewed: true,
      sort: 'hours',
      rank: 'easy',
      mine: false,
      running: false,
    }
    expect(filtersFromQuery(new URLSearchParams(filtersToQuery(f)))).toEqual(f)
    // Every single group on its own, too: nothing leaks between keys.
    for (const k of Object.keys(f) as (keyof BrowseFilters)[]) {
      const one = { ...EMPTY_FILTERS, [k]: f[k] }
      expect(filtersFromQuery(new URLSearchParams(filtersToQuery(one))), k).toEqual(one)
    }
  })

  it('the no-exam list is what runs this year, easiest first; a subject not running is left out', () => {
    const f = applyQuick(EMPTY_FILTERS, 'noExam')
    expect(f).toEqual({ ...EMPTY_FILTERS, exam: ['none'] })
    const notRunning = subject({ code: 'ZZZZ10001', offerings: { 2026: [] }, assessment: [{ kind: 'assignment', weight: 100 }] })
    const runs = subject({ code: 'ZZZZ10002', offerings: { 2026: ['semester-1'] }, assessment: [{ kind: 'assignment', weight: 100 }] })
    const codes = browse([notRunning, runs], f, 'B-SCI', 2026).map((r) => r.subject.code)
    expect(codes).toEqual(['ZZZZ10002'])
    expect(browse([notRunning, runs], { ...f, running: false }, 'B-SCI', 2026).map((r) => r.subject.code).sort()).toEqual(['ZZZZ10001', 'ZZZZ10002'])
  })

  it('leaves defaults out', () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('')
  })

  it('applies a preset, and ignores junk values', () => {
    expect(filtersFromQuery(new URLSearchParams('preset=firstSemester'))).toMatchObject({ level: [1], period: ['semester-1'], prereq: 'any' })
    expect(filtersFromQuery(new URLSearchParams('level=0,12&when=autumn&sort=x&preset=nope&exam=lots&hours=x&ease=meh&prereq=maybe&points=-1&type=<b>'))).toEqual(EMPTY_FILTERS)
  })

  it('old single-value addresses open what they always did', () => {
    expect(filtersFromQuery(new URLSearchParams('noexam=1&noprereq=1&type=breadth&level=1&when=semester-1&running=1'))).toEqual({
      ...EMPTY_FILTERS,
      exam: ['none'],
      prereq: 'none',
      category: ['breadth'],
      level: [1],
      period: ['semester-1'],
    })
    expect(filtersFromQuery(new URLSearchParams('breadth=1')).category).toEqual(['breadth'])
    // The old no-exam list's address (it once set "running" itself) is the no-exam list.
    const old = filtersFromQuery(new URLSearchParams('noexam=1&running=1&sort=easy'))
    expect(old).toEqual({ ...EMPTY_FILTERS, exam: ['none'], sort: 'easy' })
    expect(activePreset(old)).toBe('noExam')
    expect(browseAddress(filtersFromQuery(new URLSearchParams('running=1')))).toBe('subjects/')
  })

  it('opens a quick pick from its own address, unless the query sets filters', () => {
    expect(filtersFromQuery(new URLSearchParams(''), 'no-exam').exam).toEqual(['none'])
    expect(filtersFromQuery(new URLSearchParams(''), 'breadth').category).toEqual(['breadth'])
    expect(filtersFromQuery(new URLSearchParams(''), 'first-semester')).toMatchObject({ level: [1], period: ['semester-1'] })
    // Filters the student changed since (written back to the query) win over the address.
    expect(filtersFromQuery(new URLSearchParams('level=2'), 'no-exam').exam).toEqual([])
    // A shared link's tracking parameters don't count as filters.
    expect(filtersFromQuery(new URLSearchParams('fbclid=abc&utm_source=xhs'), 'no-exam').exam).toEqual(['none'])
    expect(filtersFromQuery(new URLSearchParams(''), 'nonsense')).toEqual(filtersFromQuery(new URLSearchParams('')))
  })
})

describe('quick choices on Find subjects', () => {
  const data = realData()
  const all = Object.values(data.subjects)
  const opts = { course: 'B-SCI', year: 2026 }

  it('each choice opens from its old address and keeps that address when nothing else is set', () => {
    const slugs: Record<string, string> = { easy: 'easy', hard: 'hard', noExam: 'no-exam', firstSemester: 'first-semester', breadth: 'breadth', summerWinter: 'summer-winter' }
    for (const c of QUICK_CHOICES) {
      const f = applyQuick(EMPTY_FILTERS, c)
      expect(quickChoice(f)).toBe(c)
      if (c === 'all') expect(browseAddress(f)).toBe('subjects/')
      else {
        expect(browseAddress(f)).toBe(`subjects/${slugs[c]}/`)
        expect(quickChoice(filtersFromQuery(new URLSearchParams(''), slugs[c]))).toBe(c)
      }
    }
  })

  it('one choice at a time: picking another drops the last, the search text and "sort for me" stay', () => {
    // An order keeps the filters (it only orders them) and replaces any other order.
    const f = applyQuick({ ...EMPTY_FILTERS, text: 'comp', mine: true, exam: ['none'], level: [2] }, 'easy')
    expect(f).toEqual({ ...EMPTY_FILTERS, text: 'comp', exam: ['none'], level: [2], rank: 'easy' })
    // A shortcut starts the filters over and keeps the order.
    expect(applyQuick(f, 'breadth')).toEqual({ ...EMPTY_FILTERS, text: 'comp', category: ['breadth'], rank: 'easy' })
    expect(applyQuick(f, 'all')).toEqual({ ...EMPTY_FILTERS, text: 'comp' })
  })

  it('anything more than a plain choice goes in a shareable query', () => {
    const f = { ...applyQuick(EMPTY_FILTERS, 'easy'), level: [1] }
    const address = browseAddress(f)
    expect(address).toBe('subjects/?level=1&list=easy')
    expect(filtersFromQuery(new URLSearchParams(address.split('?')[1]))).toEqual(f)
  })

  it('old easy-list links with their filters still open the same list', () => {
    const f = filtersFromQuery(new URLSearchParams('course=B-SCI&level=1&breadth=1'), 'easy')
    expect(f).toMatchObject({ rank: 'easy', level: [1], category: ['breadth'] })
  })

  it('easiest first is the easy list exactly, then every subject it leaves out, by code', () => {
    const rows = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts)
    expect(rows.length).toBe(findRows(all, EMPTY_FILTERS, opts).length)
    const list = rankSubjects(all, { direction: 'easy', course: 'B-SCI', year: 2026 }).map((r) => r.subject.code)
    // Same members, same order, from the top: card n is "#n on the easy list".
    expect(rows.slice(0, list.length).map((r) => r.subject.code)).toEqual(list)
    expect(rows.slice(0, list.length).every((r) => r.ranked)).toBe(true)
    const tail = rows.slice(list.length)
    expect(tail.every((r) => !r.ranked)).toBe(true)
    expect(tail.map((r) => r.subject.code)).toEqual(tail.map((r) => r.subject.code).sort())
  })

  it('regression: a subject the list leaves out (only "first-year" going for it) never sits among its members', () => {
    // Reviewer repro: CLAS10020, CRIM10002, GERM10008 scored 0.1 with only "firstYear" and were
    // numbered among the easy list in Find subjects below #30.
    const rows = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts)
    const list = new Set(rankSubjects(all, { direction: 'easy', course: 'B-SCI', year: 2026 }).map((r) => r.subject.code))
    const firstOut = rows.findIndex((r) => !list.has(r.subject.code))
    expect(rows.slice(firstOut).some((r) => list.has(r.subject.code))).toBe(false)
    for (const r of rows.filter((x) => x.ranked)) expect(r.ranked!.reasons.some((x) => x.key !== 'firstYear')).toBe(true)
  })

  it('the sort menu\'s "easiest first" is the same order as the easy list', () => {
    const bySort = findRows(all, { ...EMPTY_FILTERS, sort: 'easy' }, opts).map((r) => r.subject.code)
    const byList = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts).map((r) => r.subject.code)
    expect(bySort).toEqual(byList)
  })

  it('hardest first is the hard list exactly, over the same subjects as easiest first', () => {
    const easy = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts)
    const hard = findRows(all, applyQuick(EMPTY_FILTERS, 'hard'), opts)
    expect(new Set(easy.map((r) => r.subject.code))).toEqual(new Set(hard.map((r) => r.subject.code)))
    const list = rankSubjects(all, { direction: 'hard', course: 'B-SCI', year: 2026 }).map((r) => r.subject.code)
    expect(hard.slice(0, list.length).map((r) => r.subject.code)).toEqual(list)
    // Nothing is on both lists.
    const easyList = new Set(rankSubjects(all, { direction: 'easy', course: 'B-SCI', year: 2026 }).map((r) => r.subject.code))
    expect(list.some((c) => easyList.has(c))).toBe(false)
  })

  it('other filters narrow the easy list without reordering it', () => {
    const level1 = findRows(all, { ...applyQuick(EMPTY_FILTERS, 'easy'), level: [1] }, opts).map((r) => r.subject.code)
    const whole = findRows(all, applyQuick(EMPTY_FILTERS, 'easy'), opts).map((r) => r.subject.code)
    expect(level1.length).toBeGreaterThan(0)
    expect(level1.every((c) => data.subjects[c]!.level === 1)).toBe(true)
    expect(level1).toEqual(whole.filter((c) => level1.includes(c)))
  })

  it('"sort for me" orders by the student\'s suggestions, each with its reason, even with nothing filled in', () => {
    const recs = recommend(data, { results: [], skills: {}, interests: [], goal: 'wam' }, { course: 'B-SCI' })
    const rows = findRows(all, { ...EMPTY_FILTERS, mine: true }, { ...opts, recs })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((r) => r.subject.code)).toEqual(recs.map((r) => r.code).filter((c) => rows.some((x) => x.subject.code === c)))
    expect(rows.every((r) => r.rec !== undefined)).toBe(true)
    // With a quick choice too: only that choice's subjects, still in the student's order.
    const noExam = findRows(all, { ...applyQuick(EMPTY_FILTERS, 'noExam'), mine: true }, { ...opts, recs })
    expect(noExam.length).toBeGreaterThan(0)
    expect(noExam.every((r) => r.exam === 0)).toBe(true)
    expect(noExam.map((r) => r.subject.code)).toEqual(rows.map((r) => r.subject.code).filter((c) => noExam.some((x) => x.subject.code === c)))
  })

  it('"sort for me" off: the ordinary filtered list', () => {
    expect(findRows(all, EMPTY_FILTERS, opts).map((r) => r.subject.code)).toEqual(browse(all, EMPTY_FILTERS, 'B-SCI', 2026).map((r) => r.subject.code))
  })
})

describe('a subject page’s place on a list is the place on the list it links to', () => {
  it('keeps the degree the link names, through the address and between easy and hard', () => {
    const f = filtersFromQuery(new URLSearchParams('course=B-SCI'), 'easy')
    expect(f).toMatchObject({ rank: 'easy', listCourse: 'B-SCI' })
    expect(browseAddress(f)).toBe('subjects/easy/?course=B-SCI')
    expect(filtersFromQuery(new URLSearchParams('course=B-SCI'), 'easy')).toEqual(filtersFromQuery(new URLSearchParams(browseAddress(f).split('?')[1]), 'easy'))
    expect(applyQuick(f, 'hard')).toMatchObject({ rank: 'hard', listCourse: 'B-SCI' })
    // A shortcut keeps the order, so the order keeps its degree; no order, no degree.
    expect(applyQuick(f, 'noExam')).toMatchObject({ rank: 'easy', listCourse: 'B-SCI' })
    expect(chooseOrder(f, null).listCourse).toBeUndefined()
    expect(filtersFromQuery(new URLSearchParams('course=<script>'), 'easy').listCourse).toBeUndefined()
    // The student's own degree, once chosen, wins; nothing chosen and no link: the default degree
    // (never "every degree": the filter and the list would then disagree).
    expect(rankCourseOf(f, 'B-COM', 'B-ARTS')).toBe('B-COM')
    expect(rankCourseOf(f, null, 'B-ARTS')).toBe('B-SCI')
    expect(rankCourseOf(EMPTY_FILTERS, null, 'B-ARTS')).toBe('B-ARTS')
  })

  it('a new visitor sees the same list the header counted the place on', async () => {
    const { defaultCourse, forCourse } = await import('../src/engine/forCourse')
    const { listPlace } = await import('../src/engine/easeRanking')
    const real = realData()
    const course = defaultCourse(real)
    const data = forCourse(real, course)
    const subjects = Object.values(data.subjects).sort((a, b) => a.code.localeCompare(b.code))
    // The header's link: /subjects/easy/?course=<the degree it counted for>.
    const f = filtersFromQuery(new URLSearchParams(`course=${course}`), 'easy')
    const rows = findRows(subjects, f, { course: rankCourseOf(f, null, course), year: 2027 })
    let checked = 0
    for (const direction of ['easy', 'hard'] as const) {
      const list = direction === 'easy' ? rows : findRows(subjects, { ...f, rank: 'hard' }, { course, year: 2027 })
      // "#n" on the subject page is card n on the list it links to, ties included.
      list.slice(0, 30).forEach((r, i) => {
        expect(listPlace(data.subjects, r.subject.code, course, 2027)).toEqual({ direction, place: i + 1 })
        checked++
      })
    }
    expect(checked).toBe(60)
  })
})

describe('easiest level 3 breadth list', () => {
  const all = Object.values(realData().subjects)
  const slug = EASY_CUTS.level3Breadth.slug

  it('opens from its own address and keeps it', () => {
    const f = filtersFromQuery(new URLSearchParams(''), slug)
    expect(f).toMatchObject({ rank: 'easy', level: [3], category: ['breadth'] })
    expect(browseAddress(f)).toBe(`subjects/${slug}/`)
    // Changing another filter moves it to the query.
    expect(browseAddress({ ...f, exam: ['none'] })).toContain('subjects/?')
  })

  it('lists level 3 B-SCI breadth subjects easiest first', () => {
    const f = filtersFromQuery(new URLSearchParams(''), slug)
    const rows = findRows(all, f, { course: 'B-SCI', year: 2026 })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.subject.level).toBe(3)
      expect(r.subject.categories['B-SCI']).toBe('breadth')
    }
    // The level-3 breadth easy list keeps its order inside it, from the top.
    const ranked = rankSubjects(all, { direction: 'easy', course: 'B-SCI', year: 2026, breadthOnly: true, level: 3 }).map((r) => r.subject.code)
    const codes = rows.map((r) => r.subject.code)
    expect(codes.filter((c) => ranked.includes(c))).toEqual(ranked)
    expect(codes.slice(0, 5)).toEqual(ranked.slice(0, 5))
  })
})

describe('filter groups and their live counts', () => {
  const all = Object.values(realData().subjects)
  const index = browseIndex(all, { course: 'B-ARTS', year: 2026 })
  const codes = (f: Partial<BrowseFilters>) => filterIndex(index, { ...EMPTY_FILTERS, ...f }).map((r) => r.subject.code)

  it('offers every kind of subject the data has, whatever the degree, and every level', () => {
    const kinds = new Set(index.flatMap((r) => r.options.category))
    const inData = new Set(all.flatMap((s) => Object.values(s.categories)))
    for (const k of inData) expect(kinds.has(k), k).toBe(true)
    // Not only the chosen degree's own two (arts and breadth for B-ARTS).
    expect(kinds.size).toBeGreaterThan(2)
    const levels = new Set(index.flatMap((r) => r.options.level))
    expect([...levels].sort()).toEqual([...new Set(all.map((s) => s.level))].sort())
    // Breadth is breadth for the degree being looked at.
    expect(codes({ category: ['breadth'] }).every((c) => realData().subjects[c]!.categories['B-ARTS'] === 'breadth')).toBe(true)
    // Any other kind: counts as that kind in some degree (science subjects for an Arts student too).
    const science = codes({ category: ['science'] })
    expect(science.length).toBeGreaterThan(0)
    expect(science.every((c) => Object.values(realData().subjects[c]!.categories).includes('science'))).toBe(true)
  })

  it('options in one group are alternatives; groups all apply', () => {
    const one = codes({ level: [1] })
    const two = codes({ level: [2] })
    expect(codes({ level: [1, 2] }).sort()).toEqual([...one, ...two].sort())
    const s1 = new Set(codes({ period: ['semester-1'] }))
    expect(codes({ level: [1], period: ['semester-1'] })).toEqual(one.filter((c) => s1.has(c)))
  })

  it('each option counts what choosing it would list, with the other groups applied', () => {
    const f: BrowseFilters = { ...EMPTY_FILTERS, level: [1], exam: ['none', 'light'], noGroup: true }
    const facets = facetCounts(index, f)
    for (const v of [1, 2, 3]) expect(facets.lists.level.get(v) ?? 0, `level ${v}`).toBe(filterIndex(index, { ...f, level: [v] }).length)
    for (const v of ['none', 'light', 'mid', 'heavy'] as const) expect(facets.lists.exam.get(v) ?? 0, v).toBe(filterIndex(index, { ...f, exam: [v] }).length)
    for (const v of ['semester-1', 'summer'] as const) expect(facets.lists.period.get(v) ?? 0, v).toBe(filterIndex(index, { ...f, period: [v] }).length)
    expect(facets.switches.noGroup).toBe(filterIndex(index, f).length)
    expect(facets.prereq.none).toBe(filterIndex(index, { ...f, prereq: 'none' }).length)
    expect(facets.switches.running).toBe(filterIndex(index, { ...f, running: false }).length)
  })

  it('exam and class-hour bands follow the recorded numbers', () => {
    for (const r of filterIndex(index, { ...EMPTY_FILTERS, exam: ['heavy'] })) expect(r.exam).toBeGreaterThanOrEqual(60)
    for (const r of filterIndex(index, { ...EMPTY_FILTERS, exam: ['light'] })) expect(r.exam! > 0 && r.exam! <= 40).toBe(true)
    for (const r of filterIndex(index, { ...EMPTY_FILTERS, hours: ['light'] })) expect(r.hours).toBeLessThanOrEqual(3)
    // Nothing recorded: left out of every band rather than guessed into one.
    expect(filterIndex(index, { ...EMPTY_FILTERS, hours: ['light', 'mid', 'heavy'] }).every((r) => r.hours !== null)).toBe(true)
  })

  it('"prerequisites I meet" goes by what the student has done', () => {
    const later = subject({ code: 'ZZZZ20001', prerequisites: { subject: 'ZZZZ10001' } })
    const first = subject({ code: 'ZZZZ10001', prerequisites: 'none' })
    const met = (done: string[]) => filterIndex(browseIndex([first, later], { course: 'B-SCI', year: 2026, standing: { completed: new Set(done), marks: {}, wam: null, confirmed: [] } }), { ...EMPTY_FILTERS, prereq: 'met', running: false }).map((r) => r.subject.code)
    expect(met([])).toEqual(['ZZZZ10001'])
    expect(met(['ZZZZ10001'])).toEqual(['ZZZZ10001', 'ZZZZ20001'])
  })

  it('"prerequisites I meet" reads planned subjects and confirmed conditions the way suggestions do', () => {
    const later = subject({ code: 'ZZZZ20001', prerequisites: { subject: 'ZZZZ10001' } })
    const first = subject({ code: 'ZZZZ10001', prerequisites: 'none' })
    const vce = subject({ code: 'ZZZZ10002', prerequisites: { manual: 'VCE Maths study score 25+' } })
    const data = { ...realData(), subjects: { ZZZZ10001: first, ZZZZ20001: later, ZZZZ10002: vce } }
    const meets = (p: Partial<Profile>, planned: string[] = []) => {
      const profile: Profile = { results: [], skills: {}, interests: [], goal: 'balanced', ...p }
      const index = browseIndex([first, later, vce], { course: 'B-SCI', year: 2026, standing: standingOf(profile, data, planned) })
      const browseSays = filterIndex(index, { ...EMPTY_FILTERS, prereq: 'met', running: false }).map((r) => r.subject.code).sort()
      // The same answer as the shared rule suggestions use.
      const shared = [first, later, vce].filter((s) => prereqStatus(s, standingOf(profile, data, planned), { subjects: data.subjects, course: 'B-SCI' }).status === 'ok').map((s) => s.code).sort()
      expect(browseSays).toEqual(shared)
      return browseSays
    }
    expect(meets({})).toEqual(['ZZZZ10001'])
    // Planned (not yet done) counts, as it does for suggestions.
    expect(meets({}, ['ZZZZ10001'])).toEqual(['ZZZZ10001', 'ZZZZ20001'])
    // A condition the student said they meet counts.
    expect(meets({ confirmed: ['ZZZZ10002'] })).toEqual(['ZZZZ10001', 'ZZZZ10002'])
    // A failed attempt doesn't.
    expect(meets({ results: [{ code: 'ZZZZ10001', mark: 40 }] })).toEqual(['ZZZZ10001'])
  })

  it('counts and clears active filters, keeping the search, list and order', () => {
    const f: BrowseFilters = { ...EMPTY_FILTERS, text: 'x', sort: 'exam', rank: 'easy', level: [1, 2], prereq: 'none', reviewed: true, running: false }
    expect(activeCount(f)).toBe(5)
    expect(clearFilters(f)).toEqual({ ...EMPTY_FILTERS, text: 'x', sort: 'exam', rank: 'easy' })
  })
})

describe('lists by address and order chips, one model with the filter panel', () => {
  const data = realData()
  const all = Object.values(data.subjects)
  const opts = { course: 'B-SCI', year: 2026 }
  const index = browseIndex(all, { course: 'B-SCI', year: 2026 })
  const names = Object.keys(PRESETS) as (keyof typeof PRESETS)[]

  it('each old list address opens with exactly its filters on, in the panel and as removable toolbar chips', () => {
    for (const p of names) {
      const f = filtersFromQuery(new URLSearchParams(''), PRESET_SLUGS[p])
      // The panel reads these filters, so it shows them checked.
      expect(f, p).toEqual({ ...EMPTY_FILTERS, ...PRESETS[p] })
      const want = Object.entries(PRESETS[p]).flatMap(([g, vs]) => (vs as readonly (string | number)[]).map((v) => `${g}:${v}`))
      expect(activeFilters(f).map((c) => c.key), p).toEqual(want)
      expect(activeCount(f), p).toBe(want.length)
      // The heading still names the list; the address stays its own page.
      expect(activePreset(f), p).toBe(p)
      expect(browseAddress(f), p).toBe(`subjects/${PRESET_SLUGS[p]}/`)
      // Taking one chip off leaves the others, and the address says so.
      const [first] = activeFilters(f)
      const g = first!.group as keyof BrowseFilters
      const less = { ...f, [g]: (f[g] as readonly unknown[]).filter((v) => v !== first!.value) } as BrowseFilters
      expect(activeFilters(less).length, p).toBe(want.length - 1)
      expect(filtersFromQuery(new URLSearchParams(browseAddress(less).split('?')[1] ?? ''))).toEqual(less)
    }
  })

  it('the same filters set by query or by hand are the same state as the list address', () => {
    for (const p of names) {
      const q = filtersToQuery({ ...EMPTY_FILTERS, ...PRESETS[p] })
      expect(filtersFromQuery(new URLSearchParams(q)), p).toEqual(filtersFromQuery(new URLSearchParams(''), PRESET_SLUGS[p]))
      expect(activePreset({ ...EMPTY_FILTERS, ...PRESETS[p] }), p).toBe(p)
      // Another group on top: still those filters, both shown.
      expect(activeFilters({ ...EMPTY_FILTERS, ...PRESETS[p], noGroup: true }).map((c) => c.key)).toContain('noGroup')
      // One of its own values changed: no longer that list.
      const [k] = Object.keys(PRESETS[p]) as (keyof BrowseFilters)[]
      expect(activePreset({ ...EMPTY_FILTERS, ...PRESETS[p], [k!]: [] }), p).toBeNull()
    }
  })

  it('every filter or order change is its own Back step; a search is one step, not one per letter', () => {
    const start = EMPTY_FILTERS
    expect(historyStep(start, { ...start, level: [1] })).toBe('push')
    expect(historyStep(start, chooseOrder(start, 'easy'))).toBe('push')
    expect(historyStep(start, chooseOrder(start, 'mine'))).toBe('push')
    expect(historyStep(start, { ...start, noTest: true })).toBe('push')
    expect(historyStep(start, { ...start, text: 'b' })).toBe('push')
    expect(historyStep({ ...start, text: 'b' }, { ...start, text: 'bi' })).toBe('replace')
    expect(historyStep({ ...start, text: 'bio' }, { ...start, text: '' })).toBe('replace')
    expect(historyStep({ ...start, text: 'bio' }, { ...start, text: 'bio', level: [2] })).toBe('push')
    // A step back opens exactly the state before it.
    const before = { ...start, level: [1], text: 'x' }
    const [path = '', query = ''] = browseAddress(before).split('?')
    expect(filtersFromQuery(new URLSearchParams(query), path.replace(/^subjects\/?/, '').replace(/\/$/, ''))).toEqual(before)
  })

  it('each shortcut lists exactly what its filters list, alone, with search text, with an order and with other filters', () => {
    for (const p of names) {
      const by = (f: BrowseFilters) => findRows(all, f, opts).map((r) => r.subject.code).sort()
      expect(by(choosePreset(EMPTY_FILTERS, p)), p).toEqual(filterIndex(index, { ...EMPTY_FILTERS, ...PRESETS[p] }).map((r) => r.subject.code).sort())
      const text = { ...choosePreset({ ...EMPTY_FILTERS, text: 'bio' }, p) }
      expect(by(text), p).toEqual(filterIndex(index, { ...EMPTY_FILTERS, ...PRESETS[p], text: 'bio' }).map((r) => r.subject.code).sort())
      const ordered = choosePreset(chooseOrder(EMPTY_FILTERS, 'easy'), p)
      expect(ordered.rank).toBe('easy')
      expect(by(ordered), p).toEqual(by(choosePreset(EMPTY_FILTERS, p)))
      const more = { ...choosePreset(EMPTY_FILTERS, p), noTest: true }
      expect(by(more), p).toEqual(filterIndex(index, { ...EMPTY_FILTERS, ...PRESETS[p], noTest: true }).map((r) => r.subject.code).sort())
    }
  })

  it('a different degree changes what breadth means, and the shortcut follows it', () => {
    const arts = browseIndex(all, { course: 'B-ARTS', year: 2026 })
    const rows = filterIndex(arts, choosePreset(EMPTY_FILTERS, 'breadth'))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.subject.categories['B-ARTS'] === 'breadth')).toBe(true)
  })

  it('orders: one at a time, never with the sort menu, and back to it when turned off', () => {
    const mine = chooseOrder({ ...EMPTY_FILTERS, sort: 'exam' }, 'mine')
    expect(orderOf(mine)).toBe('mine')
    const easy = chooseOrder(mine, 'easy')
    expect(easy).toMatchObject({ rank: 'easy', mine: false })
    expect(orderOf(chooseOrder(easy, 'hard'))).toBe('hard')
    expect(orderOf(chooseOrder(easy, null))).toBeNull()
    expect(chooseOrder(easy, null).sort).toBe('exam')
    // An old link with both keeps "Fits me" only.
    expect(orderOf(filtersFromQuery(new URLSearchParams('list=easy&mine=1')))).toBe('mine')
  })

  it('every chip state survives the address (reload, back, a shared link)', () => {
    for (const p of names) {
      for (const o of [null, 'mine', 'easy', 'hard'] as const) {
        const f = choosePreset(chooseOrder({ ...EMPTY_FILTERS, text: 'x' }, o), p)
        const address = browseAddress(f)
        const [path = '', query = ''] = address.split('?')
        const slug = path.replace(/^subjects\/?/, '').replace(/\/$/, '')
        const back = filtersFromQuery(new URLSearchParams(query), slug)
        expect(back, `${p} ${o}`).toEqual(f)
        expect(activePreset(back)).toBe(p)
        expect(orderOf(back)).toBe(o)
      }
    }
  })
})
