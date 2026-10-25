import { factsYear, periodsFor, type PresetName, type Subject } from '@/engine'
import type { DifficultyLevel } from '@/engine/subjectFit'
import type { LocaleCode } from '@/i18n/codes'
import { describeReq } from '@/i18n/format'
import { subjectGist } from '@/i18n/gist'
import type { Translate } from '@/i18n/interpolate'
import { localTitle, pickLocalized, withLocalTitle } from '@/i18n/localized'

/** Roughly what a search result shows of a title and of a description before cutting it off. */
export const TITLE_WIDTH = 60
export const DESC_WIDTH = 155
const BRAND = 'PickMySubjects'

// Chinese, Japanese and Korean characters (and full-width punctuation) take about twice the room
// of a Latin letter in a search result; combining marks (Hindi vowel signs and the like) take none.
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u
const MARK = /\p{Mn}/u

/** How much room a text takes in a search result, counted in Latin letters. */
export function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += MARK.test(ch) ? 0 : WIDE.test(ch) ? 2 : 1
  return w
}

/** The first candidate that fits; the last one when none does. */
export function firstThatFits(candidates: string[], max = TITLE_WIDTH): string {
  return candidates.find((c) => textWidth(c) <= max) ?? candidates[candidates.length - 1] ?? ''
}

/** The site's name after the title when there's room for it (search results show it anyway). */
export function withBrand(title: string): string {
  return firstThatFits([`${title} | ${BRAND}`, title])
}

/**
 * Whole sentences in order of importance, each added only if it still fits, so a description
 * never ends mid-sentence. When not even the first fits, it is cut short.
 */
export function fitSentences(sentences: string[], sep: string, max = DESC_WIDTH): string {
  const out: string[] = []
  let width = 0
  for (const s of sentences.filter(Boolean)) {
    const w = textWidth(s) + (out.length ? textWidth(sep) : 0)
    if (width + w <= max) {
      out.push(s)
      width += w
    }
  }
  if (out.length || !sentences.some(Boolean)) return out.join(sep)
  let cut = ''
  for (const ch of sentences.find(Boolean)!) {
    if (textWidth(cut + ch) > max - 1) break
    cut += ch
  }
  return `${cut}…`
}

/** Pages whose search title and description are fixed text in each language. */
export type ListPage = 'home' | 'subjects' | 'guide' | 'careers'

export function listPageTitle(t: Translate, page: ListPage): string {
  if (page === 'home') return t('seo.homeTitle')
  if (page === 'careers') return `${t('careerPath.title')} | ${BRAND}`
  return withBrand(t(page === 'subjects' ? 'seo.subjectsTitle' : 'seo.guideTitle'))
}

/** `subjects` is how many subjects have a page, `reviewed` how many have review summaries. */
export function listPageDescription(t: Translate, page: ListPage, counts: { subjects: number; reviewed: number }): string {
  if (page === 'home') return t('seo.homeDesc', { n: counts.reviewed })
  if (page === 'subjects') return t('seo.subjectsDesc', { n: counts.subjects, r: counts.reviewed })
  if (page === 'guide') return t('seo.guideDesc')
  return t('careerPath.lede')
}

/** Whether a subject's page shows what students say: our own ratings (3+) or review summaries. */
export function hasReviews(s: Subject): boolean {
  return (s.signals !== undefined && s.signals.reviews >= 3) || !!s.discussions?.length
}

/**
 * A subject page's search title: the code first, then the name, then what a student searching
 * the code wants to know ("is it hard? reviews, workload, exams"), in that page's language. It
 * says "reviews" only when the page has some. The longest wording that fits is used, trying the
 * name with and without its translation; past that, the university's name goes, then words.
 */
export function subjectPageTitle(t: Translate, s: Subject, locale: string): string {
  const local = localTitle(s, locale)
  const names = [...new Set([withLocalTitle(s.title, local), local, s.title].filter(Boolean))]
  const tiers = hasReviews(s)
    ? ['seo.subjectTitleReviews.long', 'seo.subjectTitleReviews.mid', 'seo.subjectTitle.short']
    : ['seo.subjectTitle.long', 'seo.subjectTitle.mid', 'seo.subjectTitle.short']
  const uni = t('seo.uni')
  const candidates = tiers.flatMap((key) => {
    const forms = names.map((title) => t(key, { code: s.code, title }))
    return [...forms.map((f) => `${f} | ${uni}`), ...forms]
  })
  // A very long name runs past the width rather than lose the words in the page's language.
  return firstThatFits(candidates)
}

