<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import { CalendarDays, Clock, Coins, FileText, Gauge, Layers, ListChecks, Route, Shapes, SlidersHorizontal, Tags, X } from 'lucide-vue-next'
import { activeCount, clearFilters, type BrowseFilters, type Facets, type IndexedRow, type ListGroup, type PrereqChoice } from '@/engine'
import { useI18n } from '@/i18n'
import { categoryTag } from '@/i18n/format'
import FilterGroup from './FilterGroup.vue'
import FilterChips, { type FilterOption } from './FilterChips.vue'

/**
 * Every filter, in groups: a sticky glass panel beside the results on wide screens, a bottom
 * sheet on phones (opened from the toolbar's Filters button, `open`). Options within a group are
 * alternatives; groups all apply. Each option shows how many subjects it would list right now.
 */
const props = defineProps<{ index: readonly IndexedRow[]; facets: Facets; count: number; hasRecord: boolean }>()
const filters = defineModel<BrowseFilters>({ required: true })
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const LISTS: { id: ListGroup; icon: Component; title: string; list?: boolean }[] = [
  { id: 'category', icon: Shapes, title: 'browse.type', list: true },
  { id: 'topics', icon: Tags, title: 'browse.topics', list: true },
  { id: 'level', icon: Layers, title: 'browse.level' },
  { id: 'period', icon: CalendarDays, title: 'browse.when' },
  { id: 'points', icon: Coins, title: 'browse.points' },
  { id: 'exam', icon: FileText, title: 'browse.exam' },
  { id: 'hours', icon: Clock, title: 'browse.hours' },
  { id: 'ease', icon: Gauge, title: 'browse.ease' },
]
const FIXED: Partial<Record<ListGroup, readonly (string | number)[]>> = {
  period: ['semester-1', 'semester-2', 'summer', 'winter'],
  exam: ['none', 'light', 'mid', 'heavy'],
  hours: ['light', 'mid', 'heavy'],
  ease: ['easy', 'hard'],
}

// Every option the data has (not only the student's degree's), in a steady order: fixed ones as
// listed, numbers ascending, the rest most common first (breadth leads the kinds).
const universe = computed(() => {
  const totals = Object.fromEntries(LISTS.map((g) => [g.id, new Map<string | number, number>()])) as Record<ListGroup, Map<string | number, number>>
  for (const r of props.index) for (const g of LISTS) for (const v of r.options[g.id]) totals[g.id].set(v, (totals[g.id].get(v) ?? 0) + 1)
  const out = {} as Record<ListGroup, (string | number)[]>
  for (const g of LISTS) {
    const m = totals[g.id]
    const fixed = FIXED[g.id]
    out[g.id] = fixed
      ? fixed.filter((v) => m.has(v))
      : [...m.keys()].sort((a, b) =>
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : (b === 'breadth' ? 1 : 0) - (a === 'breadth' ? 1 : 0) || m.get(b)! - m.get(a)! || String(a).localeCompare(String(b)),
        )
  }
  return out
})

function label(g: ListGroup, v: string | number): string {
  const tr = t.value
  switch (g) {
    case 'category':
      return categoryTag(tr, String(v))
    case 'topics':
      return tr(`topic.${v}`)
    case 'level':
      return tr('subject.level', { level: v })
    case 'period':
      return tr(`periodShort.${v}`)
    case 'points':
      return tr('majors.points', { n: v })
    case 'exam':
      return tr(`browse.examBand.${v}`)
    case 'hours':
      return tr(`browse.hoursBand.${v}`)
    case 'ease':
      return tr(`browse.easeOpt.${v}`)
  }
}

const options = computed(() => {
  const f = props.facets.lists
  return Object.fromEntries(LISTS.map((g) => [g.id, universe.value[g.id].map((v) => ({ value: v, label: label(g.id, v), count: f[g.id].get(v) ?? 0 }))])) as Record<
    ListGroup,
    FilterOption<string | number>[]
  >
})

