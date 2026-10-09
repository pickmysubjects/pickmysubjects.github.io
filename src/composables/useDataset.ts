import { computed } from 'vue'
import type { Dataset } from '@/engine'
import realJson from '@/generated/real.json'

const real = realJson as unknown as Dataset

/** The UniMelb data (the demo set is for tests and the data scripts only). */
export function useDataset() {
  const data = computed(() => real)
  const subjectList = computed(() => Object.values(data.value.subjects).sort((a, b) => a.code.localeCompare(b.code)))
  const topics = computed(() => [...new Set(subjectList.value.flatMap((s) => s.topics))].sort())
  // Saved plans and profiles are kept per data set; this is the one name they live under.
  const name = computed(() => real.name)
  return { name, data, subjectList, topics }
}
