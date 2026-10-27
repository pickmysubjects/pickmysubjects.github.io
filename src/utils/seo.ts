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
/** The site's one name, as search results should show it. */
export const BRAND = 'PickMySubjects'

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
export type ListPage = 'home' | 'subjects' | 'guide' | 'careers' | 'majors'

export function listPageTitle(t: Translate, page: ListPage): string {
  if (page === 'home') return t('seo.homeTitle')
  return withBrand(t(`seo.${page}Title`))
}

/** `subjects` is how many subjects have a page, `reviewed` how many have review summaries. */
export function listPageDescription(t: Translate, page: ListPage, counts: { subjects: number; reviewed: number }): string {
  if (page === 'home') return t('seo.homeDesc', { n: counts.reviewed })
  if (page === 'subjects') return t('seo.subjectsDesc', { n: counts.subjects, r: counts.reviewed })
  return t(`seo.${page}Desc`)
}

/** Whether a subject's page shows what students say: our own ratings (3+) or review summaries. */
export function hasReviews(s: Subject): boolean {
  return (s.signals !== undefined && s.signals.reviews >= 3) || !!s.discussions?.length
}

/** What the title and description may say about difficulty: the verdict and whether students back it. */
export type TitleDifficulty = { level: DifficultyLevel; factsOnly: boolean }

/** The final exam's share from the recorded assessment; undefined when none is recorded. */
export function examShare(s: Subject): number | undefined {
  if (!s.assessment?.length) return undefined
  return Math.round(s.assessment.filter((x) => x.kind === 'exam').reduce((sum, x) => sum + x.weight, 0))
}

/** A difficulty verdict a search result may state: only one students' reviews back. */
function backedLevel(d?: TitleDifficulty): Exclude<DifficultyLevel, 'unknown'> | undefined {
  return d && !d.factsOnly && d.level !== 'unknown' ? d.level : undefined
}

/**
 * A subject page's search title: the code first (what students type), then the name, then the
 * answer they want: how hard it is (only when students' reviews back the verdict, otherwise the
 * question itself), the final exam's share (only when the assessment is recorded) and "reviews"
 * (only when the page has some). The longest wording that fits is used: the site name goes first,
 * then "reviews", then the exam; the code, a name and the verdict always stay.
 */
export function subjectPageTitle(t: Translate, s: Subject, locale: string, difficulty?: TitleDifficulty): string {
  const local = localTitle(s, locale)
  const names = [...new Set([withLocalTitle(s.title, local), local, s.title].filter(Boolean))]
  const level = backedLevel(difficulty)
  const lead = level ? t(`seo.titleLevel.${level}`) : t('seo.titleHard')
  const share = examShare(s)
  const exam = share === undefined ? '' : share === 0 ? t('seo.titleNoExam') : t('seo.titleExam', { n: share })
  const reviews = hasReviews(s) ? t('seo.titleReviews') : ''
  const sep = t('seo.titleSep')
  // After a question mark the facts follow with a space ("is it hard? 50% exam"), not a comma.
  const join = (parts: string[]) => {
    const rest = parts.filter(Boolean).join(sep)
    return rest ? lead + (/？$/.test(lead) ? '' : /\?$/.test(lead) ? ' ' : sep) + rest : lead
  }
  const rests = [...new Set([join([exam, reviews]), join([exam]), lead])]
  const candidates = rests.flatMap((rest) =>
    names.flatMap((title) => {
      const form = t('seo.titleForm', { code: s.code, title, rest })
      return [`${form} | ${BRAND}`, form]
    }),
  )
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
 * The plain fact sentences a subject page leads with, most useful first: is it hard (only when
 * students' reviews back it), the exam's share, class hours, hurdles, when it runs, what students
 * say, prerequisites. Only what the data records; nothing about what it doesn't.
 */
export function subjectFactSentences(t: Translate, s: Subject, locale: LocaleCode, opts: { difficulty: TitleDifficulty; year: number }): string[] {
  const cjk = CJK.has(locale)
  const listSep = cjk ? '、' : ', '
  const end = cjk ? '。' : locale === 'hi' ? '।' : '.'
  const level = backedLevel(opts.difficulty)
  const sig = s.signals && s.signals.reviews >= 3 ? s.signals : undefined
  const rated = sig && sig.difficulty !== undefined && sig.workload !== undefined && sig.grading !== undefined
  const tasks = s.assessment ?? []
  const hurdle = tasks.some((x) => x.kind === 'exam' && x.hurdle) ? t('assess.mustPassExam') : tasks.some((x) => x.hurdle) ? t('assess.hurdles') : ''
  return [
    level ? t(`seo.verdict.${level}`, { code: s.code }) : '',
    // Each at-a-glance line (exam share first, then class hours, group work) as its own sentence.
    ...subjectGist(t, s).map((g) => `${g}${end}`),
    hurdle ? `${hurdle}${end}` : '',
    runsLine(t, s, opts.year, listSep),
    rated ? t('seo.ratings', { d: sig.difficulty!, w: sig.workload!, g: sig.grading!, n: sig.reviews }) : '',
    s.discussions?.length ? t('seo.reviewsHere') : '',
    s.prerequisites === 'none' ? t('seo.noPrereq') : s.prerequisites === 'unknown' ? '' : t('seo.needs', { needs: describeReq(t, s.prerequisites, 'B-SCI') }),
  ].filter(Boolean)
}

/**
 * A subject page's search description: whole sentences of concrete facts (subjectFactSentences,
 * then what it teaches and what the subject is), as many as fit.
 */
export function subjectPageDescription(t: Translate, s: Subject, locale: LocaleCode, opts: { difficulty: TitleDifficulty; year: number }): string {
  const title = withLocalTitle(s.title, localTitle(s, locale))
  const firstPoint = s.discussions?.find((d) => d.points.length)?.points[0]
  return fitSentences(
    [
      ...subjectFactSentences(t, s, locale, opts),
      firstPoint ? pickLocalized(firstPoint, locale) : '',
      s.about ? pickLocalized(s.about.learn, locale) : '',
      t('seo.subjectDesc', { code: s.code, title, level: s.level, points: s.points }),
      t('seo.rateDesc'),
    ],
    CJK.has(locale) ? '' : ' ',
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
