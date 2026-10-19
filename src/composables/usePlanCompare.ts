import { computed, type Ref } from 'vue'
import { checkCourse, comparePlans, informalPicks, planComponentIds, findCourse, forCourse, planRoles, planStress, requiredWithPrerequisites, type Dataset, type RuleStatus } from '@/engine'
import type { PlanSetup } from './planStore'
import { useDataset } from './useDataset'
import { useProfile } from './useProfile'
import { planFor } from './usePlan'
import type { PlanEntry } from './usePlans'

export interface CompareSummary {
  entry: PlanEntry
  courseTitle: string
  /** Major (+ specialisation) titles, or '' when none is picked yet. */
  major: string
  /** Minor titles, or '' when there's none. */
  minor: string
  /** The minor picks are informal specialisations (B-DES). */
  minorInformal: boolean
  statuses: RuleStatus[]
  met: number
}

/** A plan's major (+ specialisation) and minor titles, '' for whichever isn't picked. */
export function setupTitles(data: Dataset, setup: Pick<PlanSetup, 'major' | 'major2' | 'specialisation' | 'minors'>): { major: string; minor: string; minorInformal: boolean } {
  const title = (id: string | undefined) => (id ? data.components.find((c) => c.id === id)?.title : undefined)
  return {
    major: [title(setup.major), setup.major ? title(setup.major2) : undefined, title(setup.specialisation)].filter(Boolean).join(' + '),
    minor: (setup.minors ?? []).map(title).filter(Boolean).join(' + '),
    minorInformal: informalPicks(data, setup.minors),
  }
}

/** Two of the student's plans, read side by side (each judged against its own degree). */
export function usePlanCompare(a: Ref<PlanEntry | undefined>, b: Ref<PlanEntry | undefined>) {
  const { all } = useDataset()
  const { stored } = useProfile()

  function side(entry: PlanEntry) {
    const { setup, terms } = entry.state
    // Judged with this plan's own strengths and goal, on the shared record.
    const profile = { ...stored.value, ...entry.prefs }
    const data = forCourse(all, setup.course)
    const plan = planFor(entry.state, profile, data)
    const codes = terms.flatMap((t) => t.subjects)
    const roles = planRoles(data, setup.course, setup.courseYear, planComponentIds(setup).filter((id): id is string => !!id))
    const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), codes, data.subjects, setup.course)
    const levels = planStress(terms.map((t) => t.subjects), data, profile, fixed, setup.course).terms.map((s) => s.level)
    const statuses = checkCourse(plan, data).statuses
    const { major, minor, minorInformal } = setupTitles(data, setup)
    const summary: CompareSummary = {
      entry,
      courseTitle: findCourse(data, setup.course, setup.courseYear)?.title ?? setup.course,
      major,
      minor,
      minorInformal,
      statuses,
      met: statuses.filter((s) => s.status === 'ok').length,
    }
    return { summary, levels, rules: findCourse(data, setup.course, setup.courseYear)?.rules ?? [] }
  }

  const sides = computed(() => (a.value && b.value ? [side(a.value), side(b.value)] as const : null))
  const diff = computed(() => {
    if (!sides.value || !a.value || !b.value) return null
    const pts = (c: string) => all.subjects[c]?.points ?? 12.5
    return comparePlans({ terms: a.value.state.terms, levels: sides.value[0].levels }, { terms: b.value.state.terms, levels: sides.value[1].levels }, pts)
  })
  return { sides, diff }
}
