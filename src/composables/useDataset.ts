import { computed } from 'vue'
import { defaultCourse, forCourse, type Dataset } from '@/engine'
import realJson from '@/generated/real.json'
import { plans } from './planStore'

const real = realJson as unknown as Dataset

/** The UniMelb data (the demo set is for tests and the data scripts only). */
export function useDataset() {
  // Seen as a student of the planned course (or the default one) sees it.
  const course = computed(() => plans.value[real.name]?.setup.course ?? defaultCourse(real))
  const data = computed(() => forCourse(real, course.value))
  const subjectList = computed(() => Object.values(data.value.subjects).sort((a, b) => a.code.localeCompare(b.code)))
  const topics = computed(() => [...new Set(subjectList.value.flatMap((s) => s.topics))].sort())
  // Saved plans and profiles are kept per data set; this is the one name they live under.
  const name = computed(() => real.name)
  return { name, course, data, subjectList, topics }
}
