/**
 * The basics guide is split into a few categories, each its own page (/guide/<slug>/), plus an
 * overview at /guide/ and the key dates page. Every topic keeps a stable anchor id, so an old
 * link to a topic (/guide/#<id>, or a section that no longer holds it) is sent to the page that
 * holds it now.
 */
export const GUIDE_CATEGORIES = ['basics', 'systems', 'enrolling', 'semester', 'life', 'international', 'help'] as const
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

/** Extra pages under /guide/ that aren't categories, and the category they sit in. */
export const GUIDE_EXTRA_PAGES = { 'key-dates': 'help' } as const satisfies Record<string, GuideCategory>
export type GuideExtraPage = keyof typeof GUIDE_EXTRA_PAGES

/** Every page after the overview, in reading order (the 墨大入门 menu and the previous/next links). */
export const GUIDE_PAGES = [...GUIDE_CATEGORIES, 'key-dates'] as const
export type GuidePageSlug = (typeof GUIDE_PAGES)[number]

/**
 * Topic anchors in page order, per page. Each topic lives on exactly one page: the one a student
 * would look in for it. Other pages link to it instead of repeating it.
 */
export const GUIDE_TOPICS: Record<GuidePageSlug, readonly string[]> = {
  basics: ['first', 'points', 'majors', 'caps', 'rules', 'grades', 'wam'],
  systems: ['systems', 'systems-class', 'systems-lookup'],
  enrolling: ['enrol', 'plans', 'load', 'check', 'waiver', 'timetable', 'late-enrol', 'cross-institutional', 'exchange', 'fees'],
  semester: ['special-consideration', 'hurdles', 'late', 'integrity', 'exams', 'drop', 'fail'],
  life: ['wellbeing', 'safety', 'community', 'advocacy'],
  international: ['rsl', 'online', 'abroad'],
  help: ['it-help', 'study-help', 'careers', 'uni-careers', 'accreditation', 'rankings'],
  'key-dates': ['dates'],
}

/** The message key of each topic's title (the topic's h2 and its line in "On this page"). */
const TITLE_KEYS: Record<string, string> = {
  first: 'guide.firstTitle',
  points: 'guide.pointsTitle',
  majors: 'guide.majorsTitle',
  caps: 'guide.capsTitle',
  rules: 'guide.rulesTitle',
  grades: 'guide.gradesTitle',
  wam: 'guide.wamTitle',
  enrol: 'guide.enrolTitle',
  plans: 'guide.plansTitle',
  load: 'guide.loadTitle',
  check: 'guide.checkTitle',
  waiver: 'guide.waiverTitle',
  timetable: 'guide.ttTitle',
  'late-enrol': 'guide.lateEnrolTitle',
  'cross-institutional': 'guide.crossTitle',
  exchange: 'guide.exchangeTitle',
  fees: 'guide.feesTitle',
  'special-consideration': 'guide.specTitle',
  hurdles: 'guide.hurdleTitle',
  late: 'guide.lateTitle',
  integrity: 'guide.integrityTitle',
  exams: 'guide.examsTitle',
  drop: 'guide.dropTitle',
  fail: 'guide.failTitle',
  rsl: 'guide.rslTitle',
  online: 'guide.onlineTitle',
  abroad: 'guide.abroadTitle',
  'study-help': 'guide.helpTitle',
  careers: 'guide.careersTitle',
  accreditation: 'guide.accTitle',
  rankings: 'guide.rankTitle',
  dates: 'guide.datesTitle',
}

/** The message key of a topic's title; service-list topics keep theirs under guide.svcTopic. */
export function topicTitleKey(id: string): string {
  return TITLE_KEYS[id] ?? `guide.svcTopic.${id}.title`
}

/**
 * When the guide's facts were last checked against the official pages. Not shown on the page;
 * kept up to date for search data (a page's last-modified date).
 */
export const GUIDE_CHECKED = '2026-10-28'

/**
 * "On this page" earns its place from four headed sections up: with fewer, the whole page is
 * about a screen or two of reading, and a list of two or three links only repeats the headings
 * the reader can already see. The page then gives the article the full width.
 */
export const TOC_MIN_SECTIONS = 4

export function showToc(sections: number): boolean {
  return sections >= TOC_MIN_SECTIONS
}

export function isGuideCategory(slug: string): slug is GuideCategory {
  return (GUIDE_CATEGORIES as readonly string[]).includes(slug)
}

export function isGuideExtraPage(slug: string): slug is GuideExtraPage {
  return slug in GUIDE_EXTRA_PAGES
}

/** The page that holds a topic anchor, or null for an unknown one. */
export function pageOfTopic(id: string): GuidePageSlug | null {
  return GUIDE_PAGES.find((p) => GUIDE_TOPICS[p].includes(id)) ?? null
}

/** The category whose page holds a topic anchor (key dates count as Help), or null for an unknown one. */
export function categoryOfTopic(id: string): GuideCategory | null {
  const p = pageOfTopic(id)
  return p === null ? null : isGuideExtraPage(p) ? GUIDE_EXTRA_PAGES[p] : p
}

/** The path (after the language part) of one topic, e.g. "guide/semester/#fail". */
export function topicPath(id: string): string {
  const p = pageOfTopic(id)
  return p ? `guide/${p}/#${id}` : 'guide/'
}

/** The pages before and after one, for reading straight through; null at either end (the overview). */
export function neighbours(slug: GuidePageSlug): { prev: GuidePageSlug | null; next: GuidePageSlug | null } {
  const i = GUIDE_PAGES.indexOf(slug)
  return { prev: GUIDE_PAGES[i - 1] ?? null, next: GUIDE_PAGES[i + 1] ?? null }
}

/** What /guide/<slug> shows: the overview, a category, or the key dates page. */
export type GuidePage = { kind: 'overview' } | { kind: 'category'; category: GuideCategory } | { kind: 'extra'; page: GuideExtraPage; category: GuideCategory }

export function guidePageOf(slug: string): GuidePage {
  if (isGuideCategory(slug)) return { kind: 'category', category: slug }
  if (isGuideExtraPage(slug)) return { kind: 'extra', page: slug, category: GUIDE_EXTRA_PAGES[slug] }
  return { kind: 'overview' }
}

/** The slug of a page (null for the overview). */
export function slugOf(page: GuidePage): GuidePageSlug | null {
  return page.kind === 'overview' ? null : page.kind === 'category' ? page.category : page.page
}

/**
 * Where a guide address with a #topic should go when that topic lives on another page: an old
 * one-page link (/guide/#wam) or a topic that moved section (/guide/help/#dates). Null when the
 * topic is already here, or the anchor isn't a topic (a term on the key dates page, say).
 */
export function movedGuideAnchor(slug: string, id: string): string | null {
  const p = id ? pageOfTopic(id) : null
  if (!p || p === slug) return null
  return `guide/${p}/#${id}`
}
