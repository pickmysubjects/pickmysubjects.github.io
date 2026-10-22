import { computed, type Ref } from 'vue'
import { periodsFor, topicsOf, type Subject } from '@/engine'
import { useDataset } from '@/composables/useDataset'

const LIMIT = 4

/**
 * Subjects close to this one: same level, sharing the most specific topics, running in the
 * planned year. A short list to compare with, or to take instead.
 */
export function useSimilar(subject: Ref<Subject | undefined>, year: Ref<number>) {
  const { data } = useDataset()
  return computed(() => {
    const self = subject.value
    if (!self) return []
    const own = new Set(topicsOf(self).specific)
    if (!own.size) return []
    const area = self.code.slice(0, 4)
    const scored: { code: string; score: number }[] = []
    for (const s of Object.values(data.value.subjects)) {
      if (s.code === self.code || s.level !== self.level) continue
      if (s.discontinuedFrom !== undefined && year.value >= s.discontinuedFrom) continue
      if (s.offerings !== 'unknown' && periodsFor(s, year.value).length === 0) continue
      const shared = topicsOf(s).specific.filter((x) => own.has(x)).length
      if (!shared) continue
      // Same study area breaks ties: a closer neighbour than a far faculty sharing one topic.
      scored.push({ code: s.code, score: shared * 2 + (s.code.startsWith(area) ? 1 : 0) })
    }
    return scored
      .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
      .slice(0, LIMIT)
      .map((x) => x.code)
  })
}
