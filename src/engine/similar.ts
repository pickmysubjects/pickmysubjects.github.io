import { periodsFor } from './availability'
import type { Subject } from './schema'
import { topicsOf } from './topics'

/**
 * Subjects close to this one: same level, sharing the most specific topics, running in the
 * planned year. Left out: ones the student already did (`done`), and ones that can't be counted
 * together with it (either subject lists the other as non-allowed), since neither is a real option.
 */
export function similarSubjects(self: Subject, subjects: Record<string, Subject>, year: number, done: ReadonlySet<string> = new Set(), limit = 4): string[] {
  const own = new Set(topicsOf(self).specific)
  if (!own.size) return []
  const area = self.code.slice(0, 4)
  const banned = new Set(self.nonAllowed === 'unknown' ? [] : self.nonAllowed)
  const scored: { code: string; score: number }[] = []
  for (const s of Object.values(subjects)) {
    if (s.code === self.code || s.level !== self.level || done.has(s.code) || banned.has(s.code)) continue
    if (s.nonAllowed !== 'unknown' && s.nonAllowed.includes(self.code)) continue
    if (s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) continue
    if (s.offerings !== 'unknown' && periodsFor(s, year).length === 0) continue
    const shared = topicsOf(s).specific.filter((x) => own.has(x)).length
    if (!shared) continue
    // Same study area breaks ties: a closer neighbour than a far faculty sharing one topic.
    scored.push({ code: s.code, score: shared * 2 + (s.code.startsWith(area) ? 1 : 0) })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((x) => x.code)
}
