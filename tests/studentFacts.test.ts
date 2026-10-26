import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { aggregate, buildRatingFiles, COLUMNS, rowsToObjects, studentFacts } from '../scripts/ratings/aggregate'
import { RATINGS_FORM } from '../src/config'
import { splitDataset, withDetail } from '../src/engine/split'
import { FACT_QUESTIONS, LANGUAGES, LANGUAGES_TITLE, studentFactsSchema } from '../src/engine/studentFacts'
import { interpolate, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { hasQuestion, isFormReady } from '../src/utils/googleForm'
import { factLabels, studentFactsHtml } from '../src/utils/studentFactsHtml'
import { realData } from './realData'

const now = new Date('2026-10-27')
const t: Translate = (key, params) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en)
  return typeof v === 'string' ? interpolate(v, params) : key
}

type Fact = 'exam' | 'lectures' | 'attendance' | 'groups' | 'cost' | 'languages'
let n = 0
/**
 * One form response with only the given facts answered. Identical answers count once (spam
 * screen), so each row gets its own year.
 */
function row(facts: Partial<Record<Fact, string>>, code = 'COMP30027'): Record<string, string> {
  n += 1
  return {
    [COLUMNS.timestamp]: `2026/10/0${(n % 9) + 1} 10:00:${String(n % 60).padStart(2, '0')}`,
    [COLUMNS.code]: code,
    [COLUMNS.year]: String(2011 + (n % 15)),
    ...Object.fromEntries(Object.entries(facts).map(([k, v]) => [COLUMNS[k as Fact], v])),
  }
}
const rows = (k: Fact, answers: string[]) => answers.map((a) => row({ [k]: a }))

describe('student facts aggregation', () => {
  it('publishes the top answer once 3 agree and it is 60%+ of the answers', () => {
    const f = studentFacts(rows('exam', ['Closed book', 'Closed book', 'Closed book', 'Open book']))
    expect(f?.exam).toEqual({ value: 'closed', count: 3 })
    expect(f?.n).toBe(4)
  })

  it('needs 3 students giving the same answer', () => {
    expect(studentFacts(rows('lectures', ['Yes', 'Yes']))).toBeUndefined()
  })

  it('needs a 60% majority', () => {
    // 3 of 5 = 60%: shown. 3 of 6 = 50%: not shown.
    expect(studentFacts(rows('groups', ['Groups assigned', 'Groups assigned', 'Groups assigned', 'No group work', 'No group work']))?.groups).toEqual({ value: 'assigned', count: 3 })
    expect(studentFacts(rows('groups', ['Groups assigned', 'Groups assigned', 'Groups assigned', 'No group work', 'No group work', 'No group work']))).toBeUndefined()
  })

  it('leaves "Not sure" and unknown labels out of the count', () => {
    const f = studentFacts(rows('exam', ['Open book', 'Open book', 'Open book', 'Not sure', 'Not sure', 'Not sure', 'open-book!!']))
    expect(f?.exam).toEqual({ value: 'open', count: 3 })
  })

  it('counts each language a student ticked, once, and publishes those with 3+', () => {
    const f = studentFacts(rows('languages', ['Python, SQL', 'Python', 'Python, Python, R', 'SQL, R', 'C++, None', 'SQL', 'Cobol']))
    expect(f?.languages).toEqual({ Python: 3, SQL: 3 })
    expect(Object.keys(f?.languages ?? {})).toEqual(['Python', 'SQL'])
    // "None" alone is an answer but never shown.
    expect(studentFacts(rows('languages', ['None', 'None', 'None']))).toBeUndefined()
  })

  it('has no facts when the sheet has no such columns yet', () => {
    const header = ['Timestamp', 'Subject code', 'Year taken', 'Difficulty']
    const values = [header, ...[1, 2, 3, 4].map((i) => [`2026/10/0${i} 10:00:00`, 'COMP30027', `202${i}`, '3'])]
    const out = buildRatingFiles(values, undefined, now)
    expect(out.ratings.COMP30027?.reviews).toBe(4)
    expect(out.ratings.COMP30027?.facts).toBeUndefined()
  })

  it('reads columns by title, wherever they are, and goes through the spam screen', () => {
    const header = [LANGUAGES_TITLE, 'Subject code', FACT_QUESTIONS.cost.title, 'Timestamp', 'Year taken']
    const good = [1, 2, 3].map((i) => ['Python', 'COMP30027', 'Yes', `2026/10/0${i} 10:00:00`, `202${i}`])
    // Identical resubmissions count once; a made-up code is dropped.
    const spam = [good[0]!, good[0]!, ['Python', 'XXXX00000', 'Yes', '2026/10/04 10:00:00', '2024']]
    const out = buildRatingFiles([header, ...good, ...spam], undefined, now)
    expect(out.ratings.COMP30027?.facts).toEqual({ n: 3, cost: { value: 'yes', count: 3 }, languages: { Python: 3 } })
    expect(Object.keys(out.ratings)).toEqual(['COMP30027'])
  })

  it('counts a facts-only response as a rating, and nothing below 3 rows is published', () => {
    const three = aggregate([row({ attendance: 'No' }), row({ attendance: 'No' }), row({ attendance: 'No' })], now)
    expect(three.subjects.COMP30027?.facts?.attendance).toEqual({ value: 'no', count: 3 })
    expect(aggregate([row({ attendance: 'No' }), row({ attendance: 'No' })], now).subjects).toEqual({})
  })

  it('writes facts that pass the schema', () => {
    const list = [
      ...rows('exam', ['No final exam', 'No final exam', 'No final exam']),
      ...rows('languages', ['MATLAB', 'MATLAB', 'MATLAB, C']),
    ]
    const facts = aggregate(list, now).subjects.COMP30027?.facts
    expect(studentFactsSchema.parse(facts)).toEqual(facts)
  })
})

