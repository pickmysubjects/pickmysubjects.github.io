import type { Club } from '@/content/clubs'
import type { Dataset, Subject } from './schema'
import { topicsOf } from './topics'

/** Why a club came up: an interest the student picked, what their subjects are about, or their degree. */
export type ClubReason = { kind: 'interest'; topic: string } | { kind: 'studied'; topic: string } | { kind: 'degree' }

export interface ClubSuggestion {
  club: Club
  reasons: ClubReason[]
}

// An interest the student picked counts most; their own degree's society next; then what the
// subjects they've done or planned are about.
const INTEREST = 3
const DEGREE = 2
const STUDIED = 1

/**
 * Clubs that fit this student, best first: by the interests they picked, their degree, and the
 * topics of the subjects on their record and plan. A club needs at least one reason to show.
 */
export function suggestClubs(
  clubs: readonly Club[],
  opts: { interests: readonly string[]; course?: string; codes: readonly string[]; data: Dataset },
  limit = 5,
): ClubSuggestion[] {
  const interests = new Set(opts.interests)
  const studied = new Set(opts.codes.flatMap((c) => (opts.data.subjects[c] ? topicsOf(opts.data.subjects[c]!).specific : [])))
  const scored = clubs.map((club, i) => {
    const reasons: ClubReason[] = []
    for (const topic of club.topics) if (interests.has(topic)) reasons.push({ kind: 'interest', topic })
    if (opts.course && club.courses?.includes(opts.course)) reasons.push({ kind: 'degree' })
    for (const topic of club.topics) if (!interests.has(topic) && studied.has(topic)) reasons.push({ kind: 'studied', topic })
    const score = reasons.reduce((sum, r) => sum + (r.kind === 'interest' ? INTEREST : r.kind === 'degree' ? DEGREE : STUDIED), 0)
    return { club, reasons, score, i }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(({ club, reasons }) => ({ club, reasons }))
}

/** How many written reviews our summaries of a subject cover. */
const reviews = (s: Subject) => (s.discussions ?? []).reduce((sum, d) => sum + ('reviews' in d ? d.reviews : 0), 0)

/**
 * Subjects about what a club is about (its topics), for its page: those sharing most of its
 * topics first, then the most reviewed, then the earlier year level. Subjects no longer running
 * are left out.
 */
export function clubSubjects(club: Club, data: Dataset, limit = 6): string[] {
  if (!club.topics.length) return []
  const topics = new Set<string>(club.topics)
  const overlap = (s: Subject) => topicsOf(s).specific.filter((x) => topics.has(x)).length
  return Object.values(data.subjects)
    .filter((s) => s.level <= 3 && s.discontinuedFrom === undefined && overlap(s) > 0)
    .sort((a, b) => overlap(b) - overlap(a) || reviews(b) - reviews(a) || a.level - b.level || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((s) => s.code)
}

/**
 * Other clubs like this one: those sharing its topics (most shared first). A club with no topics
 * (a cultural or games club) gets others in its UMSU category instead.
 */
export function similarClubs(club: Club, clubs: readonly Club[], limit = 6): Club[] {
  const shared = (c: Club) => c.topics.filter((x) => club.topics.includes(x)).length
  const others = clubs.filter((c) => c.slug !== club.slug)
  const like = club.topics.length ? others.filter((c) => shared(c) > 0) : others.filter((c) => c.category === club.category)
  return like.sort((a, b) => shared(b) - shared(a) || a.name.localeCompare(b.name)).slice(0, limit)
}
