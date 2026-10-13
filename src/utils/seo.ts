import type { PresetName, Subject } from '@/engine'

/**
 * The title wording for a subject's page: it says "reviews" only when the page shows some
 * (students' own ratings from three or more people, or a public review summary), so the title
 * never promises more than the page has.
 */
export function subjectTitleKey(s: Subject): 'seo.subjectTitle' | 'seo.subjectTitleReviews' {
  const rated = s.signals !== undefined && s.signals.reviews >= 3
  return rated || s.discussion ? 'seo.subjectTitleReviews' : 'seo.subjectTitle'
}

/** The search title of each quick pick's own page (/subjects/no-exam/…); it takes `{year}`. */
export const PRESET_TITLE_KEYS: Record<PresetName, 'seo.presetNoExam' | 'seo.presetBreadth' | 'seo.presetFirstSemester'> = {
  noExam: 'seo.presetNoExam',
  breadth: 'seo.presetBreadth',
  firstSemester: 'seo.presetFirstSemester',
}
