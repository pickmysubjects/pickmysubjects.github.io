import { checkCourse, previewAdd, referencedSubjects, type Dataset, type Plan } from '@/engine'

/**
 * Where a subject goes in a plan: a term, the elective it takes the place of (if any), and
 * whether that term is then over the usual load (the plan's own checks say so).
 */
export interface PinSpot {
  termIndex: number
  replace?: string
  over?: boolean
}

/**
 * Where a subject the student picked before having a plan ("Add to plan" on a subject's page)
 * goes in the plan just built: the first term where it fits with nothing wrong (it runs then,
 * its prerequisites come earlier, there's room). Failing that, in place of a free elective in
 * such a term: one the degree and major don't name, no other planned subject needs, and whose
 * swap breaks no degree rule. Failing that too, the first term it can go in at all, on top of
 * the load: the student asked for it, and the plan says the term is heavy. Null when nowhere
 * works (it doesn't run, or its prerequisites aren't planned), so the page says it wasn't added.
 * `keep` holds the subjects the degree and major name (required and listed options).
 */
export function pinSpot(plan: Plan, data: Dataset, code: string, keep: ReadonlySet<string>, load: number): PinSpot | null {
  if (!data.subjects[code] || plan.terms.some((t) => t.subjects.includes(code)) || plan.completed.includes(code)) return null
  const clean = (termIndex: number, replace?: string) =>
    !previewAdd(plan, data, termIndex, code, load, replace).some((i) => i.severity === 'error' || i.kind === 'overload')
  for (let i = 0; i < plan.terms.length; i++) if (clean(i)) return { termIndex: i }

  // Subjects other planned ones lean on (prerequisites, corequisites): never traded away.
  const needed = new Set(
    plan.terms.flatMap((t) => t.subjects).flatMap((c) => {
      const s = data.subjects[c]
      return s ? [...referencedSubjects(s.prerequisites), ...referencedSubjects(s.corequisites)] : []
    }),
  )
  const errors = (p: Plan) => checkCourse(p, data).issues.filter((i) => i.severity === 'error').length
  const before = errors(plan)
  for (let i = 0; i < plan.terms.length; i++) {
    for (const e of plan.terms[i]!.subjects) {
      if (keep.has(e) || needed.has(e) || !clean(i, e)) continue
      const swapped = { ...plan, terms: plan.terms.map((t, j) => (j === i ? { ...t, subjects: t.subjects.map((c) => (c === e ? code : c)) } : t)) }
      if (errors(swapped) <= before) return { termIndex: i, replace: e }
    }
  }
  for (let i = 0; i < plan.terms.length; i++) {
    if (!previewAdd(plan, data, i, code, load).some((x) => x.severity === 'error')) return { termIndex: i, over: true }
  }
  return null
}