/**
 * "Runs in 2026: Summer, Semester 1." or why it doesn't, as the subject page says it. The year
 * named is the one the facts come from (factsYear), so 2026 timetables never read as 2027's.
 */
export function runsLine(t: Translate, s: Subject, wanted: number, listSep: string): string {
  if (s.offerings === 'unknown') return t('seo.notRecorded')
  const year = factsYear(s, wanted).year
  const periods = periodsFor(s, year)
  return periods.length ? t('seo.runs', { year, periods: periods.map((p) => t(`period.${p}`)).join(listSep) }) : t('seo.notRunning', { year })
}

const CJK = new Set(['zh-CN', 'zh-TW', 'ja'])

/**
 * A subject page's search description: whole sentences of concrete facts, most useful first
 * (is it hard, the exam's share, when it runs, what students say), as many as fit. `level` is the
 * page's own "is it hard?" verdict for Bachelor of Science students.
 */
export function subjectPageDescription(t: Translate, s: Subject, locale: LocaleCode, opts: { level: DifficultyLevel; year: number }): string {
  const cjk = CJK.has(locale)
  const listSep = cjk ? '、' : ', '
  const end = cjk ? '。' : locale === 'hi' ? '।' : '.'
  const gist = subjectGist(t, s)
  const sig = s.signals && s.signals.reviews >= 3 ? s.signals : undefined
  const rated = sig && sig.difficulty !== undefined && sig.workload !== undefined && sig.grading !== undefined
  const firstPoint = s.discussions?.find((d) => d.points.length)?.points[0]
  const title = withLocalTitle(s.title, localTitle(s, locale))
  return fitSentences(
    [
      opts.level === 'unknown' ? '' : t(`seo.verdict.${opts.level}`, { code: s.code }),
      // Each at-a-glance line (exam share first, then class hours, group work) as its own sentence.
      ...gist.map((g) => `${g}${end}`),
      runsLine(t, s, opts.year, listSep),
      rated ? t('seo.ratings', { d: sig.difficulty!, w: sig.workload!, g: sig.grading!, n: sig.reviews }) : '',
      s.discussions?.length ? t('seo.reviewsHere') : '',
      firstPoint ? pickLocalized(firstPoint, locale) : '',
      s.prerequisites === 'none' ? t('seo.noPrereq') : s.prerequisites === 'unknown' ? '' : t('seo.needs', { needs: describeReq(t, s.prerequisites, 'B-SCI') }),
      s.about ? pickLocalized(s.about.learn, locale) : '',
      t('seo.subjectDesc', { code: s.code, title, level: s.level, points: s.points }),
      t('seo.rateDesc'),
    ],
    cjk ? '' : ' ',
  )
}

/** The search title of each quick pick's own page (/subjects/no-exam/…); it takes `{year}`. */
export const PRESET_TITLE_KEYS: Record<PresetName, 'seo.presetNoExam' | 'seo.presetBreadth' | 'seo.presetFirstSemester' | 'seo.presetSummerWinter'> = {
  summerWinter: 'seo.presetSummerWinter',
  noExam: 'seo.presetNoExam',
  breadth: 'seo.presetBreadth',
  firstSemester: 'seo.presetFirstSemester',
}

/** Overall scores a subject needs before its page carries rating markup. */
export const MIN_RATING_MARKUP = 3

/**
 * schema.org AggregateRating for a subject's page: only from students' own overall scores given
 * here (never public review summaries or curated numbers), and only once 3+ people gave one.
 */
export function aggregateRatingLd(s: Subject): object | undefined {
  const g = s.signals
  if (!g || g.overall === undefined || (g.overallCount ?? 0) < MIN_RATING_MARKUP) return undefined
  return { '@type': 'AggregateRating', ratingValue: g.overall, ratingCount: g.overallCount, bestRating: 5, worstRating: 1 }
}
