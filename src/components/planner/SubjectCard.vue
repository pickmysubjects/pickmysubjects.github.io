<script setup lang="ts">
import { computed, inject, nextTick, useTemplateRef, watch } from 'vue'
import { ArrowRightLeft, BookOpen, CalendarRange, Info, Route, X } from 'lucide-vue-next'
import type { Issue, Subject } from '@/engine'
import { categoryTag, issueText as issueTextFor } from '@/i18n/format'
import { useI18n } from '@/i18n'
import { useDataYear } from '@/composables/useDataYear'
import { localTitle } from '@/i18n/localized'
import { LINK_COUNTS, type DropVerdict } from '@/utils/planBoard'
import DoneToggle from './DoneToggle.vue'

export type CardTone = 'self' | 'need' | 'unlock' | 'rule'
export interface MoveTarget {
  index: number
  label: string
  verdict: DropVerdict
}

/**
 * A planned subject as a two-line card (code and points; title), plus one status line only when
 * it matters: a problem, or 标为已修 in a begun term. Everything else lives in the tooltip and the
 * subject window. A planned subject as one compact card, so a whole degree fits on one screen. On a desktop its
 * actions show on hover or focus; on a phone a tap opens a small sheet with every action.
 */
const props = defineProps<{
  code: string
  subject?: Subject
  issues: Issue[]
  course: string
  /** e.g. "S1 only" when the subject runs in just one semester. */
  onlyIn: string | null
  /** required: the degree or major insists on it; option: one of a major's lists. */
  role?: 'required' | 'option'
  termIndex: number
  /** The year of the term it's planned in. */
  year: number
  /** How it relates to the selected subject or rule; null when nothing is selected. */
  tone: CardTone | null
  /** Selected (not just hovered): a second tap opens the details. */
  selected: boolean
  dimmed: boolean
  /** The action sheet is open on this subject, with every term and whether it can go there. */
  moveOpen: boolean
  moveTargets: MoveTarget[]
  /** The term has started or ended: the card offers 标为已修. */
  begun?: boolean
}>()
const emit = defineEmits<{
  select: []
  open: []
  hover: [on: boolean]
  moveSheet: [open: boolean]
  swap: []
  moveTo: [index: number]
  remove: []
  /** Marked done (with its mark, for a graded subject): it goes to My record. */
  done: [mark: number | undefined]
  dragStart: []
  dragEnd: []
}>()

const { t, locale } = useI18n()
const linkCounts = inject(LINK_COUNTS, null)
const links = computed(() => linkCounts?.value.counts.get(props.code))
// The title in the reader's language where we have one; the English one goes to the tooltip.
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))
// Planned in a year whose Handbook is out but not entered for it yet: say which year's facts it uses.
const { facts, handbookFor } = useDataYear()
const factsFrom = computed(() => (props.subject ? facts(props.subject, props.year) : null))
const hbHref = computed(() => handbookFor(props.code, props.year))

// Touch screens have no hover: a tap opens the sheet with every action instead.
const touch = () => typeof window !== 'undefined' && window.matchMedia('(hover: none), (max-width: 720px)').matches

// One click opens the details; the window shows the subject's chain itself, so nothing lights
// up behind it (hovering a card still previews its route on the board).
function onCardClick(event: MouseEvent): void {
  if ((event.target as Element).closest('.row-actions, .sheet')) return
  if (touch()) return emit('moveSheet', true)
  emit('open')
}

