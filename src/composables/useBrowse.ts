import { computed, shallowRef, watch } from 'vue'
import { viewYear } from '@/engine/dataYear'
import {
  activeCount,
  activePreset,
  applyQuick,
  chooseOrder,
  choosePreset,
  orderOf,
  removePreset,
  browseAddress,
  browseIndex,
  clearFilters,
  facetCounts,
  filtersFromQuery,
  findRows,
  hasFitProfile,
  isFail,
  quickChoice,
  rankCourseOf,
  recommend,
  type BrowseFilters,
  type Order,
  type PresetName,
  type QuickChoice,
} from '@/engine'
import { replaceAddress, useView } from './useView'
import { useDataset } from './useDataset'
import { usePlan } from './usePlan'
import { useProfile } from './useProfile'
import { useSortForMeOptions } from './useSubjectFit'

/**
 * Find subjects' state: the filters (kept in the address, so a list can be shared and survives a
 * reload), the rows they give, and the live count beside every filter option. Every subject's
 * facts are worked out once per degree, year and record (the index); a tap on a filter only
 * filters and counts that index.
 */
export function useBrowse() {
  const { query, param } = useView()
  const { data, subjectList } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()

  const course = computed(() => plan.setup.value.course || 'B-SCI')
  const year = computed(() => viewYear(plan.terms.value[0]?.year))
  // A quick choice's own address (/subjects/no-exam/, /subjects/easy/) opens with it chosen.
  const filters = shallowRef<BrowseFilters>(filtersFromQuery(query.value, param.value))

  // What the student has passed (or the plan has before now): "prerequisites I meet".
  const done = computed(() => new Set([...profile.value.results.filter((r) => !isFail(r)).map((r) => r.code), ...plan.plan.value.completed]))
  const hasRecord = computed(() => done.value.size > 0)
  const index = computed(() => browseIndex(subjectList.value, { course: course.value, year: year.value, all: data.value.subjects, done: done.value }))

  // "Sort for me": the student's own suggestions, from whatever they've filled in so far.
  const hasProfile = computed(() => hasFitProfile(profile.value))
  const sortForMe = useSortForMeOptions()
  const recs = computed(() => (filters.value.mine ? recommend(data.value, profile.value, sortForMe.value) : undefined))

  const rows = computed(() =>
    findRows(subjectList.value, filters.value, {
      course: course.value,
      // The easy and hard lists cover every degree until one is chosen, or the degree a subject
      // page's place on the list was counted for, when that's what opened it.
      rankCourse: rankCourseOf(filters.value, plan.courseChosen.value ? course.value : null),
      year: year.value,
      recs: recs.value,
      index: index.value,
    }),
  )
  const facets = computed(() => facetCounts(index.value, filters.value))
  const active = computed(() => activeCount(filters.value))
  const choice = computed(() => quickChoice(filters.value))
  const order = computed(() => orderOf(filters.value))
  const preset = computed(() => activePreset(filters.value))

  function set<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]): void {
    filters.value = { ...filters.value, [key]: value }
  }
  function choose(c: QuickChoice): void {
    filters.value = applyQuick(filters.value, c)
  }
  function setOrder(o: Order): void {
    filters.value = chooseOrder(filters.value, o)
  }
  // A shortcut sets its filters; off again, it takes exactly those off.
  function setPreset(p: PresetName | null): void {
    const on = preset.value
    filters.value = p ? choosePreset(filters.value, p) : on ? removePreset(filters.value, on) : filters.value
  }
  function clear(): void {
    filters.value = clearFilters(filters.value)
  }

  // Keep the address in step, so a list can be shared. replaceState, not a new history entry:
  // every tap on a filter shouldn't need its own Back press.
  watch(filters, (f) => replaceAddress(browseAddress(f)))
  // Back and forward (or a link to another list) change the address under the page: follow it.
  watch([query, param], ([q, p]) => {
    const next = filtersFromQuery(q, p)
    if (browseAddress(next) !== browseAddress(filters.value)) filters.value = next
  })

  return { filters, course, year, rows, facets, active, choice, order, preset, hasProfile, hasRecord, index, set, choose, setOrder, setPreset, clear }
}
