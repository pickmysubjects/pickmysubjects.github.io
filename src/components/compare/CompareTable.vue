<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, Ellipsis, Pencil, X } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import type { ComparedPlan } from '@/composables/usePlanCompare'
import type { PlanEntry } from '@/composables/usePlans'
import { useI18n } from '@/i18n'
import { planName } from '@/components/plans/planName'
import type { Group, GroupId } from './compareRows'

/**
 * Plans as columns, facts as rows, under a header that stays in view with each plan's name, its
 * major, Edit and a small menu. Rows sit in named groups that fold. On a phone: always two plans,
 * picked in the header (with a swap), each row's label above its two values, and a bar to jump
 * between groups.
 */
const props = defineProps<{
  plans: ComparedPlan[]
  groups: Group[]
  diff: boolean
  open: Record<GroupId, boolean>
  phone: boolean
  /** Every plan the student has, for the pickers and "show another plan". */
  every: PlanEntry[]
  /** The planner at each shown plan. */
  edits: string[]
}>()
const emit = defineEmits<{
  toggle: [id: GroupId]
  replace: [index: number, label: string]
  move: [index: number, by: -1 | 1]
  remove: [index: number]
  swap: []
}>()
const { t } = useI18n()

const names = computed(() => props.plans.map((p) => planName(t.value, p.entry)))
const majorLine = (p: ComparedPlan) => [p.major || t.value('plans.noMajor'), p.minor ? t.value(p.minorInformal ? 'plans.informalLine' : 'plans.minorLine', { title: p.minor }) : ''].filter(Boolean).join(' · ')
const shownLabels = computed(() => new Set(props.plans.map((p) => p.entry.label)))
const others = computed(() => props.every.filter((e) => !shownLabels.value.has(e.label)))

// Rows the "Only differences" switch hides, and how many in each group.
const visible = (g: Group) => (props.diff ? g.rows.filter((r) => !r.same) : g.rows)
const hiddenCount = (g: Group) => g.rows.length - visible(g).length

// ---- The column menu: one open at a time; a tap outside or Esc closes it. ----
const menu = shallowRef<number | null>(null)
function close(event: Event): void {
  if (menu.value === null) return
  if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target as Element).closest('.col-menu')) menu.value = null
}
onMounted(() => {
  document.addEventListener('pointerdown', close)
  document.addEventListener('keydown', close)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', close)
  document.removeEventListener('keydown', close)
})
function act(fn: () => void): void {
  fn()
  menu.value = null
}

// Phone pickers: a plan picked for one side that's on the other side swaps them.
function pick(slot: 0 | 1, label: string): void {
  if (props.plans[1 - slot]?.entry.label === label) emit('swap')
  else emit('replace', slot, label)
}
const cols = computed(() => ({ '--n': props.plans.length }))
</script>

