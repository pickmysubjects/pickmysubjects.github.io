import { offeredIn } from './availability'
import { heldMajorIds, majorTitles, minorTitles, planComponentIds } from './courseRules'
import { planRoles } from './roles'
import { evaluateField, referencedSubjects } from './expr'
import type { Issue, Plan } from './plan'
import { termLabel } from './plan'
import { PERIOD_LABELS } from './schema'
import type { Dataset } from './schema'
import { termLoad, unfinishedIn } from './yearLong'

/**
 * Term-by-term checks: availability, prerequisites met by earlier terms,
 * corequisites, non-allowed combinations, duplicates and study load.
 */
/** Usual most points in a summer or winter term. */
export const SHORT_TERM_LOAD = 25

export function checkTerms(plan: Plan, data: Dataset, standardLoad = 50): Issue[] {
  const issues: Issue[] = []
  const seen = new Set(plan.completed)
  const everywhere = new Set([...plan.completed, ...plan.terms.flatMap((t) => t.subjects)])
  // Subjects the student's course has closed to them (B-COM's ACCT10002).
  const closed = new Set(data.courses.find((c) => c.code === plan.course)?.closed ?? [])
  const reportedPairs = new Set<string>()
  // The subjects the plan's major, specialisation and minors name (worked out only when needed).
  let own: Set<string> | undefined
  const ownSubjects = (): Set<string> => {
    if (!own) {
      const roles = planRoles(data, plan.course, plan.courseYear, planComponentIds(plan).filter((id): id is string => !!id))
      own = new Set([...roles.required, ...roles.options])
    }
    return own
  }

  plan.terms.forEach((term, termIndex) => {
    // A year-long subject begun in this year's Semester 1 is still running: not done yet, but
    // studied alongside (a corequisite).
    const running = unfinishedIn(plan.terms, termIndex, data)
    const before = new Set([...seen].filter((c) => !running.includes(c)))
    const sameTerm = new Set([...before, ...running, ...term.subjects])
    const where = termLabel(term)
    const load = termLoad(plan.terms, termIndex, data)

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

      if (closed.has(code)) {
        issues.push({ severity: 'error', kind: 'closed-to-course', subject: code, termIndex, params: { code }, message: `${code} isn't open to students in your degree.` })
        continue
      }
      if (s.discontinuedFrom !== undefined && term.year >= s.discontinuedFrom) {
        issues.push({ severity: 'error', kind: 'discontinued', subject: code, termIndex, params: { code, year: s.discontinuedFrom, instead: s.replacedBy.join(', ') }, message: `${code} doesn't run from ${s.discontinuedFrom}${s.replacedBy.length ? `; take ${s.replacedBy.join(', ')} instead` : ''}.` })
        continue
      }
      const avail = offeredIn(s, term.year, term.period)
      if (avail.status === 'fail') {
        issues.push({ severity: 'error', kind: 'not-offered', subject: code, termIndex, params: { code, year: term.year, period: term.period, assumed: avail.assumedFromYear ?? '' }, message: `${code} is not offered in ${PERIOD_LABELS[term.period]}${avail.assumedFromYear ? ` (based on ${avail.assumedFromYear} data)` : ` ${term.year}`}.` })
      } else if (avail.status === 'unknown') {
        issues.push({ severity: 'info', kind: 'offering-unknown', subject: code, termIndex, params: { code }, message: `When ${code} runs hasn't been curated yet — check the Handbook.` })
      }
      // A later year planned on an earlier year's timetable is said once for the whole plan
      // (assumedOfferings), not on every subject.

      // Taught only at a far campus (Dookie): the plan builder never picks one unless the major
      // needs it, so one added by hand gets a warning (the major's own subjects don't).
      if (s.campus && !ownSubjects().has(code)) {
        issues.push({ severity: 'warning', kind: 'far-campus', subject: code, termIndex, params: { code, campus: s.campus }, message: `${code} is taught at ${s.campus}, far from Parkville. Check you can get there before enrolling.` })
      }

      const ctx = { completed: before, sameTerm, subjects: data.subjects, admittedCourse: plan.course, majors: majorTitles(data, heldMajorIds(plan)), minors: minorTitles(data, plan.minors), marks: plan.marks, wam: plan.wam }
      const pre = evaluateField(s.prerequisites, ctx)
      if (pre.status === 'fail') {
        issues.push({ severity: 'error', kind: 'prereq-unmet', subject: code, termIndex, params: { code, year: term.year, period: term.period, needs: pre.unmet.join(', ') }, message: `${code} in ${where} needs ${pre.unmet.join(', ')} first.` })
      } else if (pre.status === 'unknown' && !plan.confirmed?.includes(code)) {
        // Name the listed subjects not yet placed before this term: usually that's why only an
        // unverifiable route ("or equivalent") is left, and adding them clears the warning.
        const missing = referencedSubjects(s.prerequisites).filter((c) => !before.has(c))
        issues.push({ severity: 'warning', kind: 'prereq-unknown', subject: code, termIndex, params: { code, needs: pre.unmet.join('; '), missing: missing.join(', '), ...(pre.advisory ? { advisory: pre.advisory.join(',') } : {}) }, message: `${code}: prerequisites can't be confirmed — ${pre.unmet.join('; ')}.` })
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


    // Summer and winter terms are short: 25 points is the usual most.
    const max = term.period === 'summer' || term.period === 'winter' ? Math.min(SHORT_TERM_LOAD, standardLoad) : standardLoad
    if (load > max) {
      issues.push({ severity: 'warning', kind: 'overload', termIndex, params: { year: term.year, period: term.period, load, max }, message: `${where} has ${load} points; more than ${max} is an overload and needs approval.` })
    }
  })

  if (plan.international) issues.push(...visaLoadIssues(plan, data))
  return issues
}

/**
 * The first planned year whose subjects are planned on an earlier year's teaching periods (that
 * year's Handbook isn't in yet), and which year's: one line at the top of the plan says so.
 */
export function assumedOfferings(plan: Pick<Plan, 'terms'>, data: Dataset): { year: number; from: number } | null {
  let out: { year: number; from: number } | null = null
  for (const term of plan.terms) {
    for (const code of term.subjects) {
      const s = data.subjects[code]
      const avail = s ? offeredIn(s, term.year, term.period) : undefined
      if (avail?.status === 'ok' && avail.assumedFromYear !== undefined && (!out || term.year < out.year)) out = { year: term.year, from: avail.assumedFromYear }
    }
  }
  return out
}

/** Points a student-visa holder normally needs each half-year (Jan–Jun, Jul–Dec). */
export const VISA_HALF_YEAR_LOAD = 50

/**
 * Student-visa holders normally study 50 points per half-year; summer counts
 * towards January–June and winter towards July–December. Less is fine in the
 * final half-year, otherwise it needs approval — so it's a warning, not an error.
 */
function visaLoadIssues(plan: Plan, data: Dataset): Issue[] {
  const halves = new Map<string, { year: number; half: 1 | 2; load: number; termIndex: number }>()
  plan.terms.forEach((term, termIndex) => {
    const half = term.period === 'summer' || term.period === 'semester-1' ? 1 : 2
    const key = `${term.year}-${half}`
    const load = (plan.recordedLoad?.[`${term.year}|${term.period}`] ?? 0) + termLoad(plan.terms, termIndex, data)
    const entry = halves.get(key) ?? { year: term.year, half, load: 0, termIndex }
    entry.load += load
    // Attach the warning to the semester rather than the short term.
    if (term.period === 'semester-1' || term.period === 'semester-2') entry.termIndex = termIndex
    halves.set(key, entry)
  })
  const withStudy = [...halves.values()].filter((h) => h.load > 0)
  const last = withStudy.at(-1)
  return withStudy
    .filter((h) => h !== last && h.load < VISA_HALF_YEAR_LOAD)
    .map((h) => ({
      severity: 'warning' as const,
      kind: `visa-underload-h${h.half}`,
      termIndex: h.termIndex,
      params: { year: h.year, half: h.half, load: h.load, min: VISA_HALF_YEAR_LOAD },
      message: `${h.year} half ${h.half}: ${h.load} points. On a student visa you normally need ${VISA_HALF_YEAR_LOAD} per half-year (summer/winter count); less needs approval unless it's your final half-year — check with Stop 1.`,
    }))
}

/**
 * What adding `code` to a term would flag, before it's added: availability,
 * prerequisites met by earlier terms, corequisites, non-allowed clashes and the
 * term's load. Issues the plan already has are left out.
 */
export function previewAdd(plan: Plan, data: Dataset, termIndex: number, code: string, standardLoad = 50): Issue[] {
  const term = plan.terms[termIndex]
  if (!term || term.subjects.includes(code)) return []
  const terms = plan.terms.map((t, i) => (i === termIndex ? { ...t, subjects: [...t.subjects, code] } : t))
  const before = checkTerms(plan, data, standardLoad)
  const hadOverload = before.some((i) => i.kind === 'overload' && i.termIndex === termIndex)
  return checkTerms({ ...plan, terms }, data, standardLoad).filter((i) => {
    if (i.severity === 'info') return false
    if (i.kind === 'overload') return i.termIndex === termIndex && !hadOverload
    if (i.kind === 'duplicate') return false
    // A later subject whose prerequisites now look different isn't this subject's problem.
    return (i.subject === code && i.termIndex === termIndex) || (i.kind === 'non-allowed' && i.params.other === code)
  })
}
