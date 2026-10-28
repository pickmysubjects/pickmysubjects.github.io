import { computed, nextTick, shallowRef, watch } from 'vue'
import { viewYear } from '@/engine/dataYear'
import {
  activeCount,
  activePreset,
  applyQuick,
  chooseOrder,
  orderOf,
  browseAddress,
  browseIndex,
  clearFilters,
  facetCounts,
  filtersFromQuery,
  findRows,
  hasFitProfile,
  historyStep,
  quickChoice,
  rankCourseOf,
  recommend,
  standingOf,
  type BrowseFilters,
  type Order,
  type QuickChoice,
} from '@/engine'
import { link, pushAddress, replaceAddress, useView } from './useView'
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
  const { data, subjectList, course: dataCourse } = useDataset()
  const { profile } = useProfile()
  const plan = usePlan()

  const year = computed(() => viewYear(plan.terms.value[0]?.year))
  // A quick choice's own address (/subjects/no-exam/, /subjects/easy/) opens with it chosen.
  const filters = shallowRef<BrowseFilters>(filtersFromQuery(query.value, param.value))
  // One degree for the whole page (breadth, prerequisites, the lists and the "easier than most"
  // filter), named in the toolbar: the student's own once chosen; before that the one a subject
  // page's link counted its place for, else the default degree the subject pages use.
  const course = computed(() => rankCourseOf(filters.value, plan.courseChosen.value ? plan.setup.value.course || null : null, dataCourse.value))

  // Passed, credited and planned subjects, marks and confirmed conditions, as suggestions read
  // them: "prerequisites I meet".
  const standing = computed(() => standingOf(profile.value, data.value, plan.plannedCodes.value))
  const hasRecord = computed(() => standing.value.completed.size > 0 || standing.value.confirmed.length > 0)
  const index = computed(() => browseIndex(subjectList.value, { course: course.value, year: year.value, all: data.value.subjects, standing: standing.value }))

  // "Sort for me": the student's own suggestions, from whatever they've filled in so far.
  const hasProfile = computed(() => hasFitProfile(profile.value))
  const sortForMe = useSortForMeOptions()
  const recs = computed(() => (filters.value.mine ? recommend(data.value, profile.value, sortForMe.value) : undefined))

  const rows = computed(() =>
    findRows(subjectList.value, filters.value, {
      course: course.value,
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
  function clear(): void {
    filters.value = clearFilters(filters.value)
  }

  // Keep the address in step, so a list can be shared. Each change of filters or order is its
  // own history entry, so Back steps through them; typing in the search box only swaps the
  // address in place (a letter shouldn't need its own Back press). Filters set from the
  // address (Back, Forward, a link) only tidy it, never add an entry.
  let following = false
  watch(filters, (f, old) => {
    const next = browseAddress(f)
    if (link(next) === location.pathname + location.search) return
    if (following || historyStep(old, f) === 'replace') replaceAddress(next)
    else pushAddress(next)
  })
  // Back and forward (or a link to another list) change the address under the page: follow it.
  watch([query, param], ([q, p]) => {
    const next = filtersFromQuery(q, p)
    if (browseAddress(next) === browseAddress(filters.value)) return
    following = true
    filters.value = next
    void nextTick(() => (following = false))
  })

  return { filters, course, year, rows, facets, active, choice, order, preset, hasProfile, hasRecord, index, set, choose, setOrder, clear }
}