describe('student facts schema', () => {
  it('rejects anything below the bar or not on the form', () => {
    expect(studentFactsSchema.safeParse({ n: 3, exam: { value: 'closed', count: 2 } }).success).toBe(false)
    expect(studentFactsSchema.safeParse({ n: 3, exam: { value: 'unsure', count: 3 } }).success).toBe(false)
    expect(studentFactsSchema.safeParse({ n: 3, languages: { Cobol: 3 } }).success).toBe(false)
    expect(studentFactsSchema.safeParse({ n: 3, extra: 1 }).success).toBe(false)
    expect(studentFactsSchema.safeParse({ n: 5, lectures: { value: 'some', count: 4 }, languages: { 'C++': 3 } }).success).toBe(true)
  })

  it('accepts every answer the aggregation can publish', () => {
    for (const [k, q] of Object.entries(FACT_QUESTIONS)) {
      for (const id of Object.values(q.options)) if (id) expect(studentFactsSchema.safeParse({ n: 3, [k]: { value: id, count: 3 } }).success).toBe(true)
    }
  })

  it('lists every language the form offers', () => {
    expect(LANGUAGES).toEqual(['Python', 'R', 'Java', 'C', 'C++', 'JavaScript', 'SQL', 'MATLAB'])
  })

  it('documents every question title and option label verbatim', () => {
    const doc = readFileSync(join(__dirname, '..', 'docs', 'ratings-setup.md'), 'utf8')
    for (const q of Object.values(FACT_QUESTIONS)) {
      expect(doc).toContain(`\`${q.title}\``)
      for (const label of Object.keys(q.options)) expect(doc).toContain(`\`${label}\``)
    }
    for (const l of [...LANGUAGES, 'None']) expect(doc).toContain(`\`${l}\``)
  })
})

describe('student facts in the app', () => {
  it('keeps the form working while the questions are placeholders', () => {
    expect(isFormReady(RATINGS_FORM)).toBe(true)
    for (const k of ['exam', 'lectures', 'attendance', 'groups', 'cost', 'languages'] as const) {
      expect(RATINGS_FORM.optional).toContain(k)
      if (!/^entry\.\d+$/.test(RATINGS_FORM.entries[k])) expect(hasQuestion(RATINGS_FORM, k)).toBe(false)
    }
  })

  it('labels facts in a fixed order, languages last', () => {
    const facts = { n: 5, languages: { Python: 4 }, groups: { value: 'assigned' as const, count: 3 }, exam: { value: 'closed' as const, count: 4 } }
    expect(factLabels(t, facts)).toEqual(['Closed-book exam', 'Groups assigned', 'Python'])
  })

  it('has a translated label for every answer that can be published', () => {
    for (const [k, q] of Object.entries(FACT_QUESTIONS)) {
      for (const id of Object.values(q.options)) if (id) expect(t(`studentFacts.${k}.${id}`)).not.toBe(`studentFacts.${k}.${id}`)
    }
  })

  it('prerenders the row with the count and the explanation, or nothing', () => {
    const html = studentFactsHtml(t, { n: 5, lectures: { value: 'yes', count: 4 }, languages: { 'C++': 3 } })
    expect(html).toContain('From students')
    expect(html).toContain('Lectures recorded · C++')
    expect(html).toContain('(5 students)')
    expect(html).toContain('anonymous student ratings')
    expect(studentFactsHtml(t, undefined)).toBe('')
  })

  it('travels in the detail chunk and comes back with it', () => {
    const data = structuredClone(realData())
    const code = Object.keys(data.subjects)[0]!
    data.subjects[code]!.studentFacts = { n: 3, exam: { value: 'open', count: 3 } }
    const { core, details } = splitDataset(data)
    expect(core.subjects[code]!.studentFacts).toBeUndefined()
    const d = details[code.slice(0, 4)]![code]
    expect(withDetail(core.subjects[code]!, d).studentFacts).toEqual({ n: 3, exam: { value: 'open', count: 3 } })
  })
})