<template>
  <section id="cmp-table" class="table surface" :class="{ phone }" role="table" :aria-label="t('cmp.title')" :style="cols">
    <!-- The header row stays under the site's top bar while the rows scroll. -->
    <div class="head" role="rowgroup">
      <div v-if="!phone" class="head-row" role="row">
        <div class="head-label" role="columnheader">
          <span class="legend"><span class="dot" aria-hidden="true" />{{ t('cmp.better') }}</span>
        </div>
        <div v-for="(p, i) in plans" :key="p.entry.id" class="col" role="columnheader">
          <p class="col-name">{{ names[i] }}</p>
          <p class="col-sub">{{ majorLine(p) }}</p>
          <div class="col-tools">
            <a class="col-edit" :href="edits[i]" :aria-label="t('cmp.editPlan', { name: names[i] ?? '' })"><Pencil :size="14" aria-hidden="true" />{{ t('cmp.edit') }}</a>
            <div class="col-menu">
              <button class="col-more" type="button" :aria-label="t('cmp.options', { name: names[i] ?? '' })" :aria-expanded="menu === i" @click="menu = menu === i ? null : i">
                <Ellipsis :size="16" aria-hidden="true" />
              </button>
              <div v-if="menu === i" class="pop" :class="{ 'pop-end': i === plans.length - 1 && plans.length > 1 }">
                <template v-if="others.length">
                  <p class="pop-label">{{ t('cmp.change') }}</p>
                  <button v-for="o in others" :key="o.id" class="pop-item" type="button" @click="act(() => emit('replace', i, o.label))">{{ planName(t, o) }}</button>
                  <hr class="pop-rule" />
                </template>
                <button class="pop-item" type="button" :disabled="i === 0" @click="act(() => emit('move', i, -1))"><ChevronLeft :size="15" aria-hidden="true" />{{ t('cmp.moveLeft') }}</button>
                <button class="pop-item" type="button" :disabled="i === plans.length - 1" @click="act(() => emit('move', i, 1))"><ChevronRight :size="15" aria-hidden="true" />{{ t('cmp.moveRight') }}</button>
                <button class="pop-item" type="button" :disabled="plans.length <= 2" @click="act(() => emit('remove', i))"><X :size="15" aria-hidden="true" />{{ t('cmp.remove') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="pickers" role="row">
          <label v-for="slot in [0, 1] as const" :key="slot" class="picker" role="columnheader">
            <span class="visually-hidden">{{ t(slot === 0 ? 'cmp.first' : 'cmp.second') }}</span>
            <select class="select-glass picker-select" :value="plans[slot]?.entry.label" @change="pick(slot, ($event.target as HTMLSelectElement).value)">
              <option v-for="e in every" :key="e.id" :value="e.label">{{ planName(t, e) }}</option>
            </select>
          </label>
          <button class="swap" type="button" :aria-label="t('cmp.swap')" :title="t('cmp.swap')" @click="emit('swap')">
            <ArrowLeftRight :size="18" aria-hidden="true" />
          </button>
        </div>
        <nav class="jump" :aria-label="t('cmp.jump')">
          <a class="jump-chip" href="#cmp-summary">{{ t('cmp.summaryTitle') }}</a>
          <a v-for="g in groups" :key="g.id" class="jump-chip" :href="`#cmp-g-${g.id}`" @click="!open[g.id] && emit('toggle', g.id)">{{ g.title }}</a>
          <a class="jump-chip" href="#cmp-timeline">{{ t('cmp.timelineTitle') }}</a>
        </nav>
      </template>
    </div>

    <div v-for="g in groups" :key="g.id" :id="`cmp-g-${g.id}`" class="group" role="rowgroup">
      <div class="group-row" role="row">
        <button class="group-head" type="button" role="rowheader" :aria-expanded="open[g.id]" @click="emit('toggle', g.id)">
          <ChevronDown :size="16" aria-hidden="true" class="group-chev" :class="{ shut: !open[g.id] }" />
          <span class="group-title">{{ g.title }}</span>
          <span v-if="diff && hiddenCount(g)" class="group-same">{{ t('cmp.sameRows', { n: hiddenCount(g) }) }}</span>
        </button>
      </div>
      <template v-if="open[g.id]">
        <div v-for="r in visible(g)" :id="`cmp-${r.id}`" :key="r.id" class="row" :class="{ 'row-same': r.same }" role="row">
          <div class="label" role="rowheader">
            {{ r.label }}<InfoTip v-if="r.info" :text="r.info" />
          </div>
          <div v-for="(c, i) in r.cells" :key="i" class="cell" role="cell">
            <span v-if="phone" class="cell-plan">{{ names[i] }}</span>
            <span v-if="c.text" class="cell-text">{{ c.text }}<span v-if="c.tag" class="tag">{{ c.tag }}</span></span>
            <ul v-if="c.items" class="cell-items">
              <li v-for="(it, k) in c.items" :key="k" :class="{ 'item-only': it.only }">
                <span v-if="it.only" class="item-plus" aria-hidden="true">+</span>{{ it.text }}<span v-if="it.only" class="visually-hidden"> ({{ t('cmp.onlyHere') }})</span>
              </li>
            </ul>
            <ul v-if="c.sub" class="cell-sub">
              <li v-for="(s, k) in c.sub" :key="k">{{ s }}</li>
            </ul>
            <span v-if="r.better.includes(i)" class="better"><span class="dot" aria-hidden="true" />{{ t('cmp.better') }}</span>
            <a v-if="c.fix" class="fix" :href="c.fix">{{ t('cmp.fix') }}</a>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.table {
  --label-w: 220px;
  --cols: var(--label-w) repeat(var(--n), minmax(0, 1fr));

  display: grid;
  min-width: 0;
  padding: 0 0 12px;
}

/* ---------- Header: sticky under the site bar ---------- */
.head {
  position: sticky;
  top: 65px;
  z-index: 6;
  border-bottom: 1px solid var(--divider);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  /* Solid enough that rows sliding under it never show through. */
  background: var(--glass-shine), linear-gradient(var(--sheet-fill), var(--sheet-fill)), var(--bg);
  box-shadow: 0 6px 14px -10px rgb(60 20 80 / 35%);
}

.head-row,
.row {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 0 16px;
  padding-inline: 24px;
}

.head-row {
  align-items: end;
  padding-block: 16px 12px;
}

.head-label {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.col {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.col-name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
  overflow-wrap: anywhere;
}

.col-sub {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.col-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.col-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 10px 0 0;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  text-decoration: none;
}

.col-edit:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.col-menu {
  position: relative;
}

.col-more {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  color: var(--ink);
  cursor: pointer;
}

.col-more:hover {
  background: var(--glass-fill-hover);
}

.pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  display: grid;
  min-width: 220px;
  padding: 6px;
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--sheet-fill);
  box-shadow: var(--shadow-2);
}

.pop-end {
  right: 0;
  left: auto;
}

.pop-label {
  margin: 0;
  padding: 6px 10px 2px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.pop-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-small);
  text-align: left;
  cursor: pointer;
}