// Info-level notes (e.g. "assumes the timetable repeats") stay in the Checks panel;
// rows only carry a flag when something needs the student's attention.
const worst = computed(() => {
  if (props.issues.some((i) => i.severity === 'error')) return 'error'
  if (props.issues.some((i) => i.severity === 'warning')) return 'warning'
  return null
})
const category = computed(() => categoryTag(t.value, props.subject?.categories[props.course]))
const issueText = computed(() =>
  props.issues
    .filter((i) => i.severity !== 'info')
    .map((i) => issueTextFor(t.value, i, [], []))
    .join('\n'),
)
// One short words-only line for the worst problem ("先修未满足"); the full text is in the tooltip.
const problem = computed(() => {
  const top = props.issues.find((i) => i.severity === 'error') ?? props.issues.find((i) => i.severity === 'warning')
  if (!top) return ''
  const key = `plan.issueShort.${top.kind}`
  const short = t.value(key)
  return short === key ? t.value(top.severity === 'error' ? 'plan.problem' : 'plan.check') : short
})
const roleText = computed(() => (props.role === 'required' ? t.value('plan.tagRequired') : props.role === 'option' ? t.value('plan.tagOption') : ''))
// The full facts in the tooltip; the card itself keeps two lines and at most one status line.
const tooltip = computed(() => [`${props.code} ${local.value || props.subject?.title || ''}`, local.value ? props.subject?.title : '', [roleText.value, category.value].filter(Boolean).join(' · '), linkLabel.value, props.onlyIn, factsFrom.value?.older ? t.value('dataYear.tip', { year: factsFrom.value.year }) : '', issueText.value].filter(Boolean).join('\n'))
const rowClasses = computed(() => ({
  row: true,
  [`row-${worst.value}`]: worst.value !== null,
  [`row-tone-${props.tone}`]: props.tone !== null,
  'row-dimmed': props.dimmed,
  'row-unknown': !props.subject,
  [`row-role-${props.role}`]: !!props.role,
}))
const others = computed(() => props.moveTargets.filter((m) => m.index !== props.termIndex))

const sheet = useTemplateRef<HTMLDialogElement>('sheet')
watch(
  () => props.moveOpen,
  async (open) => {
    await nextTick()
    if (open && sheet.value && !sheet.value.open) sheet.value.showModal()
  },
  { immediate: true },
)
function onSheetClick(event: MouseEvent): void {
  if (event.target === sheet.value) emit('moveSheet', false)
}
function fromSheet(act: () => void): void {
  emit('moveSheet', false)
  act()
}

function reasonOf(v: DropVerdict): string {
  return v.ok ? t.value(v.warn ? `plan.why.${v.warn}` : 'plan.why.ok') : t.value(`plan.why.${v.reason}`)
}

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', JSON.stringify({ code: props.code, from: props.termIndex }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  emit('dragStart')
}
// "← 1 · → 2" in words: 需要先修 1 · 修完能解锁 2.
const linkLabel = computed(() => {
  const l = links.value
  if (!l) return undefined
  return [l.needs ? `${t.value('subject.needs')} ${l.needs}` : '', l.unlocks ? `${t.value('subject.unlocks')} ${l.unlocks}` : ''].filter(Boolean).join(' · ')
})
</script>

