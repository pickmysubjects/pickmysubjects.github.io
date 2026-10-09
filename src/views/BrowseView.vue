<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import BrowseFilters from '@/components/browse/BrowseFilters.vue'
import BrowseRow from '@/components/browse/BrowseRow.vue'
import { browse, EMPTY_FILTERS, filtersFromQuery, filtersToQuery, PRESETS, type BrowseSort, type PresetName } from '@/engine'
import { link, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

const PAGE = 20

const { t } = useI18n()
const { query } = useView()
const { subjectList } = useDataset()
const plan = usePlan()

const course = computed(() => plan.setup.value.course || 'B-SCI')
const year = computed(() => plan.terms.value[0]?.year ?? new Date().getFullYear())

const filters = shallowRef(filtersFromQuery(query.value))
const shown = shallowRef(PAGE)

const rows = computed(() => browse(subjectList.value, filters.value, course.value, year.value))
const visible = computed(() => rows.value.slice(0, shown.value))
const anyRated = computed(() => subjectList.value.some((s) => (s.signals?.reviews ?? 0) >= 3))
const breadthCount = computed(() => subjectList.value.filter((s) => s.categories[course.value] === 'breadth').length)

const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]
function applyPreset(name: PresetName): void {
  // Tapping the chosen quick pick again turns it off.
  filters.value = isPreset(name)
    ? { ...EMPTY_FILTERS, text: filters.value.text }
    : { ...EMPTY_FILTERS, ...PRESETS[name], text: filters.value.text }
}
function isPreset(name: PresetName): boolean {
  const want = { ...EMPTY_FILTERS, ...PRESETS[name], text: filters.value.text, sort: filters.value.sort }
  return filtersToQuery(want) === filtersToQuery(filters.value)
}

function set<K extends keyof typeof filters.value>(key: K, value: (typeof filters.value)[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

// Keep the address in step, so a filtered list can be shared. replaceState, not a
// new history entry: every tap on a filter shouldn't need its own Back press.
watch(filters, (f) => {
  shown.value = PAGE
  const q = filtersToQuery(f)
  history.replaceState(null, '', link('subjects/') + (q ? `?${q}` : ''))
})
</script>

<template>
  <div class="browse">
    <header class="head">
      <h1 class="page-title">{{ t('browse.title') }}</h1>
      <p class="page-lede">{{ t('browse.lede') }}</p>
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
      <div class="presets" role="group" :aria-label="t('browse.presets')">
        <button
          v-for="p in PRESET_NAMES"
          :key="p"
          type="button"
          class="preset"
          :aria-pressed="isPreset(p)"
          @click="applyPreset(p)"
        >
          {{ t(`browse.preset.${p}`) }}
        </button>
      </div>
    </div>

    <div class="layout">
      <BrowseFilters v-model="filters" class="side" />

      <section class="results">
        <div class="toolbar">
          <p class="count" role="status">{{ t('browse.count', { n: rows.length }) }}</p>
          <label class="sort">
            <span>{{ t('browse.sort') }}</span>
            <select
              class="select-glass"
              :value="filters.sort"
              @change="set('sort', ($event.target as HTMLSelectElement).value as BrowseSort)"
            >
              <option value="code">{{ t('browse.sortCode') }}</option>
              <option value="exam">{{ t('browse.sortExam') }}</option>
              <option value="hours">{{ t('browse.sortHours') }}</option>
              <option v-if="anyRated" value="rating">{{ t('browse.sortRating') }}</option>
            </select>
          </label>
        </div>

        <div v-if="rows.length" class="list surface">
          <BrowseRow v-for="r in visible" :key="r.subject.code" :row="r" :course="course" />
        </div>
        <p v-else class="empty surface">{{ t('browse.empty') }}</p>

        <button v-if="rows.length > shown" type="button" class="button button-quiet more" @click="shown += PAGE">
          {{ t('browse.more', { n: rows.length - shown }) }}
        </button>

        <p class="coverage">{{ t('browse.coverage', { n: subjectList.length, breadth: breadthCount }) }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.browse {
  display: grid;
  gap: 24px;
  padding-top: 32px;
}

.top {
  display: grid;
  gap: 14px;
  max-width: 720px;
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
  background: var(--surface);
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

.count {
  font-size: 0.9375rem;
  font-weight: 600;
}

.sort {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--ink-faint);
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
  color: var(--ink-faint);
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
}
</style>
