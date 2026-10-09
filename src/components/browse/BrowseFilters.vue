<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown, SlidersHorizontal } from 'lucide-vue-next'
import { EMPTY_FILTERS, PERIODS, type BrowseFilters } from '@/engine'
import { useI18n } from '@/i18n'

const filters = defineModel<BrowseFilters>({ required: true })
const { t } = useI18n()

const CATEGORIES = ['', 'science', 'breadth'] as const
const LEVELS = [null, 1, 2, 3] as const
const WHEN = [null, ...PERIODS] as const
const TOGGLES = ['noPrereq', 'noExam', 'noGroup'] as const

// On phones the list matters more, so the filters start folded there.
const open = shallowRef(typeof matchMedia === 'undefined' || matchMedia('(min-width: 721px)').matches)
const active = computed(() => {
  const f = filters.value
  return [f.category, f.level !== null, f.period, f.noPrereq, f.noExam, f.noGroup].filter(Boolean).length
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
            v-for="c in CATEGORIES"
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
        <label v-for="k in TOGGLES" :key="k" class="check">
          <input type="checkbox" :checked="filters[k]" @change="set(k, !filters[k])" />
          {{ t(`browse.${k}`) }}
        </label>
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
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
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
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
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
  flex-wrap: wrap;
}

.seg button {
  flex: 1 0 auto;
  padding: 6px 10px;
  font-size: 0.85rem;
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

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  cursor: pointer;
}

.check input {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
}

.clear {
  justify-self: start;
  padding: 0;
  font-size: 0.88rem;
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
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
  }
}
</style>