<template>
  <article
    :class="rowClasses"
    :data-code="code"
    :title="tooltip"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="emit('dragEnd')"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
    @focusin="emit('hover', true)"
    @focusout="emit('hover', false)"
    @click="onCardClick"
  >
    <button class="row-main" type="button" :aria-pressed="selected" :aria-label="t('plan.selectCard', { code })">
      <span class="code row-code">{{ code }}</span>
    </button>
    <span v-if="subject" class="row-points">{{ subject.points }}</span>
    <span class="row-title">{{ local || subject?.title || t('plan.notInDataset') }}</span>
    <span v-if="roleText" class="visually-hidden">{{ roleText }}</span>
    <!-- One status line, only when it matters: a problem first, else 标为已修 in a begun term. -->
    <span v-if="problem" class="row-foot row-problem" :class="`row-problem-${worst}`">{{ problem }}</span>
    <DoneToggle v-else-if="begun" class="row-foot" card :code="code" :done="false" :pass-fail="subject?.passFail" @done="emit('done', $event)" />

    <!-- Desktop: the actions on hover or focus, one click each. -->
    <span class="row-actions">
      <button class="act" type="button" :aria-label="t('plan.swapCode', { code })" :title="t('plan.swapCode', { code })" @click="emit('swap')">
        <ArrowRightLeft :size="14" aria-hidden="true" />
      </button>
      <button class="act" type="button" :aria-label="t('plan.moveCode', { code })" :title="t('plan.moveCode', { code })" @click="emit('moveSheet', true)">
        <CalendarRange :size="14" aria-hidden="true" />
      </button>
      <a class="act" :href="hbHref" target="_blank" rel="noopener" :aria-label="t('plan.handbookCode', { code })" :title="t('plan.handbookCode', { code })">
        <BookOpen :size="14" aria-hidden="true" />
      </a>
      <button class="act act-remove" type="button" :aria-label="t('plan.remove', { code })" :title="t('plan.remove', { code })" @click="emit('remove')">
        <X :size="14" aria-hidden="true" />
      </button>
    </span>

    <dialog v-if="moveOpen" ref="sheet" class="sheet" :aria-label="code" @close="emit('moveSheet', false)" @click="onSheetClick">
      <header class="sheet-head">
        <p class="sheet-title"><span class="code">{{ code }}</span> {{ local || subject?.title }}</p>
        <button type="button" class="sheet-x" :aria-label="t('menu.close')" @click="emit('moveSheet', false)"><X :size="16" aria-hidden="true" /></button>
      </header>
      <div class="sheet-actions">
        <button class="sheet-act" type="button" @click="fromSheet(() => emit('select'))"><Route :size="16" aria-hidden="true" />{{ t('plan.tlShow') }}</button>
        <button class="sheet-act" type="button" @click="fromSheet(() => emit('swap'))"><ArrowRightLeft :size="16" aria-hidden="true" />{{ t('plan.swap') }}</button>
        <a class="sheet-act" :href="hbHref" target="_blank" rel="noopener"><BookOpen :size="16" aria-hidden="true" />Handbook</a>
        <button class="sheet-act" type="button" @click="fromSheet(() => emit('open'))"><Info :size="16" aria-hidden="true" />{{ t('plan.detailsShort') }}</button>
        <button class="sheet-act sheet-remove" type="button" @click="fromSheet(() => emit('remove'))"><X :size="16" aria-hidden="true" />{{ t('plan.removeShort') }}</button>
      </div>
      <p class="sheet-label">{{ t('plan.moveCode', { code }) }}</p>
      <button
        v-for="m in others"
        :key="m.index"
        class="sheet-term"
        :class="{ 'sheet-term-off': !m.verdict.ok }"
        type="button"
        @click="emit('moveTo', m.index)"
      >
        <span class="sheet-dot" aria-hidden="true" />
        <span>{{ m.label }}</span>
        <span class="sheet-why">{{ reasonOf(m.verdict) }}</span>
      </button>
    </dialog>
  </article>
</template>

<style scoped>
.row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'code pts'
    'title title'
    'foot foot';
  align-content: start;
  align-items: baseline;
  gap: 1px 8px;
  min-width: 0;
  /* Every card on the board the same height, the status line reserved even when empty
     (one fixed height per language: --plan-card-h in main.css). */
  height: var(--plan-card-h);
  padding: 7px 9px 7px 11px;
  /* A flat, solid card on the board's glass: one hairline and one light shadow, no shine. */
  border: 1px solid var(--col-edge);
  border-radius: 10px;
  background: var(--card-solid);
  box-shadow: 0 1px 2px rgb(60 20 80 / 10%);
  cursor: grab;
  transition: opacity 0.12s, border-color 0.12s, box-shadow 0.12s;
}

/* The role as a thin left edge (the legend above the board says which is which). */
.row::before {
  content: '';
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 3px;
  width: 3px;
  border-radius: 2px;
  background: var(--row-edge, transparent);
}

.row-role-required {
  --row-edge: var(--accent);
}

.row-role-option {
  --row-edge: color-mix(in srgb, var(--accent) 38%, transparent);
}

.row:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--col-edge));
}

.row:focus-within {
  outline: none;
}

.row:has(.row-main:focus-visible) {
  box-shadow: 0 0 0 2px var(--accent);
}

.row:active {
  cursor: grabbing;
}

.row-main {
  grid-area: code;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: inherit;
}

.row-main:focus-visible {
  outline: none;
}

