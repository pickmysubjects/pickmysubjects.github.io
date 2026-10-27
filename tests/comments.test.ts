import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLUMNS, rowsToObjects } from '../scripts/ratings/aggregate'
import { buildComments, COMMENT_COLUMNS, commentId, screenComment } from '../scripts/ratings/comments'
import { commentsFileSchema, MIN_COMMENTS } from '../src/engine/comments'
import { tipsHtml } from '../src/utils/tipsHtml'
import { interpolate, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { splitDataset, withDetail } from '../src/engine/split'

const now = new Date('2026-10-26')
const header = [...Object.values(COLUMNS), COMMENT_COLUMNS.wish, COMMENT_COLUMNS.language, COMMENT_COLUMNS.show]
type Over = Partial<Record<keyof typeof COLUMNS | keyof typeof COMMENT_COLUMNS, string>>
let n = 0
function row(over: Over = {}): string[] {
  n += 1
  const base: Record<string, string> = {
    timestamp: `2026/10/0${(n % 9) + 1} 10:00:${String(n).padStart(2, '0')}`,
    code: 'COMP30027',
    year: '2025',
    semester: 'Semester 1',
    difficulty: '4',
    workload: '4',
    generosity: '3',
    hours: '10',
    grade: 'H1',
    skills: 'maths',
    recommend: 'Yes',
    wamBand: '75-79',
    overall: '5',
    wish: `Start the projects early, tip ${n}.`,
    language: 'en',
    show: 'TRUE',
  }
  const keys = [...Object.keys(COLUMNS), ...Object.keys(COMMENT_COLUMNS)] as (keyof Over)[]
  return keys.map((k) => over[k] ?? base[k] ?? '')
}
const build = (...rows: string[][]) => buildComments(rowsToObjects([header, ...rows]), now)

describe('screenComment (automatic filter)', () => {
  it('keeps plain advice, trimmed and with spaces collapsed', () => {
    expect(screenComment('  Do the  weekly quizzes.\n They add up.  ')).toBe('Do the weekly quizzes. They add up.')
    expect(screenComment('第 3 周开始难度上来了，早点做作业。')).toBe('第 3 周开始难度上来了，早点做作业。')
    expect(screenComment('Week 10 has a 30% exam, revise from week 6.')).not.toBeNull()
  })

  it.each([
    ['email', 'Ask me at jo.blo@student.unimelb.edu.au'],
    ['url', 'Notes at https://example.com/notes'],
    ['bare domain', 'Everything is on mynotes.io'],
    ['www', 'see www.notes'],
    ['phone', 'Text me on 0412 345 678'],
    ['intl phone', 'call +61 3 9035 5511'],
    ['student number', 'my id 1234567 if you want'],
    ['handle', 'DM @someone on insta'],
    ['Dr', 'Dr Smith marks hard'],
    ['Prof.', 'Prof. Jane is great'],
    ['tutor', 'tutor John was helpful'],
    ['lecturer', 'The lecturer Alice reads slides'],
    ['老师', '王老师讲得很好'],
    ['教授', '张教授很严格'],
  ])('drops a comment with %s', (_, text) => {
    expect(screenComment(text)).toBeNull()
  })

  it('drops comments that are too long or empty, never cutting them', () => {
    expect(screenComment('a'.repeat(400))).toHaveLength(400)
    expect(screenComment('a'.repeat(401))).toBeNull()
    expect(screenComment('  ')).toBeNull()
  })
})

describe('buildComments', () => {
  it('drops a comment with no year (blank is not year 0), so the file still validates', () => {
    const out = build(row({ year: '' }), row(), row(), row())
    expect(out.COMP30027).toHaveLength(3)
    expect(commentsFileSchema.safeParse(out).success).toBe(true)
  })

  it('publishes only approved rows (Show = TRUE)', () => {
    const out = build(row(), row(), row(), row({ show: 'FALSE', wish: 'Not approved yet.' }), row({ show: '', wish: 'No tick.' }))
    expect(out.COMP30027).toHaveLength(3)
    expect(JSON.stringify(out)).not.toMatch(/approved yet|No tick/)
  })

  it('needs MIN_COMMENTS approved, filtered comments before a subject appears at all', () => {
    expect(MIN_COMMENTS).toBe(3)
    expect(build(row(), row())).toEqual({})
    // An approved comment the filter drops doesn't count towards the three.
    expect(build(row(), row(), row({ wish: 'email me a@b.co' }))).toEqual({})
    expect(Object.keys(build(row(), row(), row()))).toEqual(['COMP30027'])
  })

  it('keeps only text, term and language: nothing else from the row', () => {
    const out = build(row({ grade: 'H1', wamBand: '80-84' }), row({ grade: 'N', semester: 'Semester 2' }), row({ grade: 'P', language: 'zh-CN', semester: '' }))
    for (const c of out.COMP30027 ?? []) {
      expect(Object.keys(c).sort()).toEqual(expect.arrayContaining(['id', 'lang', 'text', 'year']))
      expect(Object.keys(c).every((k) => ['id', 'lang', 'text', 'year', 'period'].includes(k))).toBe(true)
    }
    const json = JSON.stringify(out)
    for (const leak of ['H1', '80-84', '"N"', '2026/10', 'maths', 'Yes', 'timestamp', 'grade', 'difficulty']) expect(json).not.toContain(leak)
    expect(out.COMP30027?.find((c) => c.lang === 'zh-CN')?.period).toBeUndefined()
  })

  it('falls back to en for an unknown language and ids are hashes, not row numbers', () => {
    const out = build(row({ language: 'xx' }), row(), row())
    expect(out.COMP30027?.every((c) => c.lang === 'en')).toBe(true)
    const c = out.COMP30027![0]!
    expect(c.id).toBe(commentId('COMP30027', c.text))
    expect(c.id).toMatch(/^[0-9a-f]{12}$/)
  })

  it('orders newest term first, then a fixed order that does not follow arrival', () => {
    const rows = [
      row({ year: '2024', wish: 'Old one.' }),
      row({ year: '2025', semester: 'Semester 1', wish: 'Mid one.' }),
      row({ year: '2025', semester: 'Semester 2', wish: 'Newer one.' }),
      row({ year: '2025', semester: 'Semester 2', wish: 'Another newer one.' }),
    ]
    const out = build(...rows).COMP30027!
    expect(out.map((c) => [c.year, c.period])).toEqual([
      [2025, 'semester-2'],
      [2025, 'semester-2'],
      [2025, 'semester-1'],
      [2024, 'semester-1'],
    ])
    // Same result whatever order the rows came in.
    expect(build(...[...rows].reverse()).COMP30027).toEqual(out)
  })

  it('counts a repeated text once and skips made-up subject codes', () => {
    const same = { wish: 'Same text.' }
    expect(build(row(same), row({ ...same, timestamp: 'x' }), row())).toEqual({})
    expect(buildComments(rowsToObjects([header, row(), row(), row()]), now, new Set(['INFO10001']))).toEqual({})
  })

  it('writes a file that matches the schema; the schema rejects extra fields and short lists', () => {
    const out = build(row(), row(), row({ semester: 'Winter' }))
    expect(commentsFileSchema.safeParse(out).success).toBe(true)
    const one = out.COMP30027![0]!
    expect(commentsFileSchema.safeParse({ COMP30027: [one, one] }).success).toBe(false)
    expect(commentsFileSchema.safeParse({ COMP30027: [{ ...one, grade: 'H1' }, one, one] }).success).toBe(false)
  })

  it('the committed file is valid', () => {
    const file = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'real', 'comments.json'), 'utf8'))
    expect(commentsFileSchema.safeParse(file).success).toBe(true)
  })
})

describe('tips on the page', () => {
  const t: Translate = (key, params) => {
    const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en)
    return interpolate(String(v), params)
  }
  const tips = build(row(), row(), row(), row(), row({ wish: 'a <b>bold</b> claim' })).COMP30027!

  it('prerenders three, the rest under "Show all", escaped, with the term', () => {
    const html = tipsHtml(t, tips)
    expect(html).toContain('Tips from students')
    expect(html).toContain('Show all 5')
    expect(html).toContain('2025 Sem 1')
    expect(html).not.toContain('<b>')
    expect(html.match(/<li /g)).toHaveLength(5)
  })

  it('prerenders nothing below MIN_COMMENTS', () => {
    expect(tipsHtml(t, tips.slice(0, 2))).toBe('')
    expect(tipsHtml(t, undefined)).toBe('')
  })

  it('comments travel with the subject detail, not the core bundle', () => {
    const s = { code: 'COMP30027', comments: tips } as never
    const { core, details } = splitDataset({ subjects: { COMP30027: s } } as never)
    expect(core.subjects.COMP30027).not.toHaveProperty('comments')
    expect(withDetail(core.subjects.COMP30027!, details.COMP?.COMP30027).comments).toEqual(tips)
  })
})
