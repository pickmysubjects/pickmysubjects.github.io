import { computed } from 'vue'
import { computeWam, type Goal, type OwnRating, type Profile, type Skill } from '@/engine'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { activePlan, books, prefsOf, type PlanPrefs } from './planStore'
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
  const profile = computed<Profile>(() => ({ ...stored.value, ...prefs.value }))
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
    setSkills: (skills: Partial<Record<Skill, number>>) => updatePrefs((p) => ({ ...p, skills })),
    setInterests: (interests: string[]) => updatePrefs((p) => ({ ...p, interests })),
    setGoal: (goal: Goal) => updatePrefs((p) => ({ ...p, goal })),
    setWorkHours: (workHours: number | undefined) =>
      update((p) => {
        const { workHours: _old, ...rest } = p
        return workHours === undefined ? rest : { ...rest, workHours }
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
