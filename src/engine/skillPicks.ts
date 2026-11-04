import type { Dataset } from './schema'
import { DIPLOMA_ONLY, prereqStatus, type Standing } from './recommend'

/**
 * For a skill a career asks for that the student's subjects don't show yet: the subjects that would
 * give it to them (careers.skillSubjects, lowest level first), and the ones already in their plan.
 *
 * A pick counts in the student's degree, isn't done or planned, doesn't clash with one that is (the
 * Handbook's non-allowed subjects, either way round). Closest matches first; within those, ones
 * whose prerequisites they already meet, then ones resting on something we can't check, then the rest.
 */
export interface SkillPicks {
  /** Subjects in the plan (not done yet) that teach it. */
  planned: string[]
  /** Up to `limit` subjects to add. */
  picks: string[]
}

const PREREQ_ORDER = { ok: 0, unknown: 1, fail: 2 } as const

export function skillPicks(
  skill: string,
  opts: { data: Dataset; course: string; done: readonly string[]; planned: readonly string[]; standing: Standing },
  limit = 3,
): SkillPicks {
  const { data, course } = opts
  const tiers = data.careers?.skillSubjects?.[skill] ?? []
  const teaching = tiers.flat()
  const tierOf = new Map(tiers.flatMap((t, i) => t.map((c) => [c, i] as const)))
  const done = new Set(opts.done)
  const planned = new Set(opts.planned.filter((c) => !done.has(c)))
  const taken = new Set([...done, ...planned])
  const clashes = (code: string) => {
    const s = data.subjects[code]!
    if (s.nonAllowed !== 'unknown' && s.nonAllowed.some((c) => taken.has(c))) return true
    return [...taken].some((c) => {
      const o = data.subjects[c]
      return !!o && o.nonAllowed !== 'unknown' && o.nonAllowed.includes(code)
    })
  }
  // As the planner reads a degree: where its subjects are categorised, one with no category there
  // (or one only a diploma counts) gives no credit; graduate subjects only when the degree lists them.
  const categorised = Object.values(data.subjects).some((x) => x.categories[course] !== undefined)
  const counts = (code: string) => {
    const cat = data.subjects[code]!.categories[course]
    if (data.subjects[code]!.level > 3 && !cat) return false
    return !categorised || (cat !== undefined && cat !== DIPLOMA_ONLY)
  }
  const candidates = teaching.filter((c) => !!data.subjects[c] && counts(c) && !taken.has(c) && !clashes(c))
  const rank = new Map(candidates.map((c, i) => [c, i]))
  const status = (c: string) => prereqStatus(data.subjects[c]!, opts.standing, { subjects: data.subjects, course }).status
  const ordered = candidates
    .map((c) => ({ c, p: PREREQ_ORDER[status(c) as keyof typeof PREREQ_ORDER] ?? 1 }))
    .sort((a, b) => tierOf.get(a.c)! - tierOf.get(b.c)! || a.p - b.p || rank.get(a.c)! - rank.get(b.c)!)
    .map((x) => x.c)
  // Never two that can't both count (ACCT10001 and ACCT10002): the student would take one.
  const picks: string[] = []
  for (const c of ordered) {
    if (picks.length >= limit) break
    const s = data.subjects[c]!
    const exclusive = picks.some((p) => (s.nonAllowed !== 'unknown' && s.nonAllowed.includes(p)) || (data.subjects[p]!.nonAllowed !== 'unknown' && (data.subjects[p]!.nonAllowed as string[]).includes(c)))
    if (!exclusive) picks.push(c)
  }
  return { planned: teaching.filter((c) => planned.has(c)), picks }
}
