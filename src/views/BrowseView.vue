<script setup lang="ts">
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import DegreeBadge from '@/components/browse/DegreeBadge.vue'
import DegreePick from '@/components/browse/DegreePick.vue'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { Info, Search } from 'lucide-vue-next'
import BrowseFilters from '@/components/browse/BrowseFilters.vue'
import BrowseRow from '@/components/browse/BrowseRow.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import Interp from '@/components/Interp.vue'
import {
  EASY_CUTS,
  applyQuick,
  browseAddress,
  filtersFromQuery,
  findRows,
  hasFitProfile,
  rankCourseOf,
  leadReasons,
  QUICK_CHOICES,
  quickChoice,
  recommend,
  SHOWN_AS_FACTS,
  type BrowseSort,
  type FoundRow,
  type QuickChoice,
} from '@/engine'
import { link, replaceAddress, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useSortForMeOptions } from '@/composables/useSubjectFit'
import { useI18n } from '@/i18n'
import { reasonText } from '@/i18n/format'

const PAGE = 20

const { t } = useI18n()
const { query, param } = useView()
const { data, subjectList } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

const course = computed(() => plan.setup.value.course || 'B-SCI')
const year = computed(() => viewYear(plan.terms.value[0]?.year))

// A quick choice's own address (/subjects/no-exam/, /subjects/easy/) opens with it chosen.
const filters = shallowRef(filtersFromQuery(query.value, param.value))
const shown = shallowRef(PAGE)

const categories = computed(() => data.value.courses.find((c) => c.code === course.value)?.categories ?? [])
// A category from another course (a "science" link opened under B-COM) is dropped from the
// filters themselves, so it neither filters nor counts as active nor stays in the address.
watch(
  [filters, categories],
  ([f, cats]) => {
    if (f.category && !cats.includes(f.category)) filters.value = { ...f, category: '' }
  },
  { immediate: true },
)

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
  }),
)
const visible = computed(() => rows.value.slice(0, shown.value))
const anyRated = computed(() => subjectList.value.some((s) => (s.signals?.reviews ?? 0) >= 3))
// No degree yet: breadth depends on it, so that list asks for it rather than guessing.
const askDegree = computed(() => !plan.courseChosen.value)
const breadthCount = computed(() => subjectList.value.filter((s) => s.categories[course.value] === 'breadth').length)

const choice = computed(() => quickChoice(filters.value))
const rank = computed(() => filters.value.rank)
function choose(c: QuickChoice): void {
  filters.value = applyQuick(filters.value, c)
}
// On phones the quick picks scroll sideways: bring the chosen one into view when a page opens on it.
const presetRow = useTemplateRef<HTMLElement>('presetRow')
onMounted(() => {
  const row = presetRow.value
  const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!row || !on || row.scrollWidth <= row.clientWidth) return
  const a = row.getBoundingClientRect()
  const b = on.getBoundingClientRect()
  row.scrollLeft += b.left - a.left - (a.width - b.width) / 2
})
function chipLabel(c: QuickChoice): string {
  if (c === 'all') return t.value('browse.any')
  if (c === 'easy' || c === 'hard') return t.value(`browse.rankList.${c}`)
  return t.value(`browse.preset.${c}`)
}

// Reasons the row's own fact pills already say (exam share, class hours) aren't repeated.
// Why a row is where it is: the list's reasons, or the first few reasons it suits the student.
const trim = (x: string) => x.replace(/[。.]\s*$/, '')
function reasons(r: FoundRow): string[] {
  if (r.rec)
    return leadReasons(r.rec).map((n) => trim(reasonText(t.value, n)))
  if (r.ranked) {
    const own = r.ranked.reasons.filter((x) => !SHOWN_AS_FACTS.has(x.key)).map((x) => t.value(`rank.reason.${x.key}`, x.params))
    return [...own, ...(r.ranked.reviews === null ? [t.value('rank.factsOnly')] : [])]
  }
  return []
}