function setList(g: ListGroup, v: readonly (string | number)[]): void {
  filters.value = { ...filters.value, [g]: v }
}

// Prerequisites: one choice. "I meet them" needs something on the student's record.
const prereqChoices = computed(() => {
  const out: { value: PrereqChoice; label: string; count?: number }[] = [
    { value: 'any', label: t.value('browse.any') },
    { value: 'none', label: t.value('browse.noPrereq'), count: props.facets.prereq.none },
  ]
  if (props.hasRecord || filters.value.prereq === 'met') out.push({ value: 'met', label: t.value('browse.prereqMet'), count: props.facets.prereq.met })
  return out
})
function setPrereq(v: PrereqChoice): void {
  filters.value = { ...filters.value, prereq: v }
}

// "Only": on/off switches, as one list. Subjects not running this year are left out unless asked for.
type Switch = 'noGroup' | 'noHurdle' | 'noTest' | 'reviewed' | 'showOff'
const switchOptions = computed<FilterOption<Switch>[]>(() => {
  const s = props.facets.switches
  return [
    { value: 'noGroup', label: t.value('browse.noGroup'), count: s.noGroup },
    { value: 'noHurdle', label: t.value('browse.noHurdle'), count: s.noHurdle },
    { value: 'noTest', label: t.value('browse.noTest'), count: s.noTest },
    { value: 'reviewed', label: t.value('browse.reviewed'), count: s.reviewed },
    { value: 'showOff', label: t.value('browse.showOff'), count: s.running },
  ]
})
const switches = computed({
  get: (): readonly Switch[] => {
    const f = filters.value
    const on: Switch[] = (['noGroup', 'noHurdle', 'noTest', 'reviewed'] as const).filter((k) => f[k])
    return f.running ? on : [...on, 'showOff']
  },
  set: (on: readonly Switch[]) => {
    filters.value = { ...filters.value, noGroup: on.includes('noGroup'), noHurdle: on.includes('noHurdle'), noTest: on.includes('noTest'), reviewed: on.includes('reviewed'), running: !on.includes('showOff') }
  },
})

const active = computed(() => activeCount(filters.value))
function activeIn(g: ListGroup | 'prereq' | 'only'): number {
  const f = filters.value
  if (g === 'prereq') return f.prereq === 'any' ? 0 : 1
  if (g === 'only') return switches.value.length
  return f[g].length
}
function clear(): void {
  filters.value = clearFilters(filters.value)
}

// Folds: the ones asked about most open; any group with a filter on opens too.
const folds = shallowRef<Record<string, boolean>>({ category: true, level: true, period: true, exam: true, prereq: true })
for (const g of [...LISTS.map((x) => x.id), 'prereq', 'only'] as const) if (activeIn(g)) folds.value = { ...folds.value, [g]: true }
function setFold(g: string, v: boolean): void {
  folds.value = { ...folds.value, [g]: v }
}

// Phones: the filters live in a bottom sheet. Wide screens: the sticky panel.
const PHONE = '(max-width: 720px)'
const phone = shallowRef(typeof matchMedia !== 'undefined' && matchMedia(PHONE).matches)
let mq: MediaQueryList | null = null
const onChange = (e: MediaQueryListEvent): void => {
  phone.value = e.matches
  if (!e.matches) open.value = false
  void nextTick(fit)
}
// The page behind the sheet stays still while it is open; focus goes into it.
watch(open, (v) => {
  document.documentElement.style.overflow = v && phone.value ? 'hidden' : ''
  if (v) void nextTick(() => document.querySelector<HTMLElement>('#browse-filters .sheet-close')?.focus())
})
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) open.value = false
}

