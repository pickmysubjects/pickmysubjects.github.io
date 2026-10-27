import { knownNotRunning, TOPIC_GROUPS, type Subject } from '@/engine'

export interface SearchOptions {
  /** A topic's name in the page's language (and in Chinese: students search in Chinese anywhere). */
  topicNames: (topic: string) => string[]
  /** A topic group's names, the same way (计算机, Computing). */
  groupNames: (group: string) => string[]
  /** The year whose timetable says what runs "now". */
  year: number
  limit: number
}

const GROUP_TOPICS = new Map(TOPIC_GROUPS.map((g) => [g.id, new Set<string>(g.topics)]))

/** Still running in `year`: not discontinued by then and not known to have no teaching periods. */
export function runsNow(s: Subject, year: number): boolean {
  return !(s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) && !knownNotRunning(s, year)
}

/**
 * The search box's matches: a code match first; then subjects still running before ones that
 * stopped or don't run this year, each with title matches (English and Chinese) before topic
 * matches ("计算机" finds the computing subjects, not only titles with that word).
 */
export function searchSubjects(list: readonly Subject[], query: string, o: SearchOptions): Subject[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const has = (text: string | undefined) => !!text && text.toLowerCase().includes(q)
  // Topic names are words, not letters: only a query of two characters or more searches them.
  const topics = new Set<string>()
  if ([...q].length >= 2) {
    for (const g of TOPIC_GROUPS) {
      if (o.groupNames(g.id).some(has)) for (const t of GROUP_TOPICS.get(g.id) ?? []) topics.add(t)
      for (const t of g.topics) if (o.topicNames(t).some(has)) topics.add(t)
    }
  }
  const rank = (s: Subject): number => {
    if (s.code.toLowerCase().startsWith(q)) return 0
    if (has(s.code)) return 1
    if (has(s.title) || has(s.titles?.zh) || has(s.titles?.['zh-TW'])) return 2
    if (s.topics.some((t) => topics.has(t))) return 3
    return -1
  }
  // Among topic matches, the subjects most about it first (share of their topics that match).
  const share = (s: Subject) => (s.topics.length ? s.topics.filter((t) => topics.has(t)).length / s.topics.length : 0)
  return list
    .map((s) => ({ s, r: rank(s), w: share(s) }))
    .filter((x) => x.r >= 0)
    // A code typed is that subject; otherwise running subjects first, title matches before topic ones.
    .sort((a, b) => Number(a.r > 1) - Number(b.r > 1) || Number(runsNow(b.s, o.year)) - Number(runsNow(a.s, o.year)) || a.r - b.r || b.w - a.w || a.s.code.localeCompare(b.s.code))
    .slice(0, o.limit)
    .map((x) => x.s)
}
