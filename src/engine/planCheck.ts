import { offeredIn } from './availability'
import { evaluateField } from './expr'
import type { Issue, Plan } from './plan'
import { termLabel } from './plan'
import { PERIOD_LABELS } from './schema'
import type { Dataset } from './schema'

/**
 * Term-by-term checks: availability, prerequisites met by earlier terms,
 * corequisites, non-allowed combinations, duplicates and study load.
 */
export function checkTerms(plan: Plan, data: Dataset, standardLoad = 50): Issue[] {
  const issues: Issue[] = []
  const seen = new Set(plan.completed)
  const everywhere = new Set([...plan.completed, ...plan.terms.flatMap((t) => t.subjects)])
  const reportedPairs = new Set<string>()

  plan.terms.forEach((term, termIndex) => {
    const before = new Set(seen)
    const sameTerm = new Set([...before, ...term.subjects])
    const where = termLabel(term)
    let load = 0

    for (const code of term.subjects) {
      const s = data.subjects[code]
      if (seen.has(code)) {
        issues.push({ severity: 'error', kind: 'duplicate', subject: code, termIndex, params: { code, year: term.year, period: term.period }, message: `${code} is planned more than once (again in ${where}).` })
      }
      seen.add(code)
      if (!s) {
        issues.push({ severity: 'warning', kind: 'not-in-dataset', subject: code, termIndex, params: { code }, message: `${code} isn't in the dataset yet, so nothing about it can be checked.` })
        continue
      }
      load += s.points

      const avail = offeredIn(s, term.year, term.period)
      if (avail.status === 'fail') {
        issues.push({ severity: 'error', kind: 'not-offered', subject: code, termIndex, params: { code, year: term.year, period: term.period, assumed: avail.assumedFromYear ?? '' }, message: `${code} is not offered in ${PERIOD_LABELS[term.period]}${avail.assumedFromYear ? ` (based on ${avail.assumedFromYear} data)` : ` ${term.year}`}.` })
      } else if (avail.status === 'unknown') {
        issues.push({ severity: 'info', kind: 'offering-unknown', subject: code, termIndex, params: { code }, message: `When ${code} runs hasn't been curated yet — check the Handbook.` })
      } else if (avail.assumedFromYear) {
        issues.push({ severity: 'info', kind: 'offering-assumed', subject: code, termIndex, params: { code, year: term.year, period: term.period, assumed: avail.assumedFromYear ?? '' }, message: `${code} in ${where} assumes the ${avail.assumedFromYear} timetable repeats.` })
      }

      const ctx = { completed: before, subjects: data.subjects, admittedCourse: plan.course }
      const pre = evaluateField(s.prerequisites, ctx)
      if (pre.status === 'fail') {
        issues.push({ severity: 'error', kind: 'prereq-unmet', subject: code, termIndex, params: { code, year: term.year, period: term.period, needs: pre.unmet.join(', ') }, message: `${code} in ${where} needs ${pre.unmet.join(', ')} first.` })
      } else if (pre.status === 'unknown') {
        issues.push({ severity: 'warning', kind: 'prereq-unknown', subject: code, termIndex, params: { code, needs: pre.unmet.join('; ') }, message: `${code}: prerequisites can't be confirmed — ${pre.unmet.join('; ')}.` })
      }

      const co = evaluateField(s.corequisites, { ...ctx, completed: sameTerm })
      if (co.status === 'fail') {
        issues.push({ severity: 'error', kind: 'coreq-unmet', subject: code, termIndex, params: { code, needs: co.unmet.join(', ') }, message: `${code} needs ${co.unmet.join(', ')} in the same or an earlier term.` })
      }

      // Non-allowed works both ways, but the Handbook often lists it on one side only
      // (e.g. only on a subject already completed).
      const clashes = new Set(s.nonAllowed !== 'unknown' ? s.nonAllowed.filter((o) => everywhere.has(o)) : [])
      for (const other of everywhere) {
        const o = data.subjects[other]
        if (o && o.nonAllowed !== 'unknown' && o.nonAllowed.includes(code)) clashes.add(other)
      }
      for (const other of clashes) {
        const pair = [code, other].sort().join('|')
        if (reportedPairs.has(pair)) continue
        reportedPairs.add(pair)
        issues.push({ severity: 'error', kind: 'non-allowed', subject: code, termIndex, params: { code, other }, message: `${code} and ${other} can't both count — they're non-allowed with each other.` })
      }
    }

    if (load > standardLoad) {
      issues.push({ severity: 'warning', kind: 'overload', termIndex, params: { year: term.year, period: term.period, load, max: standardLoad }, message: `${where} has ${load} points; more than ${standardLoad} is an overload and needs approval.` })
    }
  })

  return issues
}
