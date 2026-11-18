import { computed, type Ref } from 'vue'
import { CLUBS } from '@/content/clubs'
import { suggestClubs } from '@/engine/clubs'
import { standingOf } from '@/engine/recommend'
import { buildSkillTree, employerSkills } from '@/engine/skillTree'
import { skillPicks } from '@/engine/skillPicks'
import { useDataset, useOutcomes, useResume } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'

/**
 * A set of subjects read against the skills employers list for a job (yourcareer.gov.au): the
 * skill tree of those subjects, each job skill with the subjects that show it, and for one they
 * don't show yet, the subjects in the plan that will give it or a few to add; skills built
 * outside class get the clubs that suit the student. Shared by the careers page and the resume
 * tool, which pass different subjects (the record's, or the ones picked on the page).
 */
export function useEmployerMatch(skills: Readonly<Ref<readonly string[]>>, codes: Readonly<Ref<readonly string[]>>) {
  const { data, course } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()
  const planned = computed(() => plan.plan.value.terms.flatMap((term) => term.subjects))
  // Specialist skills, resume lines and learning outcomes load with each subject's detail.
  const outcomes = useOutcomes(codes)
  const resumeOf = useResume(codes)
  const outcomesEn = (c: string) => outcomes(c).map((o) => o.en)
  const tree = computed(() => buildSkillTree(codes.value, data.value, resumeOf))
  const rows = computed(() => employerSkills(skills.value, tree.value, data.value, outcomesEn))
  const shown = computed(() => rows.value.filter((r) => r.codes.length).length)

  const standing = computed(() => standingOf(profile.value, data.value, planned.value))
  const picks = computed(() =>
    Object.fromEntries(
      rows.value
        .filter((r) => !r.codes.length && !r.outsideClass)
        .map((r) => [r.skill, skillPicks(r.skill, { data: data.value, course: course.value, done: [...codes.value], planned: planned.value, standing: standing.value })]),
    ),
  )
  const clubs = computed(() =>
    rows.value.some((r) => r.outsideClass)
      ? suggestClubs(CLUBS, { interests: profile.value.interests, course: plan.setupChosen.value ? course.value : undefined, codes: [...codes.value, ...planned.value], data: data.value }, 3)
      : [],
  )
  return { tree, rows, shown, picks, clubs, outcomes, outcomesEn, resumeOf }
}
