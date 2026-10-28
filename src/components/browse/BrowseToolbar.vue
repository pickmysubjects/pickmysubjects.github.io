<script setup lang="ts">
import { computed } from 'vue'
import { Flame, GraduationCap, Scale, SlidersHorizontal, Sparkles, X } from 'lucide-vue-next'
import { activeFilters, chooseOrder, type ListGroup, type BrowseFilters, type BrowseSort } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { categoryTag } from '@/i18n/format'

/**
 * One bar above the results: how many there are, which degree the lists follow (and where to
 * change it), the order; under it every filter that's on, each removable. Phones: the Filters
 * button (with how many are on) opens the sheet.
 */
const props = defineProps<{ count: number; course: string; active: number; anyRated: boolean }>()
const filters = defineModel<BrowseFilters>({ required: true })
const emit = defineEmits<{ openFilters: []; clear: [] }>()
const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()

const courseTitle = computed(() => data.value.courses.find((c) => c.code === props.course)?.title ?? props.course)

function set<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

// The order the chips set, shown where the sort menu goes, with a way to turn it off.
const order = computed(() => {
  const f = filters.value
  return f.mine ? { icon: Sparkles, label: t.value('browse.preset.mine') } : f.rank ? { icon: f.rank === 'easy' ? Scale : Flame, label: t.value(`browse.rankList.${f.rank}`) } : null
})
// Every filter that's on, each with its own ✕ (an old /subjects/no-exam/ address included).
const chips = computed(() => {
  const tr = t.value
  return activeFilters(filters.value).map((c) => {
    const f = filters.value
    if (c.group === 'text') return { key: c.key, label: `“${f.text.trim()}”`, off: () => set('text', '') }
    if (c.group === 'prereq') return { key: c.key, label: tr(f.prereq === 'none' ? 'browse.noPrereq' : 'browse.prereqMet'), off: () => set('prereq', 'any') }
    if (c.group === 'running') return { key: c.key, label: tr('browse.showOff'), off: () => set('running', true) }
    if (c.group === 'noGroup' || c.group === 'noHurdle' || c.group === 'noTest' || c.group === 'reviewed') {
      const k = c.group
      return { key: c.key, label: tr(`browse.${k}`), off: () => set(k, false) }
    }
    const g = c.group
    const v = c.value!
    return { key: c.key, label: optionName(g, v), off: () => set(g, (f[g] as readonly (string | number)[]).filter((x) => x !== v) as never) }
  })
})
function optionName(g: ListGroup, v: string | number): string {
  const tr = t.value
  if (g === 'category') return categoryTag(tr, String(v))
  if (g === 'topics') return tr(`topic.${v}`)
  if (g === 'level') return tr('subject.level', { level: v })
  if (g === 'period') return tr(`periodShort.${v}`)
  if (g === 'points') return tr('majors.points', { n: v })
  if (g === 'exam') return tr(`browse.examBand.${v}`)
  if (g === 'hours') return tr(`browse.hoursBand.${v}`)
  return tr(`browse.easeOpt.${v}`)
}
</script>

<template>
  <div class="tbar">
    <div class="tbar-row">
      <button type="button" class="ftoggle" aria-controls="browse-filters" @click="emit('openFilters')">
        <SlidersHorizontal :size="16" aria-hidden="true" />{{ t('browse.filters') }}<span v-if="active" class="fbadge">{{ active }}</span>
      </button>
      <p class="count" role="status">{{ t('browse.count', { n: count }) }}</p>
      <p class="degree">
        <GraduationCap :size="15" aria-hidden="true" />
        <span>{{ plan.courseChosen.value ? t('majors.shownFor', { course: courseTitle }) : t('majors.shownDefault', { course: courseTitle }) }}</span>
        <a class="degree-change" :href="link('record')">{{ t('majors.change') }}</a>
      </p>
      <!-- "Fits me" or a ranked list sets the order itself: said here, with a way to turn it off. -->
      <span v-if="order" class="sort">
        <span class="sort-label">{{ t('browse.sort') }}</span>
        <button type="button" class="chip-on" :aria-label="t('browse.removeFilter', { x: order.label })" @click="filters = chooseOrder(filters, null)">
          <component :is="order.icon" :size="14" aria-hidden="true" />{{ order.label }}<X :size="14" aria-hidden="true" />
        </button>
      </span>
      <label v-else class="sort">
        <span class="sort-label">{{ t('browse.sort') }}</span>
        <select class="select-glass" :value="filters.sort" @change="set('sort', ($event.target as HTMLSelectElement).value as BrowseSort)">
          <option value="code">{{ t('browse.sortCode') }}</option>
          <option value="easy">{{ t('browse.sortEasy') }}</option>
          <option value="exam">{{ t('browse.sortExam') }}</option>
          <option value="hours">{{ t('browse.sortHours') }}</option>
          <option v-if="anyRated" value="rating">{{ t('browse.sortRating') }}</option>
        </select>
      </label>
    </div>
    <ul v-if="chips.length" class="chips" :aria-label="t('browse.activeFilters')">
      <li v-for="c in chips" :key="c.key">
        <button type="button" class="chip-on" :aria-label="t('browse.removeFilter', { x: c.label })" @click="c.off()">
          {{ c.label }}<X :size="14" aria-hidden="true" />
        </button>
      </li>
      <li v-if="chips.length > 1">
        <button type="button" class="chips-clear" @click="emit('clear')">{{ t('browse.clearAll') }}</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tbar {
  display: grid;
  gap: 10px;
}

/* Count first, then the degree it follows, the order on the far right. */
.tbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-height: 44px;
  padding: 6px 8px 6px 18px;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--card-fill);
}

.count {
  margin: 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-bold);
  white-space: nowrap;
}

.degree {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.degree > span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.degree svg {
  flex: none;
  color: var(--accent);
}

.degree-change {
  flex: none;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
  background: var(--accent-soft);
  border-radius: 999px;
}

.degree-change:hover {
  text-decoration: underline;
}

.sort {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.sort .select-glass {
  min-height: 36px;
}

.ftoggle {
  display: none;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
}

.fbadge {
  min-width: 20px;
  padding: 0 6px;
  font-size: var(--fs-caption);
  line-height: 20px;
  text-align: center;
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
  border-radius: 999px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip-on {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 10px 4px 12px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 999px;
  cursor: pointer;
}

.chip-on:hover {
  border-color: var(--accent);
}

.chips-clear {
  min-height: 32px;
  padding: 4px 8px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
  background: none;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* Phones: Filters and the order on one line, the count and degree on the next. */
@media (max-width: 720px) {
  .tbar-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
  }

  /* With the filters folded into a sheet, their button is the one to find: pink, like the
     order chips above it. */
  .ftoggle {
    display: inline-flex;
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: var(--accent-soft);
  }

  .ftoggle svg {
    color: var(--accent);
  }

  .sort {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    /* A long order name ("Jam kelas paling sedikit") shortens in the box, never widens the page. */
    max-width: 100%;
    min-width: 0;
  }

  .sort-label {
    display: none;
  }

  .sort .select-glass {
    min-height: 44px;
    min-width: 0;
    max-width: 100%;
  }

  .count {
    grid-column: 1;
  }

  .degree {
    grid-column: 2;
    justify-content: flex-end;
    min-width: 0;
  }

  .chip-on {
    min-height: 40px;
  }
}
</style>
