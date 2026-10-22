import type { PresetName, Subject } from '@/engine'

/**
 * The title wording for a subject's page: it says "reviews" only when the page shows some
 * (students' own ratings from three or more people, or a public review summary), so the title
 * never promises more than the page has.
 */
export function subjectTitleKey(s: Subject): 'seo.subjectTitle' | 'seo.subjectTitleReviews' {
  const rated = s.signals !== undefined && s.signals.reviews >= 3
  return rated || s.discussions?.length ? 'seo.subjectTitleReviews' : 'seo.subjectTitle'
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
