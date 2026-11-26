import { computed } from 'vue'
import { computeWam, passedCodes, type Goal, type OwnRating, type Profile, type Skill, type UniMelbRecord } from '@/engine'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { activePlan, books, prefsOf, withPrefs, type PlanPrefs } from './planStore'
import { defaultState } from './planDefaults'
import { bookOf } from '@/utils/planBook'
import { cloneJson } from '@/utils/clone'
import { cleanProfiles } from '@/utils/sanitize'

const emptyProfile = (): Profile => ({ results: [], skills: {}, interests: [], goal: 'balanced' })

// One profile per dataset: demo subject codes mean nothing in the real dataset.
const profiles = usePersisted<Record<string, Profile>>('sc:profiles', {}, cleanProfiles)

/**
 * The student: the record (results, marks, ratings) is theirs whatever the plan; strengths,
 * interests and goal belong to the open plan (Plan A can aim at a WAM, Plan B at a challenge).
 */
export function useProfile() {
  const { name, data } = useDataset()

  // What's saved on the profile itself (the record, and the pre-plans strengths/interests/goal).
  const stored = computed<Profile>(() => profiles.value[name.value] ?? emptyProfile())
  const prefs = computed<PlanPrefs>(() => prefsOf(activePlan(books.value[name.value]), stored.value))
  const profile = computed<Profile>(() => withPrefs(stored.value, prefs.value))
  const wam = computed(() => computeWam(profile.value.results, data.value))

  function update(change: (p: Profile) => Profile): void {
    profiles.value = { ...profiles.value, [name.value]: change(cloneJson(stored.value)) }
  }

  /** Change the open plan's strengths, interests or goal. */
  function updatePrefs(change: (p: PlanPrefs) => PlanPrefs): void {
    const book = books.value[name.value] ?? bookOf(defaultState(data.value))
    const id = activePlan(book)!.id
    const next = change(cloneJson(prefs.value))
    books.value = { ...books.value, [name.value]: { ...book, plans: book.plans.map((p) => (p.id === id ? { ...p, prefs: next } : p)) } }
  }

  return {
    profile,
    /** The record without any plan's settings, for judging another plan (comparing). */
    stored,
    wam,
    setResults: (results: Profile['results']) => update((p) => ({ ...p, results })),
    /** Credit for study elsewhere with no named subject; an empty list removes it. */
    setCredit: (credit: NonNullable<Profile['credit']>) =>
      update((p) => {
        const { credit: _old, ...rest } = p
        return credit.length ? { ...rest, credit } : rest
      }),
    setSkills: (skills: Partial<Record<Skill, number>>) => updatePrefs((p) => ({ ...p, skills })),
    /** The open plan's strengths, interests, goal and career, all at once (copied from the other side). */
    setPrefs: (prefs: PlanPrefs) => updatePrefs(() => cloneJson(prefs)),
    setInterests: (interests: string[]) => updatePrefs((p) => ({ ...p, interests })),
    setGoal: (goal: Goal) => updatePrefs((p) => ({ ...p, goal })),
    /** The open plan's career goal; undefined clears it. */
    setCareer: (career: string | undefined) =>
      updatePrefs((p) => {
        const { career: _old, ...rest } = p
        return career ? { ...rest, career } : rest
      }),
    setWorkHours: (workHours: number | undefined) =>
      update((p) => {
        const { workHours: _old, ...rest } = p
        return workHours === undefined ? rest : { ...rest, workHours }
      }),
    /** The target WAM on the record (the record page and the WAM calculator both set it); undefined clears it. */
    setTargetWam: (targetWam: number | undefined) =>
      update((p) => {
        const { targetWam: _old, ...rest } = p
        return targetWam === undefined || !Number.isFinite(targetWam) ? rest : { ...rest, targetWam: Math.max(0, Math.min(100, targetWam)) }
      }),
    /** Which mark scale the strength levels are shown in (display only). */
    setMarkScale: (markScale: string) => update((p) => ({ ...p, markScale })),
    /** Keep the student's own rating of a subject, to personalise their suggestions. */
    setOwnRating: (code: string, rating: OwnRating) => update((p) => ({ ...p, ratings: { ...(p.ratings ?? {}), [code]: rating } })),
    setConfirmed: (code: string, meets: boolean) =>
      update((p) => {
        const rest = (p.confirmed ?? []).filter((c) => c !== code)
        return { ...p, confirmed: meets ? [...rest, code] : rest }
      }),
  }
}

/**
 * The bachelor's side as the master's side sees it: results, WAM and planned majors saved there
 * (null when it has none). Read only: the master's side never changes it.
 */
export function useBachelorRecord() {
  const { all } = useDataset()
  return computed<UniMelbRecord | null>(() => {
    const stored = profiles.value[all.name]
    const plan = activePlan(books.value[all.name])
    const results = stored?.results ?? []
    const majorIds = plan?.setup.confirmed ? [plan.setup.major, plan.setup.major2] : []
    const named = majorIds.map((id) => all.components.find((c) => c.id === id)?.title).filter((x): x is string => !!x)
    // No major chosen yet: the degree itself says where they are.
    const degree = plan?.setup.confirmed ? all.courses.find((c) => c.code === plan.setup.course)?.title : undefined
    const majors = named.length ? named : degree ? [degree] : []
    if (!results.length && !majors.length) return null
    const wam = computeWam(results, all)
    return { passed: passedCodes(results, all.subjects), ...(wam !== null ? { wam } : {}), majors }
  })
}

/** The bachelor's side's strengths, interests, goal and career, to start the master's side from. */
export function bachelorPrefs(): PlanPrefs | null {
  const { all } = useDataset()
  const stored = profiles.value[all.name]
  const plan = activePlan(books.value[all.name])
  if (!stored && !plan) return null
  return prefsOf(plan, stored ?? emptyProfile())
}
