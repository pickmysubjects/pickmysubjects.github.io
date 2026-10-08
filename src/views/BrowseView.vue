<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import BrowseFilters from '@/components/browse/BrowseFilters.vue'
import BrowseRow from '@/components/browse/BrowseRow.vue'
import { browse, EMPTY_FILTERS, filtersFromQuery, filtersToQuery, PRESETS, type PresetName } from '@/engine'
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
  filters.value = { ...EMPTY_FILTERS, ...PRESETS[name] }
}
function isPreset(name: PresetName): boolean {
  const want = { ...EMPTY_FILTERS, ...PRESETS[name] }
  return filtersToQuery(want) === filtersToQuery(filters.value)
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
    <header>
      <h1 class="page-title">{{ t('browse.title') }}</h1>
      <p class="page-lede">{{ t('browse.lede') }}</p>
    </header>

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

    <BrowseFilters v-model="filters" :show-rating="anyRated" />

    <p class="count" role="status">
      {{ t('browse.count', { n: rows.length }) }}
      <button v-if="filtersToQuery(filters)" type="button" class="clear" @click="filters = { ...EMPTY_FILTERS }">
        {{ t('browse.clear') }}
      </button>
    </p>

    <div v-if="rows.length" class="list surface">
      <BrowseRow v-for="r in visible" :key="r.subject.code" :row="r" :course="course" />
    </div>
    <p v-else class="empty surface">{{ t('browse.empty') }}</p>

    <button v-if="rows.length > shown" type="button" class="button button-quiet more" @click="shown += PAGE">
      {{ t('browse.more', { n: rows.length - shown }) }}
    </button>

    <p class="coverage">{{ t('browse.coverage', { n: subjectList.length, breadth: breadthCount }) }}</p>
  </div>
</template>

<style scoped>
.browse {
  display: grid;
  gap: 16px;
  max-width: 860px;
  padding-top: 32px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset {
  padding: 8px 16px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-1);
  cursor: pointer;
}

.preset:hover {
  border-color: var(--accent);
}

.preset[aria-pressed='true'] {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent);
}

.count {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.clear {
  padding: 0;
  font-size: 0.88rem;
  color: var(--accent);
  background: none;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
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
  font-size: 0.85rem;
  color: var(--ink-faint);
}
</style>
