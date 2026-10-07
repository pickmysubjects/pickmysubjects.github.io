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
        issues.push({ severity: 'error', kind: 'duplicate', subject: code, termIndex, message: `${code} is planned more than once (again in ${where}).` })
      }
      seen.add(code)
      if (!s) {
        issues.push({ severity: 'warning', kind: 'not-in-dataset', subject: code, termIndex, message: `${code} isn't in the dataset yet, so nothing about it can be checked.` })
        continue
      }
      load += s.points

      const avail = offeredIn(s, term.year, term.period)
      if (avail.status === 'fail') {
        issues.push({ severity: 'error', kind: 'not-offered', subject: code, termIndex, message: `${code} is not offered in ${PERIOD_LABELS[term.period]}${avail.assumedFromYear ? ` (based on ${avail.assumedFromYear} data)` : ` ${term.year}`}.` })
      } else if (avail.status === 'unknown') {
        issues.push({ severity: 'info', kind: 'offering-unknown', subject: code, termIndex, message: `When ${code} runs hasn't been curated yet — check the Handbook.` })
      } else if (avail.assumedFromYear) {
        issues.push({ severity: 'info', kind: 'offering-assumed', subject: code, termIndex, message: `${code} in ${where} assumes the ${avail.assumedFromYear} timetable repeats.` })
      }

      const ctx = { completed: before, subjects: data.subjects, admittedCourse: plan.course }
      const pre = evaluateField(s.prerequisites, ctx)
      if (pre.status === 'fail') {
        issues.push({ severity: 'error', kind: 'prereq-unmet', subject: code, termIndex, message: `${code} in ${where} needs ${pre.unmet.join(', ')} first.` })
      } else if (pre.status === 'unknown') {
        issues.push({ severity: 'warning', kind: 'prereq-unknown', subject: code, termIndex, message: `${code}: prerequisites can't be confirmed — ${pre.unmet.join('; ')}.` })
      }

      const co = evaluateField(s.corequisites, { ...ctx, completed: sameTerm })
      if (co.status === 'fail') {
        issues.push({ severity: 'error', kind: 'coreq-unmet', subject: code, termIndex, message: `${code} needs ${co.unmet.join(', ')} in the same or an earlier term.` })
      }

      if (s.nonAllowed !== 'unknown') {
        for (const other of s.nonAllowed) {
          const pair = [code, other].sort().join('|')
          if (everywhere.has(other) && !reportedPairs.has(pair)) {
            reportedPairs.add(pair)
            issues.push({ severity: 'error', kind: 'non-allowed', subject: code, termIndex, message: `${code} and ${other} can't both count — they're non-allowed with each other.` })
          }
        }
      }
    }

    if (load > standardLoad) {
      issues.push({ severity: 'warning', kind: 'overload', termIndex, message: `${where} has ${load} points; more than ${standardLoad} is an overload and needs approval.` })
    }
  })

  return issues
}
