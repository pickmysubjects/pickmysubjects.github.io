import { describe, expect, it } from 'vitest'
import { aggregate, buildRatingFiles, COLUMNS, rowsToObjects } from '../scripts/ratings/aggregate'

const header = Object.values(COLUMNS)
function row(over: Partial<Record<keyof typeof COLUMNS, string>> = {}): string[] {
  const base: Record<keyof typeof COLUMNS, string> = {
    timestamp: '2026/10/07 10:00:00',
    code: 'COMP30027',
    year: '2025',
    semester: 'Semester 1',
    difficulty: '4',
    workload: '4',
    generosity: '3',
    hours: '10',
    grade: 'H1',
    skills: 'maths, programming',
    recommend: 'Yes',
    examDifficulty: '',
    usefulness: '',
    interest: '',
    teaching: '',
    overall: '',
    wamBand: '',
    tags: '',
    exam: '',
    lectures: '',
    groups: '',
    cost: '',
    languages: '',
  }
  return (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).map((k) => over[k] ?? base[k])
}

describe('aggregate ratings', () => {
  const now = new Date('2026-10-07')

  it('averages scores, takes the median hours and the recommend rate', () => {
    const values = [
      header,
      row(),
      row({ timestamp: 't2', difficulty: '2', workload: '3', generosity: '5', hours: '6', recommend: 'No', skills: 'maths' }),
      row({ timestamp: 't3', difficulty: '3', hours: '20', grade: 'Prefer not to say', skills: 'writing' }),
    ]
    const { subjects } = aggregate(rowsToObjects(values), now)
    expect(subjects.COMP30027).toEqual({
      reviews: 3,
      difficulty: 3,
      workload: 3.7,
      grading: 3.7,
      hoursMedian: 10,
      recommendRate: 0.7,
      skills: ['maths'], // programming was ticked by 1 of 3, below the 50% bar
      examDifficulty: null,
      usefulness: null,
      interest: null,
      teaching: null,
      overall: null,
      overallCount: 0,
    })
  })

  it('publishes an optional question only once enough people answered it', () => {
    const two = [row({ timestamp: 'a', usefulness: '5' }), row({ timestamp: 'b', usefulness: '4' }), row({ timestamp: 'c', hours: '3' })]
    expect(aggregate(rowsToObjects([header, ...two]), now).subjects.COMP30027?.usefulness).toBeNull()
    const three = [...two, row({ timestamp: 'd', usefulness: '3', teaching: '9' })]
    const out = aggregate(rowsToObjects([header, ...three]), now).subjects.COMP30027
    expect(out?.usefulness).toBe(4)
    expect(out?.teaching).toBeNull() // 9 is out of range, so nobody really answered
  })

  it('one extreme rating among several honest ones barely moves the scores', () => {
    const honest = Array.from({ length: 8 }, (_, i) => row({ timestamp: `t${i}`, hours: String(8 + i), difficulty: '3', generosity: '4' }))
    const angry = row({ timestamp: 'tx', hours: '30', difficulty: '5', generosity: '1', recommend: 'No' })
    const { subjects } = aggregate(rowsToObjects([header, ...honest, angry]), now)
    expect(subjects.COMP30027?.reviews).toBe(9)
    expect(subjects.COMP30027?.difficulty).toBe(3) // a plain mean would give 3.2
    expect(subjects.COMP30027?.grading).toBe(4) // a plain mean would give 3.7
  })

  it('rejects malformed rows and counts identical resubmissions once', () => {
    const values = [
      header,
      row(),
      row(), // exact duplicate (same timestamp too)
      row({ timestamp: 'later' }), // identical answers resubmitted later
      row({ code: 'not a code' }),
      row({ timestamp: 'empty', difficulty: '', workload: '', generosity: '', hours: '', skills: '', recommend: '' }), // answers nothing
      row({ year: '2099' }),
    ]
    const result = aggregate(rowsToObjects(values), now)
    expect(result.accepted).toBe(1)
    expect(result.rejected).toBe(5)
  })

  it('takes partial answers: a blank year or question is fine, an out-of-range answer is ignored', () => {
    const partial = [
      row({ timestamp: 'a', year: '', semester: '', difficulty: '', generosity: '', workload: '2' }),
      row({ timestamp: 'b', difficulty: '9', workload: '3' }), // 9 isn't on the scale
      row({ timestamp: 'c', difficulty: '', workload: '4' }),
    ]
    const out = aggregate(rowsToObjects([header, ...partial]), now).subjects.COMP30027
    expect(out?.reviews).toBe(3)
    expect(out?.workload).toBe(3)
    expect(out?.difficulty).toBeNull() // nobody gave a valid difficulty
  })

  it('publishes nothing about a subject until 3 people rated it, and never grade bands', () => {
    const two = [row({ timestamp: 'a' }), row({ timestamp: 'b', hours: '4' })]
    expect(aggregate(rowsToObjects([header, ...two]), now).subjects.COMP30027).toBeUndefined()
    const out = aggregate(rowsToObjects([header, ...two, row({ timestamp: 'c', hours: '5' })]), now).subjects.COMP30027
    expect(out?.reviews).toBe(3)
    expect(JSON.stringify(out)).not.toMatch(/H1|grade/i)
  })

  it('ignores codes that are not in the dataset and caps a burst on one day', () => {
    const known = new Set(['COMP30027'])
    const fake = [1, 2, 3].map((i) => row({ code: 'ZZZZ10001', timestamp: `f${i}` }))
    expect(aggregate(rowsToObjects([header, ...fake]), now, known).subjects.ZZZZ10001).toBeUndefined()
    const burst = Array.from({ length: 30 }, (_, i) => row({ timestamp: `2026/10/07 10:${String(i).padStart(2, '0')}:00`, hours: String(i + 1) }))
    expect(aggregate(rowsToObjects([header, ...burst]), now, known).subjects.COMP30027?.reviews).toBe(10)
  })

  it('never outputs free text or anything beyond aggregates', () => {
    const values = [[...header, 'What I wish I knew', 'Contact'], [...row(), 'secret text', 'me@example.com']]
    const json = JSON.stringify(aggregate(rowsToObjects(values), now))
    expect(json).not.toContain('secret text')
    expect(json).not.toContain('@')
  })
})

