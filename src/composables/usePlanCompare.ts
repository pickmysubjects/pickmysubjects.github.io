import { computed, type Ref } from 'vue'
import { alignTimeline, checkCourse, checkTerms, creditPoints, exactWam, findDiploma, informalPicks, marksForConditions, passedCodes, planComponentIds, planProblems, planRules, findCourse, forCourse, planRoles, planStress, requiredWithPrerequisites, termLoad, termsWithCarried, type CourseRule, type Dataset, type PlanFacts, type RuleStatus } from '@/engine'
import { predictMark, RANGE_Z } from '@/engine/predict'
import { summariseAssessment } from '@/utils/assessment'
import { careerJobLabels } from '@/utils/careersHtml'
import { commencementYear, withPrefs, type PlanSetup } from './planStore'
import { useDataset } from './useDataset'
import { useProfile } from './useProfile'
import { planFor } from './usePlan'
import type { PlanEntry } from './usePlans'

/** A plan's major (+ specialisation) and minor titles, '' for whichever isn't picked. */
export function setupTitles(data: Dataset, setup: Pick<PlanSetup, 'major' | 'major2' | 'specialisation' | 'minors'>): { major: string; minor: string; minorInformal: boolean } {
  const title = (id: string | undefined) => (id ? data.components.find((c) => c.id === id)?.title : undefined)
  return {
    major: [title(setup.major), setup.major ? title(setup.major2) : undefined, title(setup.specialisation)].filter(Boolean).join(' + '),
    minor: (setup.minors ?? []).map(title).filter(Boolean).join(' + '),
    minorInformal: informalPicks(data, setup.minors),
  }
}

/** A plan's concurrent diploma with its stream ("Diploma in Languages (French Studies)"), '' for none. */
export function diplomaTitle(data: Dataset, setup: Pick<PlanSetup, 'diploma' | 'diplomaStream'>): string {
  const diploma = findDiploma(data, setup.diploma)
  if (!diploma) return ''
  const stream = setup.diplomaStream && diploma.streams.includes(setup.diplomaStream) ? data.components.find((c) => c.id === setup.diplomaStream)?.title : undefined
  return stream ? `${diploma.title} (${stream})` : diploma.title
}

/** One plan as the compare page shows it: who it is, what it's for, and its facts. */
export interface ComparedPlan {
  entry: PlanEntry
  courseTitle: string
  major: string
  minor: string
  minorInformal: boolean
  diploma: string
  /** Every rule's status, with the rule's own words (for the failures list). */
  statuses: RuleStatus[]
  rules: CourseRule[]
  facts: PlanFacts
  /** Job names the plan's majors and minors lead to (their Handbook pages), in the reader's language. */
  careers: string[]
}

/**
 * The student's plans, each judged on its own degree with its own strengths and goal, on the one
 * shared record: everything the compare page shows, from the engine only.
 */