function set<K extends keyof typeof filters.value>(key: K, value: (typeof filters.value)[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

// Keep the address in step, so a list can be shared. replaceState, not a new history entry:
// every tap on a filter shouldn't need its own Back press.
watch(filters, (f) => {
  shown.value = PAGE
  replaceAddress(browseAddress(f))
})
</script>

<template>
  <div class="browse">
    <header class="head">
      <div class="head-row">
        <h1 class="page-title">{{ t('browse.title') }}</h1>
      </div>
      <p class="page-lede head-lede">{{ t('browse.ledeShort') }}<InfoTip :text="t('browse.lede')" /></p>
    </header>

    <div class="top">
      <label class="search">
        <Search :size="18" aria-hidden="true" class="search-icon" />
        <span class="visually-hidden">{{ t('browse.searchLabel') }}</span>
        <input
          class="search-input"
          type="search"
          :value="filters.text"
          :placeholder="t('browse.searchPlaceholder')"
          @input="set('text', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <div ref="presetRow" class="presets" role="group" :aria-label="t('browse.presets')">
        <button
          v-for="c in QUICK_CHOICES"
          :key="c"
          type="button"
          class="preset"
          :aria-pressed="choice === c"
          @click="choose(c)"
        >
          {{ chipLabel(c) }}
        </button>
      </div>
    </div>

    <div class="layout">
      <BrowseFilters v-model="filters" :categories="categories" class="side" />

      <section class="results">
        <!-- A degree-dependent list (breadth) waits for the degree rather than guessing one;
             other lists don't need it, so they don't ask. -->
        <DegreePick v-if="askDegree && filters.category" />
        <template v-else>
        <div class="toolbar">
          <div class="count-line">
            <p class="count" role="status">{{ t('browse.count', { n: rows.length }) }}</p>
            <DegreeBadge v-if="!askDegree" :course="course" />
          </div>
          <div class="order">
            <label class="mine">
              <input type="checkbox" role="switch" :checked="filters.mine" @change="set('mine', ($event.target as HTMLInputElement).checked)" />
              <span>{{ t('browse.forMe') }}</span>
            </label>
            <!-- A list or "sort for me" sets the order itself. -->
            <label v-if="!filters.mine && !rank" class="sort">
              <span>{{ t('browse.sort') }}</span>
              <select :aria-label="t('browse.sort')"
                class="select-glass"
                :value="filters.sort"
                @change="set('sort', ($event.target as HTMLSelectElement).value as BrowseSort)"
              >
                <option value="code">{{ t('browse.sortCode') }}</option>
                <option value="easy">{{ t('browse.sortEasy') }}</option>
                <option value="exam">{{ t('browse.sortExam') }}</option>
                <option value="hours">{{ t('browse.sortHours') }}</option>
                <option v-if="anyRated" value="rating">{{ t('browse.sortRating') }}</option>
              </select>
            </label>
          </div>
        </div>

        <div v-if="filters.mine" class="mine-bar">
          <GoalPicker compact />
          <p v-if="!hasProfile" class="nudge">
            <Interp :text="t('browse.forMeNudge')">
              <template #link><a :href="link('record')">{{ t('record.title') }}</a></template>
            </Interp>
          </p>
        </div>

        <details v-if="rank && !filters.mine" class="how">
          <summary><Info :size="16" aria-hidden="true" /> {{ t(`rank.lede.${rank}`) }}</summary>
          <ul>
            <li>{{ t('rank.how1') }}</li>
            <li>{{ t('rank.how2') }}</li>
            <li>{{ t('rank.how3') }}</li>
            <li>{{ t('rank.how4', { year }) }}</li>
            <li>{{ t('rank.how5') }}</li>
          </ul>
        </details>

        <p v-if="choice === 'easy' || choice === 'breadth'" class="cut-link">
          <a :href="link(`subjects/${EASY_CUTS.level3Breadth.slug}/`)">{{ t('rank.l3Breadth') }}</a>
        </p>

        <div v-if="rows.length" class="list surface">
          <BrowseRow v-for="r in visible" :key="r.subject.code" :row="r" :course="course" :reasons="reasons(r)" :rec="r.rec" :fit="hasProfile" />
        </div>
        <p v-else class="empty surface">{{ t('browse.empty') }}</p>

        <button v-if="rows.length > shown" type="button" class="button button-quiet more" @click="shown += PAGE">
          {{ t('browse.more', { n: rows.length - shown }) }}
        </button>

        <p class="coverage">{{ t('browse.coverage', { n: subjectList.length, breadth: breadthCount }) }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cut-link {
  margin: 0;
  font-size: 0.875rem;
}

.browse {
  display: grid;
  gap: 24px;
  padding-top: var(--page-top);
}

.head {
  display: grid;
  gap: 6px;
}

/* Title and the subjects/majors switch share one line, so results start higher. */
.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Wide enough for every quick list on one row on desktop. */
.top {
  display: grid;
  gap: 12px;
  max-width: 880px;
}

.top .search {
  max-width: 720px;
}

.count-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.search {
  position: relative;
  display: block;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 18px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  padding: 14px 18px 14px 48px;
  font-size: 1rem;
  background: var(--glass-shine), var(--glass-fill);
  box-shadow: var(--glass-shadow);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset {
  padding: 7px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
}

.preset:hover {
  color: var(--ink);
  background: var(--glass-fill-hover);
}

.preset[aria-pressed='true'] {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}

/* Filters on the left, results on the right; one column on phones. */
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.side {
  position: sticky;
  top: 88px;
}

.results {
  display: grid;
  gap: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.order {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.mine {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

.mine input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.mine-bar {
  display: grid;
  gap: 6px;
}

.nudge {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.how {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.how summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.how ul {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding-left: 20px;
}

.count {
  font-size: 0.9375rem;
  font-weight: 600;
}

.sort {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.list {
  overflow: hidden;
}

.list > :last-child {
  border-bottom: 0;
}

.empty {
  padding: 20px;
  color: var(--ink-soft);
}

.more {
  justify-self: center;
}

.coverage {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

@media (max-width: 720px) {
  .browse {
    gap: 18px;
  }

  .layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .side {
    position: static;
  }

  .head-lede {
    display: none;
  }

  /* Quick picks scroll sideways in one line instead of stacking. */
  .presets {
    flex-wrap: nowrap;
    margin: 0 -16px;
    padding: 2px 16px 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .preset {
    flex: none;
    min-height: 40px;
  }

  /* Count and sort on one line, the degree under them. */
  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .count-line {
    display: contents;
  }

  .count-line :deep(.degree) {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: start;
  }

  .sort > span {
    display: none;
  }
}
</style>
