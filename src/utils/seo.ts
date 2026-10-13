import type { Subject } from '@/engine'

/**
 * The title wording for a subject's page: it says "reviews" only when the page shows some
 * (students' own ratings from three or more people, or a public review summary), so the title
 * never promises more than the page has.
 */
export function subjectTitleKey(s: Subject): 'seo.subjectTitle' | 'seo.subjectTitleReviews' {
  const rated = s.signals !== undefined && s.signals.reviews >= 3
  return rated || s.discussion ? 'seo.subjectTitleReviews' : 'seo.subjectTitle'
}
