import { BookOpen, Laptop } from 'lucide-vue-next'
import { MENUS, type MenuItem } from './nav'
import { GUIDE_EXTRA_PAGES, GUIDE_TOPICS, GUIDE_PAGES, isGuideExtraPage, topicTitleKey } from '@/utils/guideSections'
import { SERVICE_TOPICS } from '@/utils/guideServices'

type Icon = MenuItem['icon']

/**
 * What the site search finds besides subjects: every menu item (features) and every guide topic,
 * built once from the menus and the guide's own lists, so it never drifts from them. Names and
 * extra words (`search.syn.<id>`) come from the messages, in the page's language and English.
 */
export type FeatureGroup = 'feature' | 'guide'

export interface FeatureEntry {
  /** Unique; also picks the extra words, search.syn.<syn>. */
  id: string
  group: FeatureGroup
  /** Path after the language part, as in the menus. */
  to: string
  title: string
  desc?: string
  syn?: string
  icon: Icon
}

/** Extra words for menu items, by path (search.syn.<key>). */
const MENU_SYN: Record<string, string> = {
  'subjects/': 'allSubjects',
  'subjects/easy/': 'easy',
  'subjects/hard/': 'hard',
  'subjects/no-exam/': 'noExam',
  'subjects/summer-winter/': 'summerWinter',
  'subjects/breadth/': 'breadth',
  'subjects/first-semester/': 'firstSem',
  'majors/': 'majors',
  'careers/': 'careers',
  'plan/': 'plan',
  'plan/?compare=1': 'compareAB',
  'plan/#rules': 'rules',
  'plan/#heavy': 'heavy',
  'plan/#calendar': 'calendar',
  'tools/final/': 'final',
  'tools/wam/': 'wam',
  'shortlist/#compare-title': 'compare',
  'record/': 'record',
  'shortlist/': 'shortlist',
  'record/#sec-backup': 'backup',
  'record/#share-title': 'gradeShare',
  'about/': 'about',
  'feedback/': 'feedback',
  'contribute/': 'contribute',
  'changes/': 'changes',
  'privacy/': 'privacy',
  'guide/key-dates/': 'dates',
}

/** Extra words for guide topics, by topic anchor (search.syn.<key>). */
const TOPIC_SYN: Record<string, string> = {
  points: 'points',
  grades: 'grades',
  wam: 'wamTopic',
  enrol: 'enrol',
  timetable: 'timetable',
  load: 'load',
  fees: 'fees',
  'special-consideration': 'specCon',
  hurdles: 'hurdles',
  integrity: 'integrity',
  exams: 'exams',
  drop: 'drop',
  fail: 'fail',
  rsl: 'rsl',
  wellbeing: 'wellbeing',
  'uni-careers': 'uniCareers',
}

function build(): FeatureEntry[] {
  const out: FeatureEntry[] = []
  for (const m of MENUS) {
    for (const item of m.items) {
      out.push({
        id: `menu:${item.to}`,
        group: m.area === 'guide' ? 'guide' : 'feature',
        to: item.to,
        title: item.key,
        desc: item.desc,
        syn: MENU_SYN[item.to],
        icon: item.icon,
      })
    }
  }
  // Every guide topic, as a jump to its place on its page. A page that is a single topic (the
  // systems page, key dates) is already in the menu.
  for (const page of GUIDE_PAGES) {
    const topics = GUIDE_TOPICS[page]
    if (topics.length < 2) continue
    // The page's name as the line under each topic, so "WAM" reads as "WAM · Getting started".
    const pageName = `guide.cat.${isGuideExtraPage(page) ? GUIDE_EXTRA_PAGES[page] : page}.nav`
    for (const id of topics) {
      out.push({ id: `topic:${id}`, group: 'guide', to: `guide/${page}/#${id}`, title: topicTitleKey(id), desc: pageName, syn: TOPIC_SYN[id], icon: BookOpen })
    }
  }
  // The official systems (Canvas, my.unimelb, Okta…), each with its own place on the systems page.
  for (const s of SERVICE_TOPICS.systems) {
    out.push({ id: `svc:${s.id}`, group: 'guide', to: `guide/systems/#svc-${s.id}`, title: `guide.svc.${s.id}.name`, desc: `guide.svc.${s.id}.text`, icon: Laptop })
  }
  return out
}

export const FEATURE_INDEX: readonly FeatureEntry[] = build()

/** Lower case, full-width folded, Latin accents dropped (Vietnamese "mon de" finds "môn dễ"). */
export function fold(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/([a-z])[̀-ͯ]+/g, '$1')
    .replace(/đ/g, 'd')
    .normalize('NFC')
    .replace(/[()（）「」“”"'‘’·・、，,/／]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The texts of one message key: the page's language first, then English (always loaded). */
export type Texts = (key: string) => string[]

export interface FeatureHit {
  entry: FeatureEntry
  score: number
}

/**
 * The features and guide topics matching a query, best first. Every word of the query must appear
 * in the entry's name, its line or its extra words; a name that starts with the query ranks first.
 */
export function searchFeatures(query: string, texts: Texts, entries: readonly FeatureEntry[] = FEATURE_INDEX): FeatureHit[] {
  const q = fold(query)
  if (!q) return []
  const words = q.split(' ')
  const hits: FeatureHit[] = []
  for (const entry of entries) {
    const titles = texts(entry.title).map(fold)
    const descs = entry.desc ? texts(entry.desc).map(fold) : []
    const syns = entry.syn ? texts(`search.syn.${entry.syn}`).flatMap((s) => s.split('|')).map(fold) : []
    const all = [...titles, ...descs, ...syns].join(' | ')
    if (!words.every((w) => all.includes(w))) continue
    let score = 10
    if (titles.some((t) => t === q)) score = 100
    else if (syns.some((s) => s === q)) score = 90
    else if (titles.some((t) => t.startsWith(q))) score = 80
    else if (syns.some((s) => s.startsWith(q))) score = 70
    else if (titles.some((t) => t.includes(q))) score = 60
    else if (syns.some((s) => s.includes(q))) score = 50
    else if (descs.some((d) => d.includes(q))) score = 30
    // The page's own language (the first text) a little ahead of the English fallback.
    if (titles[0]?.includes(q)) score += 2
    // A whole page before a jump into part of one.
    if (!entry.to.includes('#')) score += 1
    hits.push({ entry, score })
  }
  return hits.sort((a, b) => b.score - a.score)
}