describe('buildRatingFiles', () => {
  const now = new Date('2026-10-07')

  it('hours and recommend need 3 usable answers, like every other average', () => {
    const rows = [row({ timestamp: 'a', recommend: '', hours: '' }), row({ timestamp: 'b', recommend: '', hours: '', difficulty: '2' }), row({ timestamp: 'c' })]
    const out = buildRatingFiles([header, ...rows], undefined, now).ratings.COMP30027
    expect(out?.reviews).toBe(3)
    expect(out?.hoursMedian).toBeNull()
    expect(out?.recommendRate).toBeNull()
  })

  it('publishes an overall score with its count, for rating markup', () => {
    const rows = ['5', '4', '3', ''].map((o, i) => row({ timestamp: `t${i}`, overall: o }))
    const out = buildRatingFiles([header, ...rows], undefined, now).ratings.COMP30027
    expect(out?.overall).toBe(4)
    expect(out?.overallCount).toBe(3)
  })

  it('never puts free text or grade bands in the published files', () => {
    const cols = [...header, 'What I wish I knew', 'App language']
    const rows = Array.from({ length: 6 }, (_, i) => [...row({ timestamp: `t${i}`, wamBand: '70–74', grade: 'H1' }), `secret comment ${i}`, 'en'])
    const { ratings, offsets } = buildRatingFiles([cols, ...rows], new Set(['COMP30027']), now)
    const text = JSON.stringify({ ratings, offsets })
    expect(text).not.toContain('secret')
    expect(text).not.toContain('H1')
    expect(text).not.toContain('70')
    expect(offsets.COMP30027?.n).toBe(6)
  })

  it('a grade band sent alone counts for offsets, but an identical resubmission only once', () => {
    const card = (i: number) => row({ timestamp: `t${i}`, difficulty: '', workload: '', generosity: '', hours: '', skills: '', recommend: '', year: String(2020 + i), wamBand: '70–74', grade: 'H2A' })
    const four = [1, 2, 3, 4].map(card)
    const dupes = [header, ...four, card(4), card(4)]
    expect(buildRatingFiles(dupes, undefined, now).offsets.COMP30027).toBeUndefined() // 4 distinct < 5
    const five = [header, ...four, card(5)]
    expect(buildRatingFiles(five, undefined, now).offsets.COMP30027?.n).toBe(5)
    expect(buildRatingFiles(five, undefined, now).ratings.COMP30027).toBeUndefined() // a band alone isn't a rating
  })
})

it('keeps every skill the form offers', async () => {
  const { SKILLS } = await import('../src/engine/schema')
  const rows = ['a', 'b', 'c'].map((t, i) => row({ timestamp: t, difficulty: String(i + 1), skills: 'fieldwork, languages, exams' }))
  expect(SKILLS).toContain('fieldwork')
  // exams is read off the assessment, never taken from ratings.
  expect(aggregate(rowsToObjects([header, ...rows])).subjects.COMP30027?.skills).toEqual(['fieldwork', 'languages'])
})