.row-code {
  line-height: var(--plan-card-line);
  display: block;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-points {
  line-height: var(--plan-card-line);
  grid-area: pts;
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
  transition: opacity 0.12s;
}

.row-title {
  line-height: var(--plan-card-line);
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-foot {
  grid-area: foot;
  min-width: 0;
  margin-top: 3px;
  font-size: 0.75rem;
  line-height: 22px;
}

.row-problem {
  overflow: hidden;
  font-weight: 650;
  color: var(--stop);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row-problem-warning {
  color: var(--warn-ink, var(--open));
}

.row-error {
  border-color: color-mix(in srgb, var(--stop) 55%, var(--col-edge));
}

.row-unknown {
  border-style: dashed;
}

/* The actions float as a small toolbar over the points in the card's top-right corner on hover or
   keyboard focus. They take no space in the layout and never cover another card. */
.row-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  display: flex;
  gap: 0;
  height: 24px;
  padding: 0 1px;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--card-solid);
  box-shadow: 0 2px 6px -2px rgb(60 20 80 / 30%);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease, visibility 0.12s;
}

.row:hover,
.row:focus-within {
  z-index: 4;
}

.row:hover .row-actions,
.row:focus-within .row-actions {
  opacity: 1;
  visibility: visible;
}

@media (hover: hover) and (min-width: 721px) {
  .row:hover .row-points,
  .row:focus-within .row-points {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row-actions,
  .row-points {
    transition: none;
  }
}

.act {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.act:hover {
  background: var(--inset-fill);
  color: var(--ink);
}

.act-remove:hover {
  color: var(--bad);
}

/* The selected subject and its route. */
.row-tone-self {
  border-color: var(--overprint);
  box-shadow: 0 0 0 2px var(--overprint);
}

.row-tone-need {
  border-color: #7a63f0;
  box-shadow: 0 0 0 1.5px #7a63f0;
}

.row-tone-unlock {
  border-color: var(--overprint);
  box-shadow: 0 0 0 1.5px var(--overprint);
}

.row-tone-rule {
  border-color: var(--good);
  background: color-mix(in srgb, var(--good-soft) 60%, var(--paper-raised));
}

.row-dimmed {
  opacity: 0.45;
}

.sheet {
  width: min(360px, calc(100% - 24px));
  max-height: min(80vh, 560px);
  max-height: min(80dvh, 560px);
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  /* As solid as the heavy-semester sheet: the board must not show through (Glass included). */
  background: var(--glass-shine), color-mix(in srgb, var(--sheet-fill) 40%, var(--bg));
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  backdrop-filter: blur(24px) saturate(1.4);
  color: var(--ink);
  box-shadow: var(--shadow-2);
  cursor: default;
}

.sheet[open] {
  display: grid;
  gap: 4px;
}

.sheet::backdrop {
  background: rgb(16 16 20 / 40%);
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.sheet-x {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -12px -10px -6px 0;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.sheet-title {
  margin: 0 0 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.sheet-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 6px;
  margin-bottom: 6px;
}

.sheet-act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--glass-shine), var(--sheet-fill);
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.sheet-remove {
  color: var(--bad);
}

.sheet-label {
  margin: 4px 0 0;
  padding: 0 4px;
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.sheet-term {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 4px 8px;
  border: 0;
  border-radius: 9px;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.sheet-term:hover {
  background: var(--inset-fill);
}

.sheet-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--good);
}

.sheet-why {
  font-size: 0.75rem;
  color: var(--good);
  text-align: right;
}

.sheet-term-off,
.sheet-term-off .sheet-why {
  color: var(--ink-faint);
}

.sheet-term-off .sheet-dot {
  background: var(--ink-faint);
}

/* Phones: no hover actions (the sheet has them); the sheet sits along the bottom. */
@media (hover: none), (max-width: 720px) {
  .row:hover .row-actions,
  .row:focus-within .row-actions {
    display: none;
  }

  .row-title {
    font-size: 0.875rem;
  }
}

@media (max-width: 720px) {
  .sheet {
    width: calc(100% - 24px);
    margin: auto auto calc(12px + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .row {
    transition: none;
  }
}
</style>
