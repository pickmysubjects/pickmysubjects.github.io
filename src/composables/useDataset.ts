import { computed, readonly } from 'vue'
import type { Dataset } from '@/engine'
import realJson from '@/generated/real.json'
import demoJson from '@/generated/demo.json'
import { usePersisted } from './usePersisted'

export type DatasetName = Dataset['name']

const datasets: Record<DatasetName, Dataset> = {
  real: realJson as unknown as Dataset,
  demo: demoJson as unknown as Dataset,
}

// Module-level so every component shares the same choice.
const current = usePersisted<DatasetName>('sc:dataset', 'real')

export function useDataset() {
  const data = computed(() => datasets[current.value])
  const subjectList = computed(() =>
    Object.values(data.value.subjects).sort((a, b) => a.code.localeCompare(b.code)),
  )
  const topics = computed(() => [...new Set(subjectList.value.flatMap((s) => s.topics))].sort())

  function setDataset(name: DatasetName): void {
    current.value = name
  }

  return { name: readonly(current), data, subjectList, topics, setDataset }
}