// ---- Desktop panel: groups scroll inside it; the illustration only where it fits (as GuideToc). ----
const Mini = defineAsyncComponent(() => import('./art/MiniBrowse.vue'))
const panel = useTemplateRef<HTMLElement>('panel')
const scroller = useTemplateRef<HTMLElement>('scroller')
const fadeTop = shallowRef(false)
const fadeBottom = shallowRef(false)
const showArt = shallowRef(false)
// The illustration's height (CSS .fpanel-art) plus the gap above it.
const ART_SPACE = 112
function edges(): void {
  const el = scroller.value
  if (!el) return
  fadeTop.value = el.scrollTop > 2
  fadeBottom.value = el.scrollTop + el.clientHeight < el.scrollHeight - 2
}
function fit(): void {
  const el = scroller.value
  const box = panel.value
  if (!el || !box) return
  if (phone.value) {
    showArt.value = false
    return
  }
  const limit = parseFloat(getComputedStyle(box).maxHeight) || window.innerHeight
  const head = box.firstElementChild?.getBoundingClientRect().height ?? 0
  showArt.value = head + el.scrollHeight + ART_SPACE + 40 <= limit
  void nextTick(edges)
}
let ro: ResizeObserver | null = null
onMounted(() => {
  mq = matchMedia(PHONE)
  phone.value = mq.matches
  mq.addEventListener('change', onChange)
  ro = new ResizeObserver(fit)
  const inner = scroller.value?.firstElementChild
  if (inner) ro.observe(inner)
  window.addEventListener('resize', fit)
  fit()
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', onChange)
  window.removeEventListener('resize', fit)
  ro?.disconnect()
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <aside class="filters">
    <Teleport to="body" :disabled="!phone">
      <div v-if="phone && open" class="scrim" aria-hidden="true" @click="open = false" />
      <div
        v-show="!phone || open"
        id="browse-filters"
        ref="panel"
        class="fpanel surface"
        :class="{ sheet: phone }"
        :role="phone ? 'dialog' : undefined"
        :aria-modal="phone ? 'true' : undefined"
        aria-labelledby="browse-filters-title"
        @keydown="onKey"
      >
        <div class="fpanel-head">
          <span v-if="phone" class="sheet-grip" aria-hidden="true" />
          <h2 id="browse-filters-title" class="fpanel-title"><SlidersHorizontal :size="16" aria-hidden="true" />{{ t('browse.filters') }}</h2>
          <button v-if="active && !phone" type="button" class="fclear" @click="clear">{{ t('browse.clearAll') }}</button>
          <button v-if="phone" type="button" class="sheet-close" :aria-label="t('subject.close')" @click="open = false"><X :size="20" aria-hidden="true" /></button>
        </div>
        <div ref="scroller" class="fpanel-scroll" :class="{ 'fade-top': fadeTop, 'fade-bottom': fadeBottom }" @scroll.passive="edges">
          <div class="fpanel-groups">
            <FilterGroup
              v-for="g in LISTS"
              :key="g.id"
              :title="t(g.title)"
              :icon="g.icon"
              :active="activeIn(g.id)"
              :open="!!folds[g.id]"
              @update:open="setFold(g.id, $event)"
            >
              <FilterChips :model-value="filters[g.id]" :options="options[g.id]" :label="t(g.title)" :list="g.list" @update:model-value="setList(g.id, $event)" />
            </FilterGroup>
            <FilterGroup :title="t('browse.prereq')" :icon="Route" :active="activeIn('prereq')" :open="!!folds.prereq" @update:open="setFold('prereq', $event)">
              <div class="fradio" role="radiogroup" :aria-label="t('browse.prereq')">
                <button
                  v-for="c in prereqChoices"
                  :key="c.value"
                  type="button"
                  role="radio"
                  class="fradio-opt"
                  :aria-checked="filters.prereq === c.value"
                  @click="setPrereq(c.value)"
                >
                  <span class="fdot" aria-hidden="true" />
                  <span class="flabel">{{ c.label }}</span>
                  <span v-if="c.count !== undefined" class="fcount">{{ c.count }}</span>
                </button>
              </div>
            </FilterGroup>
            <FilterGroup :title="t('browse.only')" :icon="ListChecks" :active="activeIn('only')" :open="!!folds.only" @update:open="setFold('only', $event)">
              <FilterChips v-model="switches" :options="switchOptions" :label="t('browse.only')" list />
            </FilterGroup>
          </div>
        </div>
        <div v-if="showArt" class="fpanel-art" aria-hidden="true"><Mini /></div>
        <!-- Phone: one clear way back to the list, with the number it will show. -->
        <div v-if="phone" class="sheet-foot">
          <button type="button" class="button button-quiet" :disabled="!active" @click="clear">{{ t('browse.clear') }}</button>
          <button type="button" class="button button-accent show" @click="open = false">{{ t('browse.showResults', { n: count }) }}</button>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
/* One glass panel, held under the header while the results scroll; never taller than the window. */
.fpanel {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 104px);
  padding: 14px 10px 12px;
  border-radius: 22px;
}

.fpanel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 32px;
  padding: 0 8px 10px;
  border-bottom: 1px solid var(--divider);
}

