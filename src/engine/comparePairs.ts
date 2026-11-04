import type { Subject } from './schema'

/**
 * Two subjects a student weighs up against each other, with their own page (/compare/A-vs-B/):
 * pairs that can't both count (the Handbook's "non-allowed subjects"), at undergraduate level, and
 * not the same subject at another level (Spanish 3 listed as SPAN20002 and SPAN30001).
 */
export type Pair = readonly [string, string]

const SEP = '-vs-'
const CODE = /^[A-Z]{4}\d{5}$/

/** The page address for a pair, codes in order so each pair has one page. */
export function pairSlug(a: string, b: string): string {
  return [a, b].sort().join(SEP)
}

/** The two codes in a /compare/ address, or null when it isn't one. */
export function pairFromSlug(slug: string): Pair | null {
  const [a = '', b = '', ...rest] = slug.toUpperCase().split(SEP.toUpperCase())
  return !rest.length && CODE.test(a) && CODE.test(b) && a !== b ? [a, b] : null
}

const undergrad = (code: string) => Number(code[4]) < 9

/** Every pair with its own page: each sorted once. */
export function comparePairs(subjects: Record<string, Subject>): Pair[] {
  const seen = new Set<string>()
  const out: Pair[] = []
  for (const s of Object.values(subjects)) {
    if (s.nonAllowed === 'unknown' || !undergrad(s.code)) continue
    for (const o of s.nonAllowed) {
      const other = subjects[o]
      if (!other || !undergrad(o) || other.title.toLowerCase() === s.title.toLowerCase()) continue
      const key = pairSlug(s.code, o)
      if (seen.has(key)) continue
      seen.add(key)
      out.push([s.code, o].sort() as unknown as Pair)
    }
  }
  return out.sort((x, y) => x[0].localeCompare(y[0]) || x[1].localeCompare(y[1]))
}

/** Whether these two have a page of their own (the Handbook lists either as not allowed with the other). */
export function isComparePair(subjects: Record<string, Subject>, a: string, b: string): boolean {
  const lists = (x: string, y: string) => {
    const s = subjects[x]
    return !!s && s.nonAllowed !== 'unknown' && s.nonAllowed.includes(y)
  }
  const [s, o] = [subjects[a], subjects[b]]
  return !!s && !!o && undergrad(a) && undergrad(b) && s.title.toLowerCase() !== o.title.toLowerCase() && (lists(a, b) || lists(b, a))
}
