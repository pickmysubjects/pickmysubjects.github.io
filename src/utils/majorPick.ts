import type { Subject } from '@/engine/schema'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * How a "choose from this list" group is said. Counted in subjects ("pick 2 of 6") only when every
 * subject on the list is 12.5 points, else in points ("25 points from 32"): a list of 6.25-point
 * music subjects or one with a 25-point subject has no fixed number of subjects.
 */
export function pickText(
  t: Translate,
  base: 'majors.tagPick' | 'majors.sumPick' | 'majors.statPick',
  choose: { points: number; from: string[] },
  subjects: Record<string, Subject | undefined>,
  extra: Record<string, string | number> = {},
): string {
  const of = choose.from.length
  const even = choose.from.every((code) => (subjects[code]?.points ?? 12.5) === 12.5)
  return even ? t(base, { ...extra, n: choose.points / 12.5, of }) : t(`${base}Pts`, { ...extra, pts: choose.points, of })
}
