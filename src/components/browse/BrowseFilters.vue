<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-vue-next'
import { EMPTY_FILTERS, type BrowseFilters } from '@/engine'
import { useI18n } from '@/i18n'

const props = defineProps<{ categories: string[] }>()
const filters = defineModel<BrowseFilters>({ required: true })
const { t } = useI18n()

// The current course's own categories (science/breadth for B-SCI, commerce/breadth for B-COM).
const categories = computed(() => ['', ...props.categories])
const LEVELS = [null, 1, 2, 3] as const
// Semesters first, then the short terms: "Any" on its own row and two even pairs below it.
const WHEN = [null, 'semester-1', 'semester-2', 'summer', 'winter'] as const
const TOGGLES = ['noPrereq', 'noExam', 'noGroup', 'noHurdle', 'noTest'] as const

// On phones the list matters more, so the filters start folded there.
const open = shallowRef(typeof matchMedia === 'undefined' || matchMedia('(min-width: 721px)').matches)
const active = computed(() => {
  const f = filters.value
  return [f.category, f.level !== null, f.period, f.noPrereq, f.noExam, f.noGroup, f.noHurdle, f.noTest].filter(Boolean).length
})

function set<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

function clear(): void {
  filters.value = { ...EMPTY_FILTERS, text: filters.value.text, sort: filters.value.sort }
}
</script>

<template>
  <aside class="filters">
    <button type="button" class="toggle" :aria-expanded="open" aria-controls="browse-more" @click="open = !open">
      <SlidersHorizontal :size="16" aria-hidden="true" />
      {{ t('browse.filters') }}<span v-if="active" class="badge">{{ active }}</span>
      <ChevronDown :size="16" aria-hidden="true" class="toggle-icon" />
    </button>

    <div v-show="open" id="browse-more" class="groups">
      <fieldset class="group">
        <legend>{{ t('browse.type') }}</legend>
        <div class="seg">
          <button
            v-for="c in categories"
            :key="c"
            type="button"
            :aria-pressed="filters.category === c"
            @click="set('category', c)"
          >
            {{ c ? t(`browse.cat.${c}`) : t('browse.any') }}
          </button>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>{{ t('browse.level') }}</legend>
        <div class="seg">
          <button
            v-for="l in LEVELS"
            :key="String(l)"
            type="button"
            :aria-pressed="filters.level === l"
            @click="set('level', l)"
          >
            {{ l === null ? t('browse.any') : l }}
          </button>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>{{ t('browse.when') }}</legend>
        <div class="seg seg-wrap">
          <button
            v-for="p in WHEN"
            :key="String(p)"
            type="button"
            :aria-pressed="filters.period === p"
            @click="set('period', p)"
          >
            {{ p === null ? t('browse.any') : t(`periodShort.${p}`) }}
          </button>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>{{ t('browse.only') }}</legend>
        <div class="toggles">
          <button v-for="k in TOGGLES" :key="k" type="button" class="chip only" :aria-pressed="filters[k]" @click="set(k, !filters[k])">
            <Check v-if="filters[k]" :size="14" aria-hidden="true" />
            {{ t(`browse.${k}`) }}
          </button>
        </div>
      </fieldset>

      <button v-if="active" type="button" class="clear" @click="clear">{{ t('browse.clear') }}</button>
    </div>
  </aside>
</template>

<style scoped>
.filters {
  display: grid;
  align-content: start;
  gap: 12px;
}

.toggle {
  display: none;
  align-items: center;
  gap: 8px;
  justify-self: start;
  padding: 8px 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
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

.groups {
  display: grid;
  gap: 20px;
}

.group {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.group legend {
  margin-bottom: 8px;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--ink);
}

/* A segmented control: one rounded track, the chosen option raised. */
.seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  border-radius: 12px;
}

.seg-wrap {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.seg-wrap button:first-child {
  grid-column: 1 / -1;
}

.seg button {
  flex: 1 0 auto;
  min-height: 34px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: var(--ink-soft);
  white-space: nowrap;
  background: none;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.seg button:hover {
  color: var(--ink);
}

.seg button[aria-pressed='true'] {
  font-weight: 600;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.only {
  gap: 4px;
  min-height: 34px;
  cursor: pointer;
}

.only[aria-pressed='true'] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}

.clear {
  justify-self: start;
  padding: 0;
  font-size: 0.875rem;
  color: var(--accent);
  background: none;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* Wide screens always show the filters, even if they were folded on a narrower window. */
@media (min-width: 721px) {
  .groups {
    display: grid !important;
  }
}

@media (max-width: 720px) {
  .toggle {
    display: inline-flex;
  }

  .groups {
    padding: 16px;
    background: var(--glass-shine), var(--sheet-fill);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
  }
}
</style>