export function useComparePlans(entries: Ref<PlanEntry[]>, locale: Ref<string>) {
  const { all } = useDataset()
  const { stored } = useProfile()

  function compared(entry: PlanEntry): ComparedPlan {
    const { setup, terms } = entry.state
    const profile = withPrefs(stored.value, entry.prefs)
    const data = forCourse(all, setup.course)
    const plan = planFor(entry.state, profile, data)
    const codes = terms.flatMap((t) => t.subjects)
    const year = commencementYear(setup, stored.value.results)
    const components = planComponentIds(setup).filter((id): id is string => !!id)
    const roles = planRoles(data, setup.course, year, components)
    const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), codes, data.subjects, setup.course)
    const levels = planStress(termsWithCarried(terms, data), data, profile, fixed, setup.course).terms.map((s) => s.level)
    const check = checkCourse(plan, data)
    const course = findCourse(data, setup.course, year)
    const titles = setupTitles(data, setup)
    const pts = (c: string) => data.subjects[c]?.points ?? 12.5
    const passed = passedCodes(stored.value.results)
    const passedSet = new Set(passed)
    const points = [...new Set([...passed, ...codes])].reduce((sum, c) => sum + pts(c), 0) + creditPoints(stored.value.credit)
    const required = (course?.totalPoints ?? 0) + (findDiploma(data, setup.diploma)?.totalPoints ?? 0)
    // The heaviest semester: the most points, and of those the heaviest for this student.
    const rank = { ok: 0, heavy: 1, veryHeavy: 2 } as const
    let heaviest: PlanFacts['heaviest'] = null
    terms.forEach((t, i) => {
      const p = termLoad(terms, i, data)
      const level = levels[i] ?? 'ok'
      if (p > 0 && (!heaviest || p > heaviest.points || (p === heaviest.points && rank[level] > rank[heaviest.level]))) heaviest = { year: t.year, period: t.period, points: p, level }
    })
    // Counted as the planner counts them (planProblems), so the two pages never disagree.
    const problems = planProblems([...checkTerms(plan, data, course?.standardLoad), ...check.issues], passedSet)
    const at = problems.find((i) => i.termIndex !== undefined)
    const used = terms.filter((t) => t.subjects.length)
    const assessed = codes.map((c) => summariseAssessment(data.subjects[c]?.assessment)).filter((a) => a !== null)
    // Predicted WAM: the record's marks, plus each planned subject at its predicted mark (and at
    // the low and high ends of its likely range). Only with marks to go on. A subject planned twice
    // counts once, and one already passed on the record not at all (the plan has it by mistake).
    const marks = new Map(Object.entries(marksForConditions(stored.value.results, data)))
    let wam: PlanFacts['wam'] = null
    if (marks.size) {
      const guesses = [...new Set(codes)].flatMap((c) => {
        const s = data.subjects[c]
        const g = s && !s.passFail && !passedSet.has(c) ? predictMark(s, marks, data) : null
        return g ? [{ code: c, g }] : []
      })
      const at = (pick: (g: { mark: number; low: number; high: number }) => number) =>
        exactWam([...stored.value.results, ...guesses.map(({ code, g }) => ({ code, mark: pick(g) }))], data)
      const mark = at((g) => g.mark)
      const low = at((g) => g.low)
      const high = at((g) => g.high)
      // Each planned subject's share of the WAM and its error (its likely range is ±RANGE_Z sd),
      // for telling two plans' WAMs apart (wamGapSd).
      const counted = stored.value.results.filter((r) => r.mark !== undefined && !data.subjects[r.code]?.passFail).reduce((sum, r) => sum + pts(r.code), 0)
      const total = counted + guesses.reduce((sum, x) => sum + pts(x.code), 0)
      const planned = guesses.map(({ code, g }) => ({ code, share: pts(code) / total, sd: (g.high - g.low) / 2 / RANGE_Z }))
      if (mark !== null && low !== null && high !== null) wam = { mark, low, high, planned }
    }
    const careers = [...new Set(components.flatMap((id) => careerJobLabels(data, id, locale.value)))]
    const facts: PlanFacts = {
      points,
      required,
      short: Math.max(0, required - points),
      rules: {
        total: check.statuses.length,
        failed: check.statuses.filter((s) => s.status === 'fail').length,
        unknown: check.statuses.filter((s) => s.status === 'unknown').length,
      },
      finish: used.length ? { year: used.at(-1)!.year, period: used.at(-1)!.period } : null,
      heaviest,
      heavy: levels.filter((l) => l !== 'ok').length,
      problems: problems.length,
      problemTerm: at ? { year: terms[at.termIndex!]!.year, period: terms[at.termIndex!]!.period } : null,
      exams: { withExam: assessed.filter((a) => a.exam > 0).length, known: assessed.length },
      hurdles: assessed.filter((a) => a.examHurdle || a.otherHurdle).length,
      wam,
    }
    return {
      entry,
      courseTitle: course?.title ?? setup.course,
      ...titles,
      diploma: diplomaTitle(data, setup),
      statuses: check.statuses,
      rules: planRules(data, plan),
      facts,
      careers,
    }
  }

  const plans = computed(() => entries.value.map(compared))
  const timeline = computed(() => alignTimeline(entries.value.map((e) => e.state.terms), (ts, i) => termLoad(ts, i, all)))
  return { plans, timeline }
}