.fpanel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fclear {
  min-height: 28px;
  padding: 0 10px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: var(--accent-soft);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.fclear:hover {
  text-decoration: underline;
}

.fclear:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* The groups scroll inside the panel; a soft fade at an edge with more beyond it. */
.fpanel-scroll {
  flex: 0 1 auto;
  min-height: 0;
  margin: 0 -4px;
  padding: 4px 4px 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--ink) 22%, transparent) transparent;
  --fade-top: 0px;
  --fade-bottom: 0px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--fade-top), #000 calc(100% - var(--fade-bottom)), transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 var(--fade-top), #000 calc(100% - var(--fade-bottom)), transparent);
}

.fpanel-scroll.fade-top {
  --fade-top: 28px;
}

.fpanel-scroll.fade-bottom {
  --fade-bottom: 28px;
}

.fpanel-art {
  flex: none;
  height: 80px;
  margin-top: 12px;
  padding: 0 12px;
}

.fpanel-art > :deep(*) {
  width: 100%;
  height: 100%;
}

/* Prerequisites: one choice of three, as radio rows. */
.fradio {
  display: grid;
  gap: 2px;
}

.fradio-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 5px 10px 5px 8px;
  font-size: var(--fs-meta);
  color: var(--ink);
  text-align: start;
  background: none;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.fradio-opt:hover {
  background: var(--inset-fill);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

.fradio-opt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fradio-opt[aria-checked='true'] {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.fdot {
  flex: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid color-mix(in srgb, var(--ink) 30%, transparent);
  border-radius: 50%;
}

[aria-checked='true'] .fdot {
  border: 5px solid var(--accent-fill);
}

.flabel {
  flex: 1;
  min-width: 0;
}

.fcount {
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-caption);
  font-weight: var(--fw-medium);
  color: var(--ink-soft);
}

[aria-checked='true'] .fcount {
  color: var(--accent);
}

/* ---------- Phone bottom sheet: the same panel, rounded top, the actions at the bottom ---------- */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgb(20 10 25 / 38%);
}

.fpanel.sheet {
  position: fixed;
  inset: auto 0 0;
  z-index: 91;
  max-height: 86dvh;
  padding: 0;
  border-radius: 24px 24px 0 0;
  background: var(--glass-shine), var(--sheet-fill);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  backdrop-filter: var(--glass-blur-strong);
}

.sheet .fpanel-head {
  position: relative;
  padding: 18px 16px 10px 20px;
}

.sheet .fpanel-title {
  font-size: 1.125rem;
  font-weight: var(--fw-bold);
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
}

.sheet .fpanel-scroll {
  margin: 0;
  padding: 4px 10px 12px;
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

.sheet-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.sheet-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--divider);
}

.sheet-foot .button {
  justify-content: center;
  min-height: 48px;
}

.sheet-foot .show {
  flex: 1;
}

.sheet :deep(.fopt),
.sheet .fradio-opt,
.sheet :deep(.fgroup-toggle) {
  min-height: 44px;
}
</style>
