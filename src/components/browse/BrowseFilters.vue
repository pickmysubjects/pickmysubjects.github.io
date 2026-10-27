<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-vue-next'
import { EMPTY_FILTERS, type BrowseFilters } from '@/engine'
import { useI18n } from '@/i18n'

const props = defineProps<{ categories: string[]; count: number }>()
const filters = defineModel<BrowseFilters>({ required: true })
const { t } = useI18n()

// The current course's own categories (science/breadth for B-SCI, commerce/breadth for B-COM).
const categories = computed(() => ['', ...props.categories])
const LEVELS = [null, 1, 2, 3] as const
// Semesters first, then the short terms: "Any" on its own row and two even pairs below it.
const WHEN = [null, 'semester-1', 'semester-2', 'summer', 'winter'] as const
const TOGGLES = ['noPrereq', 'noExam', 'noGroup', 'noHurdle', 'noTest', 'running'] as const

// Phones: the filters live in a bottom sheet, opened by the Filters button. Wide screens: a sidebar.
const PHONE = '(max-width: 720px)'
const phone = shallowRef(typeof matchMedia !== 'undefined' && matchMedia(PHONE).matches)
const open = shallowRef(false)
let mq: MediaQueryList | null = null
const onChange = (e: MediaQueryListEvent): void => {
  phone.value = e.matches
  if (!e.matches) open.value = false
}
onMounted(() => {
  mq = matchMedia(PHONE)
  phone.value = mq.matches
  mq.addEventListener('change', onChange)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', onChange)
  document.documentElement.style.overflow = ''
})
// The page behind the sheet stays still while it is open.
watch(open, (v) => {
  document.documentElement.style.overflow = v && phone.value ? 'hidden' : ''
})
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}
const active = computed(() => {
  const f = filters.value
  return [f.category, f.level !== null, f.period, f.noPrereq, f.noExam, f.noGroup, f.noHurdle, f.noTest, f.running].filter(Boolean).length
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

    <Teleport to="body" :disabled="!phone">
    <div v-if="phone && open" class="scrim" aria-hidden="true" @click="open = false" />
    <div
      v-show="!phone || open"
      id="browse-more"
      class="groups surface"
      :class="{ sheet: phone }"
      :role="phone ? 'dialog' : undefined"
      :aria-modal="phone ? 'true' : undefined"
      :aria-label="phone ? t('browse.filters') : undefined"
      @keydown="onKey"
    >
      <div v-if="phone" class="sheet-head">
        <span class="sheet-grip" aria-hidden="true" />
        <h2 class="sheet-title">{{ t('browse.filters') }}</h2>
        <button type="button" class="sheet-close" :aria-label="t('subject.close')" @click="open = false"><X :size="20" aria-hidden="true" /></button>
      </div>
      <div class="sheet-body">
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

      <button v-if="active && !phone" type="button" class="clear" @click="clear">{{ t('browse.clear') }}</button>
      </div>
      <!-- Phone: one clear way back to the list, with the number it will show. -->
      <div v-if="phone" class="sheet-foot">
        <button v-if="active" type="button" class="clear" @click="clear">{{ t('browse.clear') }}</button>
        <button type="button" class="button button-accent show" @click="open = false">{{ t('browse.showResults', { n: count }) }}</button>
      </div>
    </div>
    </Teleport>
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
  background: var(--accent-fill);
  border-radius: 999px;
}

.groups {
  display: grid;
  gap: 20px;
  padding: 18px 16px;
}

.sheet-body {
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

/* Phone bottom sheet: glass, rounded top, sticky action at the bottom. */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgb(20 10 25 / 38%);
}

.sheet {
  position: fixed;
  inset: auto 0 0;
  z-index: 91;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 86dvh;
  padding: 0;
  border-radius: 24px 24px 0 0;
  background: var(--glass-shine), var(--sheet-fill);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
}

.sheet .sheet-body {
  overflow-y: auto;
  padding: 4px 16px 16px;
  overscroll-behavior: contain;
}

.sheet-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 8px;
}

.sheet-grip {
  position: absolute;
  top: 7px;
  left: 50%;
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 22%, transparent);
  transform: translateX(-50%);
}

.sheet-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.sheet-close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid color-mix(in srgb, var(--ink) 10%, transparent);
}

.sheet-foot .show {
  flex: 1;
  justify-content: center;
  min-height: 48px;
}

.sheet .seg button {
  min-height: 42px;
}

.sheet .only {
  min-height: 40px;
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
}
</style>