describe('grade bands pass the same spam filter as ratings', () => {
  const now = new Date('2026-10-07')
  const bandOnly = { difficulty: '', workload: '', generosity: '', hours: '', skills: '', recommend: '', grade: 'H1' }

  it('a one-day burst with impossible years publishes no offset', () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      row({ ...bandOnly, code: 'COMP10001', year: String(1900 + i), wamBand: '50–54', timestamp: '2026/10/07 10:00:00' }),
    )
    const out = buildRatingFiles([header, ...rows], undefined, now)
    expect(out.ratings.COMP10001).toBeUndefined()
    expect(out.offsets.COMP10001).toBeUndefined()
  })

  it('caps grade bands per subject per day', () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      row({ ...bandOnly, code: 'COMP10001', year: '2025', semester: `S${i}`, wamBand: '50–54', timestamp: '2026/10/07 10:00:00' }),
    )
    expect(buildRatingFiles([header, ...rows], undefined, now).offsets.COMP10001?.n).toBe(10)
  })

  it('dedupes on the normalised code, and spaced codes still count', () => {
    const spaced = [1, 2, 3, 4, 5].map((i) => row({ ...bandOnly, code: 'COMP 10001', year: String(2020 + i), wamBand: '70–74', timestamp: `t${i}` }))
    expect(buildRatingFiles([header, ...spaced], undefined, now).offsets.COMP10001?.n).toBe(5)
    const cased = [1, 2, 3, 4].flatMap((i) => [
      row({ ...bandOnly, code: 'COMP10001', year: String(2020 + i), wamBand: '70–74', timestamp: `t${i}` }),
      row({ ...bandOnly, code: 'comp10001', year: String(2020 + i), wamBand: '70–74', timestamp: `u${i}` }),
    ])
    expect(buildRatingFiles([header, ...cased], undefined, now).offsets.COMP10001).toBeUndefined() // 4 distinct < 5
    const ratings = ['COMP30027', 'comp30027', 'COMP 30027'].map((c, i) => row({ code: c, timestamp: `r${i}` }))
    expect(aggregate(rowsToObjects([header, ...ratings]), now).subjects.COMP30027).toBeUndefined() // 1 distinct < 3
  })
})

it('fetch reads more than 26 columns', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../scripts/ratings/fetch.ts', import.meta.url), 'utf8')
  expect(src).not.toMatch(/values\/A:Z`/)
})

describe('rating tags', () => {
  const now = new Date('2026-10-07')
  const only = { difficulty: '', workload: '', generosity: '', hours: '', skills: '', recommend: '', grade: '' }

  it('counts known tags per subject, once per rating, and drops unknown ids', () => {
    const values = [
      header,
      row({ tags: 'tough-exam, maths-heavy, tough-exam' }),
      row({ year: '2024', tags: 'tough-exam, made-up-tag' }),
      row({ year: '2023', tags: '' }),
    ]
    expect(aggregate(rowsToObjects(values), now).subjects.COMP30027?.tags).toEqual({ 'maths-heavy': 1, 'tough-exam': 2 })
  })

  it('publishes nothing below 3 valid ratings, with the same spam rules', () => {
    // Two distinct ratings (the third is an identical resubmission): nothing published.
    const twice = [header, row({ ...only, tags: 'clear-lectures' }), row({ ...only, tags: 'clear-lectures' }), row({ ...only, timestamp: 't2', tags: 'fair-marking' })]
    expect(aggregate(rowsToObjects(twice), now).subjects.COMP30027).toBeUndefined()
    // A tag alone counts as an answer: three tag-only ratings publish their counts.
    const thrice = [header, ...['2023', '2024', '2025'].map((y) => row({ ...only, year: y, tags: 'clear-lectures' }))]
    expect(aggregate(rowsToObjects(thrice), now).subjects.COMP30027?.tags).toEqual({ 'clear-lectures': 3 })
    // Made-up subject codes are rejected whatever the tags.
    const fake = [header, ...['2023', '2024', '2025'].map((y) => row({ code: 'NOPE', year: y, tags: 'interesting' }))]
    expect(aggregate(rowsToObjects(fake), now).subjects).toEqual({})
  })

  it('leaves tags out when nobody ticked a known one', () => {
    const values = [header, row(), row({ year: '2024', tags: 'whatever' }), row({ year: '2023' })]
    expect(aggregate(rowsToObjects(values), now).subjects.COMP30027).not.toHaveProperty('tags')
  })
})

describe('top tags', async () => {
  const { topTags, RATING_TAGS } = await import('../src/engine/ratingTags')
  it('most mentioned first, at most five, unknown ids ignored', () => {
    expect(topTags({ interesting: 2, 'tough-exam': 5, junk: 9, 'hands-on': 2, 'group-work': 1, 'fair-marking': 3, 'clear-lectures': 1 }).map((x) => x.tag)).toEqual([
      'tough-exam',
      'fair-marking',
      'hands-on',
      'interesting',
      'group-work',
    ])
    expect(topTags(undefined)).toEqual([])
    expect(new Set(RATING_TAGS).size).toBe(RATING_TAGS.length)
  })
})

it('the Google Form script offers exactly the app\'s tag ids', async () => {
  const { readFileSync } = await import('node:fs')
  const { RATING_TAGS } = await import('../src/engine/ratingTags')
  const src = readFileSync(new URL('../scripts/google/create-forms.gs', import.meta.url), 'utf8')
  const list = /const RATING_TAG_IDS = \[([^\]]*)\]/.exec(src)?.[1] ?? ''
  expect([...list.matchAll(/'([^']+)'/g)].map((m) => m[1])).toEqual([...RATING_TAGS])
})
