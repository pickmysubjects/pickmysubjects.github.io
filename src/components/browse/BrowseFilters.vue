<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, Search } from 'lucide-vue-next'
import { PERIODS, type BrowseFilters, type BrowseSort } from '@/engine'
import { useI18n } from '@/i18n'

defineProps<{ showRating: boolean }>()
const filters = defineModel<BrowseFilters>({ required: true })
const { t } = useI18n()

const CATEGORIES = ['', 'science', 'breadth'] as const
const LEVELS = [null, 1, 2, 3] as const
const WHEN = [null, ...PERIODS] as const
const TOGGLES = ['noPrereq', 'noExam', 'noGroup'] as const

// Open on wide screens; on phones the list matters more, so the details start folded.
const open = shallowRef(typeof matchMedia === 'undefined' || matchMedia('(min-width: 721px)').matches)
const active = computed(() => {
  const f = filters.value
  return [f.category, f.level !== null, f.period, f.noPrereq, f.noExam, f.noGroup].filter(Boolean).length
})

function set<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]): void {
  filters.value = { ...filters.value, [key]: value }
}
</script>

<template>
  <div class="filters surface">
    <label class="search">
      <Search :size="16" aria-hidden="true" class="search-icon" />
      <span class="visually-hidden">{{ t('browse.searchLabel') }}</span>
      <input
        class="input search-input"
        type="search"
        :value="filters.text"
        :placeholder="t('browse.searchPlaceholder')"
        @input="set('text', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <button type="button" class="toggle" :aria-expanded="open" aria-controls="browse-more" @click="open = !open">
      {{ t('browse.filters') }}<span v-if="active" class="badge">{{ active }}</span>
      <ChevronDown :size="16" aria-hidden="true" class="toggle-icon" />
    </button>

    <div v-show="open" id="browse-more" class="more">
    <div class="row" role="group" :aria-label="t('browse.type')">
      <span class="row-label">{{ t('browse.type') }}</span>
      <button
        v-for="c in CATEGORIES"
        :key="c"
        type="button"
        class="opt"
        :aria-pressed="filters.category === c"
        @click="set('category', c)"
      >
        {{ c ? t(`browse.cat.${c}`) : t('browse.any') }}
      </button>
    </div>

    <div class="row" role="group" :aria-label="t('browse.level')">
      <span class="row-label">{{ t('browse.level') }}</span>
      <button
        v-for="l in LEVELS"
        :key="String(l)"
        type="button"
        class="opt"
        :aria-pressed="filters.level === l"
        @click="set('level', l)"
      >
        {{ l === null ? t('browse.any') : t('browse.levelN', { n: l }) }}
      </button>
    </div>

    <div class="row" role="group" :aria-label="t('browse.when')">
      <span class="row-label">{{ t('browse.when') }}</span>
      <button
        v-for="p in WHEN"
        :key="String(p)"
        type="button"
        class="opt"
        :aria-pressed="filters.period === p"
        @click="set('period', p)"
      >
        {{ p === null ? t('browse.any') : t(`periodShort.${p}`) }}
      </button>
    </div>

    <div class="row">
      <span class="row-label">{{ t('browse.only') }}</span>
      <button
        v-for="k in TOGGLES"
        :key="k"
        type="button"
        class="opt"
        :aria-pressed="filters[k]"
        @click="set(k, !filters[k])"
      >
        {{ t(`browse.${k}`) }}
      </button>
    </div>

    <label class="row sort">
      <span class="row-label">{{ t('browse.sort') }}</span>
      <select
        class="select sort-select"
        :value="filters.sort"
        @change="set('sort', ($event.target as HTMLSelectElement).value as BrowseSort)"
      >
        <option value="code">{{ t('browse.sortCode') }}</option>
        <option value="exam">{{ t('browse.sortExam') }}</option>
        <option value="hours">{{ t('browse.sortHours') }}</option>
        <option v-if="showRating" value="rating">{{ t('browse.sortRating') }}</option>
      </select>
    </label>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
}

.search {
  position: relative;
  display: block;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.search-input {
  padding-left: 38px;
}

.toggle {
  display: none;
  align-items: center;
  gap: 6px;
  justify-self: start;
  padding: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  background: none;
  border: 0;
  cursor: pointer;
}

.toggle[aria-expanded='true'] .toggle-icon {
  transform: rotate(180deg);
}

.badge {
  min-width: 20px;
  padding: 0 6px;
  font-size: 0.75rem;
  line-height: 20px;
  text-align: center;
  color: var(--accent-ink);
  background: var(--accent);
  border-radius: 999px;
}

.more {
  display: grid;
  gap: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.row-label {
  min-width: 4.5em;
  margin-right: 4px;
  font-size: 0.82rem;
  color: var(--ink-faint);
}

.opt {
  padding: 5px 12px;
  font-size: 0.85rem;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.opt:hover {
  border-color: var(--accent);
}

.opt[aria-pressed='true'] {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.sort-select {
  width: auto;
  padding: 6px 12px;
  font-size: 0.88rem;
}

/* Wide screens always show the filters, even if they were folded on a narrower window. */
@media (min-width: 721px) {
  .more {
    display: grid !important;
  }
}

@media (max-width: 720px) {
  .toggle {
    display: inline-flex;
  }
}

@media (max-width: 560px) {
  .row-label {
    flex-basis: 100%;
  }
}
</style>
