import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { forCourse } from '../src/engine/forCourse'
import { subjectDifficulty } from '../src/engine/subjectFit'
import { LOCALE_CODES, type LocaleCode } from '../src/i18n/codes'
import { interpolate, type Params, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { ja } from '../src/i18n/messages/ja'
import { ko } from '../src/i18n/messages/ko'
import { vi } from '../src/i18n/messages/vi'
import { id } from '../src/i18n/messages/id'
import { ms } from '../src/i18n/messages/ms'
import { hi } from '../src/i18n/messages/hi'
import {
  DESC_WIDTH,
  fitSentences,
  hasReviews,
  listPageDescription,
  listPageTitle,
  subjectPageDescription,
  subjectPageTitle,
  textWidth,
  TITLE_WIDTH,
  withBrand,
  type ListPage,
} from '../src/utils/seo'

const MESSAGES: Record<LocaleCode, unknown> = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** The same fallback the static pages use: a missing key shows the English text. */
const translator =
  (code: LocaleCode): Translate =>
  (key: string, params?: Params) =>
    interpolate(lookup(MESSAGES[code], key) ?? lookup(en, key) ?? key, params)

const { dataset: data } = buildDataset('real')
const subjects = Object.values(data.subjects)
const counts = { subjects: subjects.length, reviewed: subjects.filter((s) => s.discussions?.length).length }
const sci = forCourse(data, 'B-SCI').subjects
const YEAR = 2026

function subjectMeta(code: LocaleCode, c: string): { title: string; description: string } {
  const s = data.subjects[c]!
  const t = translator(code)
  return { title: subjectPageTitle(t, s, code), description: subjectPageDescription(t, s, code, { level: subjectDifficulty(sci, c, 'B-SCI', YEAR).level, year: YEAR }) }
}

describe('search widths', () => {
  it('counts Chinese, Japanese and Korean as double width and combining marks as none', () => {
    expect(textWidth('COMP10001')).toBe(9)
    expect(textWidth('墨大选课')).toBe(8)
    expect(textWidth('멜번대')).toBe(6)
    expect(textWidth('कि')).toBe(2) // क + vowel sign ि (a spacing mark)
    expect(textWidth('कं')).toBe(1) // क + anusvara (non-spacing)
  })

  it('adds whole sentences while they fit and cuts only when even the first does not', () => {
    expect(fitSentences(['Aaaa.', 'Bbbbbbbbbb.', 'Cc.'], ' ', 12)).toBe('Aaaa. Cc.')
    expect(fitSentences(['', 'Aaaa.'], ' ', 12)).toBe('Aaaa.')
    expect(fitSentences(['Aaaaaaaaaaaaaaaaaaaa.'], ' ', 10)).toBe('Aaaaaaaaa…')
  })

  it('adds the site name only when there is room', () => {
    expect(withBrand('Short')).toBe('Short | PickMySubjects')
    const long = 'x'.repeat(50)
    expect(withBrand(long)).toBe(long)
  })
})

describe('page titles and descriptions', () => {
  const PAGES: ListPage[] = ['home', 'subjects', 'guide', 'careers']

  for (const code of LOCALE_CODES) {
    const t = translator(code)
    it(`${code}: home, subjects and guide fit a search result`, () => {
      for (const page of ['home', 'subjects', 'guide'] as const) {
        expect(textWidth(listPageTitle(t, page)), `${page} title: ${listPageTitle(t, page)}`).toBeLessThanOrEqual(TITLE_WIDTH)
        const d = listPageDescription(t, page, counts)
        expect(textWidth(d), `${page} description: ${d}`).toBeLessThanOrEqual(DESC_WIDTH)
      }
    })

    if (code === 'en') continue
    it(`${code}: no title or description is empty or left in English`, () => {
      const en = translator('en')
      for (const page of PAGES) {
        const pairs: [string, string][] = [
          [listPageTitle(t, page), listPageTitle(en, page)],
          [listPageDescription(t, page, counts), listPageDescription(en, page, counts)],
        ]
        for (const [mine, english] of pairs) {
          expect(mine.trim(), page).not.toBe('')
          expect(mine, page).not.toBe(english)
        }
      }
      for (const c of ['COMP10001', 'MAST20005', 'FNCE20006']) {
        const mine = subjectMeta(code, c)
        const english = subjectMeta('en', c)
        expect(mine.title).not.toBe('')
        expect(mine.description).not.toBe('')
        expect(mine.title).not.toBe(english.title)
        expect(mine.description).not.toBe(english.description)
      }
    })
  }

  it('subject titles lead with the code, promise reviews only when the page has some, keep their language and mostly fit', () => {
    const english = new Map(subjects.map((s) => [s.code, subjectPageTitle(translator('en'), s, 'en')]))
    for (const code of LOCALE_CODES) {
      const t = translator(code)
      let fit = 0
      for (const s of subjects) {
        const title = subjectPageTitle(t, s, code)
        expect(title.startsWith(`${s.code} `)).toBe(true)
        if (code === 'en' && !hasReviews(s)) expect(title).not.toMatch(/review/i)
        // A long name may run past the width, but never at the cost of the page's own language.
        if (code !== 'en') expect(title, `${code} ${s.code}`).not.toBe(english.get(s.code))
        if (textWidth(title) <= TITLE_WIDTH) fit++
      }
      expect(fit / subjects.length, code).toBeGreaterThan(0.85)
    }
  })

  it('subject descriptions are whole sentences that fit, with the exam share and when it runs', () => {
    for (const code of LOCALE_CODES) {
      for (const s of subjects) {
        const { description } = subjectMeta(code, s.code)
        expect(description, `${code} ${s.code}`).not.toBe('')
        expect(textWidth(description), `${code} ${s.code}: ${description}`).toBeLessThanOrEqual(DESC_WIDTH)
      }
    }
    const { description } = subjectMeta('en', 'COMP10001')
    expect(description).toMatch(/^Is COMP10001 hard\?/)
    expect(description).toMatch(/Final exam 50%/)
    expect(description).toMatch(/Runs in 2026/)
  })
})
