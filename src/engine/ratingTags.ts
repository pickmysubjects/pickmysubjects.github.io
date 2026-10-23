/**
 * The optional "Tags" question on the rating form: a fixed list of neutral things students say
 * about a subject. The ids are the Google Form's choice values (English, never translated); the
 * labels the app shows are `ratingTags.<id>` in each language.
 */
export const RATING_TAGS = [
  'heavy-reading',
  'group-work',
  'clear-lectures',
  'fair-marking',
  'tough-exam',
  'hands-on',
  'maths-heavy',
  'writing-heavy',
  'good-for-wam',
  'interesting',
] as const
export type RatingTag = (typeof RATING_TAGS)[number]

export const isRatingTag = (x: string): x is RatingTag => (RATING_TAGS as readonly string[]).includes(x)

/** Most tags a subject page shows: the most mentioned first. */
export const TOP_TAGS = 5

/** The most mentioned tags, most first (ties by the list's order); unknown ids are left out. */
export function topTags(counts: Partial<Record<string, number>> | undefined, max = TOP_TAGS): { tag: RatingTag; n: number }[] {
  if (!counts) return []
  return RATING_TAGS.map((tag) => ({ tag, n: counts[tag] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
}
