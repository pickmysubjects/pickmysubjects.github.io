import { evaluateField, referencedSubjects } from './expr'
import type { Dataset } from './schema'

/** How a subject matters to a major or specialisation. */
export interface SubjectRole {
  component: string
  title: string
  kind: 'major' | 'specialisation'
  /** core: compulsory; option: one of a list to choose from; pathway: a prerequisite on the way to a core or option subject. */
  role: 'core' | 'option' | 'pathway' | 'route'
  /** pathway: can't be skipped on the way to `via`; route: one of several ways to it. */
  via?: string
}

const PATHWAY_DEPTH = 3

/**
 * Majors and specialisations of `course` that list this subject, or need it
 * (through up to three prerequisite steps) before one of their subjects.
 */
export function subjectRoles(data: Dataset, code: string, course: string): SubjectRole[] {
  const out: SubjectRole[] = []
  const blocked = blockedWithout(data, code, course)
  for (const c of data.components) {
    if (c.course !== course || c.requirements === 'unknown') continue
    const core = new Set(c.requirements.flatMap((r) => ('all' in r ? r.all : [])))
    const options = new Set(c.requirements.flatMap((r) => ('choose' in r ? r.choose.from : [])).filter((x) => !core.has(x)))
    const base = { component: c.id, title: c.title, kind: c.kind }
    if (core.has(code)) out.push({ ...base, role: 'core' })
    else if (options.has(code)) out.push({ ...base, role: 'option' })
    else {
      // Prefer leading to a compulsory subject over an option.
      const all = [...core, ...options]
      const needed = all.filter((x) => blocked.has(x)).sort()
      const via = needed.find((x) => core.has(x)) ?? needed[0]
      if (via) out.push({ ...base, role: 'pathway', via })
      else {
        const route = leadsTo(data, code, [...core]) ?? leadsTo(data, code, [...options])
        if (route) out.push({ ...base, role: 'route', via: route })
      }
    }
  }
  return out
}

/** The first of `targets` whose prerequisites reach `code` within a few steps. */
function leadsTo(data: Dataset, code: string, targets: string[]): string | undefined {
  for (const target of targets.sort()) {
    let frontier = [target]
    const seen = new Set(frontier)
    for (let depth = 0; depth < PATHWAY_DEPTH && frontier.length; depth++) {
      const next: string[] = []
      for (const c of frontier) {
        const s = data.subjects[c]
        if (!s) continue
        for (const r of referencedSubjects(s.prerequisites)) {
          if (r === code) return target
          if (!seen.has(r)) {
            seen.add(r)
            next.push(r)
          }
        }
      }
      frontier = next
    }
  }
  return undefined
}

/**
 * Subjects that can't be taken at all without `code`: their prerequisites fail
 * when it (and anything that itself needs it) is missing. Unknown or manual
 * conditions count as passable, so this errs towards "not required".
 */
function blockedWithout(data: Dataset, code: string, course: string): Set<string> {
  const blocked = new Set([code])
  let changed = true
  while (changed) {
    changed = false
    const completed = new Set(Object.keys(data.subjects).filter((c) => !blocked.has(c)))
    for (const s of Object.values(data.subjects)) {
      if (blocked.has(s.code) || !referencedSubjects(s.prerequisites).some((r) => blocked.has(r))) continue
      if (evaluateField(s.prerequisites, { completed, subjects: data.subjects, admittedCourse: course }).status === 'fail') {
        blocked.add(s.code)
        changed = true
      }
    }
  }
  blocked.delete(code)
  return blocked
}
