/**
 * The basics guide is split into a few categories, each its own page (/guide/<slug>/), plus an
 * overview at /guide/ and the key dates page. Every topic keeps a stable anchor id, so an old
 * /guide/#<id> link can be sent to the page that now holds it.
 */
export const GUIDE_CATEGORIES = ['basics', 'systems', 'enrolling', 'semester', 'life', 'international', 'help'] as const
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

/** Extra pages under /guide/ that aren't categories, and the category they sit in. */
export const GUIDE_EXTRA_PAGES = { 'key-dates': 'help' } as const satisfies Record<string, GuideCategory>
export type GuideExtraPage = keyof typeof GUIDE_EXTRA_PAGES

/** Topic anchors in page order, per category. */
export const GUIDE_TOPICS: Record<GuideCategory, readonly string[]> = {
  basics: ['first', 'points', 'majors', 'caps', 'rules', 'grades', 'wam'],
  systems: ['systems', 'it-help'],
  enrolling: ['enrol', 'load', 'check', 'waiver', 'timetable', 'fees'],
  semester: ['special-consideration', 'hurdles', 'late', 'integrity', 'exams', 'drop', 'fail'],
  life: ['wellbeing', 'safety', 'community', 'advocacy'],
  international: ['rsl', 'abroad'],
  help: ['dates', 'study-help', 'careers', 'uni-careers', 'accreditation', 'rankings'],
}

export function isGuideCategory(slug: string): slug is GuideCategory {
  return (GUIDE_CATEGORIES as readonly string[]).includes(slug)
}

export function isGuideExtraPage(slug: string): slug is GuideExtraPage {
  return slug in GUIDE_EXTRA_PAGES
}

/** The category whose page holds a topic anchor, or null for an unknown one. */
export function categoryOfTopic(id: string): GuideCategory | null {
  return GUIDE_CATEGORIES.find((c) => GUIDE_TOPICS[c].includes(id)) ?? null
}

/** The path (after the language part) of one topic, e.g. "guide/semester/#fail". */
export function topicPath(id: string): string {
  const c = categoryOfTopic(id)
  return c ? `guide/${c}/#${id}` : 'guide/'
}

/** What /guide/<slug> shows: the overview, a category, or the key dates page. */
export type GuidePage = { kind: 'overview' } | { kind: 'category'; category: GuideCategory } | { kind: 'extra'; page: GuideExtraPage; category: GuideCategory }

export function guidePageOf(slug: string): GuidePage {
  if (isGuideCategory(slug)) return { kind: 'category', category: slug }
  if (isGuideExtraPage(slug)) return { kind: 'extra', page: slug, category: GUIDE_EXTRA_PAGES[slug] }
  return { kind: 'overview' }
}