.pop-item:hover:not(:disabled) {
  background: var(--accent-soft);
}

.pop-item:disabled {
  opacity: 0.45;
  cursor: default;
}

.pop-rule {
  margin: 4px 6px;
  border: 0;
  border-top: 1px solid var(--divider);
}

/* ---------- Groups and rows ---------- */
.group {
  scroll-margin-top: 170px;
}

.group-row {
  padding: 14px 24px 4px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.group-title {
  font-size: 1.0625rem;
  font-weight: var(--fw-bold);
}

.group-same {
  margin-left: auto;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.group-chev {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.2s;
}

.group-chev.shut {
  transform: rotate(-90deg);
}

@media (prefers-reduced-motion: reduce) {
  .group-chev {
    transition: none;
  }
}

/* Rows: a hairline between them and a soft band on hover, so the eye keeps its line. */
.row {
  align-items: start;
  padding-block: 12px;
  border-top: 1px solid var(--divider);
  scroll-margin-top: 170px;
}

.row:hover {
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}

.row:target {
  background: color-mix(in srgb, var(--accent) 9%, transparent);
}

.label {
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.cell {
  display: grid;
  justify-items: start;
  gap: 4px;
  min-width: 0;
  font-size: 0.9375rem;
  overflow-wrap: anywhere;
}

.row-same .cell-text {
  color: var(--ink-soft);
}

.cell-sub {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.cell-items {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cell-items li {
  color: var(--ink-soft);
}

.cell-items .item-only {
  color: var(--ink);
  font-weight: var(--fw-medium);
}

.item-plus {
  margin-right: 4px;
  font-weight: var(--fw-bold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.cell-sub li {
  overflow-wrap: anywhere;
}

.tag {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--warn) 14%, transparent);
  color: color-mix(in srgb, var(--warn) 75%, var(--ink));
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}

/* "Better": a dot and the word, never colour alone. */
.better {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--good);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--good);
}

.fix {
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

/* ---------- Phones: two plans, labels above values ---------- */
.phone .head {
  top: 57px;
  display: grid;
  gap: 8px;
  padding: 10px 12px;
}

.pickers {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.picker:nth-of-type(2) {
  order: 3;
}

.picker-select {
  width: 100%;
  min-height: 44px;
}

.swap {
  order: 2;
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  color: var(--ink);
  cursor: pointer;
}

.jump {
  display: flex;
  gap: 6px;
  margin: 0 -12px;
  padding: 0 12px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.jump::-webkit-scrollbar {
  display: none;
}

.jump-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.phone .group-row {
  padding: 12px 12px 2px;
}

.phone .group-head {
  min-height: 44px;
}

.phone .row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 6px 12px;
  padding: 12px;
}

.phone .label {
  grid-column: 1 / -1;
}

.cell-plan {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.phone .group,
.phone .row {
  scroll-margin-top: 200px;
}

@media (max-width: 1100px) {
  .table {
    --label-w: 160px;
  }
}
</style>
