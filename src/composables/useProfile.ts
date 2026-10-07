import { computed } from 'vue'
import { computeWam, type Goal, type Profile, type Skill } from '@/engine'
import { useDataset } from './useDataset'
import { usePersisted } from './usePersisted'
import { cloneJson } from '@/utils/clone'

const emptyProfile = (): Profile => ({ results: [], skills: {}, interests: [], goal: 'balanced' })

// One profile per dataset: demo subject codes mean nothing in the real dataset.
const profiles = usePersisted<Record<string, Profile>>('sc:profiles', {})

export function useProfile() {
  const { name, data } = useDataset()

  const profile = computed<Profile>(() => profiles.value[name.value] ?? emptyProfile())
  const wam = computed(() => computeWam(profile.value.results, data.value))

  function update(change: (p: Profile) => Profile): void {
    profiles.value = { ...profiles.value, [name.value]: change(cloneJson(profile.value)) }
  }

  return {
    profile,
    wam,
    setResults: (results: Profile['results']) => update((p) => ({ ...p, results })),
    setSkills: (skills: Partial<Record<Skill, number>>) => update((p) => ({ ...p, skills })),
    setInterests: (interests: string[]) => update((p) => ({ ...p, interests })),
    setGoal: (goal: Goal) => update((p) => ({ ...p, goal })),
  }
}
