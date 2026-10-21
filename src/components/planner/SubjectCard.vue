<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { ArrowRightLeft, BookOpen, CalendarRange, Info, Route, X } from 'lucide-vue-next'
import type { Issue, Subject } from '@/engine'
import { categoryLabel, issueText as issueTextFor } from '@/i18n/format'
import { useI18n } from '@/i18n'
import { handbookUrl } from '@/utils/links'
import { localTitle } from '@/i18n/localized'
import type { DropVerdict } from '@/utils/planBoard'

export type CardTone = 'self' | 'need' | 'unlock' | 'rule'
export interface MoveTarget {
  index: number
  label: string
  verdict: DropVerdict
}

/**
 * A planned subject as one compact line, so a whole degree fits on one screen. On a desktop its
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
  /** How it relates to the selected subject or rule; null when nothing is selected. */
  tone: CardTone | null
  /** Selected (not just hovered): a second tap opens the details. */
  selected: boolean
  dimmed: boolean
  /** The action sheet is open on this subject, with every term and whether it can go there. */
  moveOpen: boolean
  moveTargets: MoveTarget[]
}>()
const emit = defineEmits<{
  select: []
  open: []
  hover: [on: boolean]
  moveSheet: [open: boolean]
  swap: []
  moveTo: [index: number]
  remove: []
  dragStart: []
  dragEnd: []
}>()

const { t, locale } = useI18n()
// The title in the reader's language where we have one, with the English after it, small.
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))

// Touch screens have no hover: a tap opens the sheet with every action instead.
const touch = () => typeof window !== 'undefined' && window.matchMedia('(hover: none), (max-width: 720px)').matches

// A tap selects the subject (its timeline lights up across the plan); a second tap opens the details.
function onCardClick(event: MouseEvent): void {
  if ((event.target as Element).closest('.row-actions, .sheet')) return
  if (touch()) emit('moveSheet', true)
  else if (props.selected) emit('open')
  else emit('select')
}

// Info-level notes (e.g. "assumes the timetable repeats") stay in the Checks panel;
// rows only carry a flag when something needs the student's attention.
const worst = computed(() => {
  if (props.issues.some((i) => i.severity === 'error')) return 'error'
  if (props.issues.some((i) => i.severity === 'warning')) return 'warning'
  return null
})
const category = computed(() => categoryLabel(t.value, props.subject?.categories[props.course]))
const issueText = computed(() =>
  props.issues
    .filter((i) => i.severity !== 'info')
    .map((i) => issueTextFor(t.value, i, [], []))
    .join('\n'),
)
// The full facts in the tooltip; the line itself keeps one or two tags.
const tooltip = computed(() => [`${props.code} ${props.subject?.title ?? ''}`, category.value, props.onlyIn, issueText.value].filter(Boolean).join('\n'))
const rowClasses = computed(() => ({
  row: true,
  [`row-${worst.value}`]: worst.value !== null,
  [`row-tone-${props.tone}`]: props.tone !== null,
  'row-dimmed': props.dimmed,
  'row-unknown': !props.subject,
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
  return v.ok ? t.value('plan.why.ok') : t.value(`plan.why.${v.reason}`)
}

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', JSON.stringify({ code: props.code, from: props.termIndex }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  emit('dragStart')
}
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
    @click="onCardClick"
  >
    <span class="control" aria-hidden="true" />
    <button class="row-main" type="button" :aria-pressed="selected" :aria-label="t('plan.selectCard', { code })">
      <span class="code row-code">{{ code }}</span>
    </button>
    <span class="row-title">
      {{ local || subject?.title || t('plan.notInDataset') }}
      <span v-if="local" class="row-title-en">{{ subject?.title }}</span>
    </span>
    <span class="row-tags">
      <span v-if="worst" class="flag" :class="`flag-${worst}`">{{ worst === 'error' ? t('plan.problem') : t('plan.check') }}</span>
      <span v-else-if="role === 'required'" class="tag tag-required">{{ t('plan.tagRequired') }}</span>
      <span v-else-if="role === 'option'" class="tag tag-option">{{ t('plan.tagOption') }}</span>
      <span v-if="onlyIn && !worst" class="tag tag-only">{{ onlyIn }}</span>
    </span>
    <span v-if="subject" class="row-points">{{ subject.points }}</span>

    <!-- Desktop: the actions on hover or focus, one click each. -->
    <span class="row-actions">
      <button class="act" type="button" :aria-label="t('plan.swapCode', { code })" :title="t('plan.swapCode', { code })" @click="emit('swap')">
        <ArrowRightLeft :size="14" aria-hidden="true" />
      </button>
      <button class="act" type="button" :aria-label="t('plan.moveCode', { code })" :title="t('plan.moveCode', { code })" @click="emit('moveSheet', true)">
        <CalendarRange :size="14" aria-hidden="true" />
      </button>
      <a class="act" :href="handbookUrl(code)" target="_blank" rel="noopener" :aria-label="t('plan.handbookCode', { code })" :title="t('plan.handbookCode', { code })">
        <BookOpen :size="14" aria-hidden="true" />
      </a>
      <button class="act act-remove" type="button" :aria-label="t('plan.remove', { code })" :title="t('plan.remove', { code })" @click="emit('remove')">
        <X :size="14" aria-hidden="true" />
      </button>
    </span>

    <dialog v-if="moveOpen" ref="sheet" class="sheet" :aria-label="code" @close="emit('moveSheet', false)" @click="onSheetClick">
      <p class="sheet-title"><span class="code">{{ code }}</span> {{ subject?.title }}</p>
      <div class="sheet-actions">
        <button class="sheet-act" type="button" @click="fromSheet(() => emit('select'))"><Route :size="16" aria-hidden="true" />{{ t('plan.tlShow') }}</button>
        <button class="sheet-act" type="button" @click="fromSheet(() => emit('swap'))"><ArrowRightLeft :size="16" aria-hidden="true" />{{ t('plan.swap') }}</button>
        <a class="sheet-act" :href="handbookUrl(code)" target="_blank" rel="noopener"><BookOpen :size="16" aria-hidden="true" />Handbook</a>
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
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'dot code pts'
    'title title title'
    'tags tags tags';
  align-items: center;
  gap: 2px 6px;
  min-width: 0;
  padding: 6px 8px 6px 9px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper-raised);
  cursor: grab;
  transition: opacity 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.row:hover {
  box-shadow: var(--shadow-1);
}

.row:active {
  cursor: grabbing;
}

/* An orienteering control: an open magenta circle, filled in when it's the selected subject. */
.control {
  grid-area: dot;
  width: 10px;
  height: 10px;
  border: 2px solid var(--overprint);
  border-radius: 50%;
}

.row-main {
  grid-area: code;
  overflow: hidden;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row-code {
  font-size: 0.875rem;
  white-space: nowrap;
  font-weight: 650;
}

.row-title {
  grid-area: title;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
  color: var(--ink);
}

.row-title-en {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.row-tags:empty {
  display: none;
}

.row-tags {
  grid-area: tags;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag,
.flag {
  padding: 0 7px;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 20px;
  white-space: nowrap;
}

.tag-required {
  font-weight: 650;
  color: var(--accent-ink);
  background: var(--accent);
}

.tag-option {
  color: var(--accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
}

.tag-only {
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.flag {
  font-weight: 650;
  background: var(--open-tint);
  color: var(--open);
}

.flag-error {
  background: var(--stop-tint);
  color: var(--stop);
}

.row-error {
  border-color: var(--stop);
}

.row-unknown {
  border-style: dashed;
}

.row-points {
  grid-area: pts;
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-faint);
}

/* The actions sit over the tags and points, on hover or keyboard focus only. */
.row-actions {
  position: absolute;
  top: 3px;
  right: 4px;
  height: 24px;
  display: flex;
  gap: 2px;
  padding-left: 18px;
  border-radius: 8px;
  background: linear-gradient(90deg, transparent, var(--paper-raised) 16px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}

.row:hover .row-actions,
.row:focus-within .row-actions {
  opacity: 1;
  pointer-events: auto;
}

.act {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.act:hover {
  background: var(--surface-2);
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

.row-tone-self .control {
  background: var(--overprint);
}

.row-tone-need,
.row-tone-unlock {
  border-color: var(--overprint);
  background: color-mix(in srgb, var(--overprint-tint) 55%, var(--paper-raised));
}

.row-tone-rule {
  border-color: var(--good);
  background: color-mix(in srgb, var(--good-soft) 60%, var(--paper-raised));
}

.row-dimmed {
  opacity: 0.38;
}

.sheet {
  width: min(360px, calc(100vw - 24px));
  max-height: min(80vh, 560px);
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-2);
  cursor: default;
}

.sheet[open] {
  display: grid;
  gap: 4px;
}

.sheet::backdrop {
  background: rgb(16 16 20 / 30%);
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
  background: var(--surface);
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
  background: var(--surface-2);
}

.sheet-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--good);
}

.sheet-why {
  font-size: 0.6875rem;
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
  .row-actions {
    display: none;
  }

  .row {
    min-height: 44px;
  }

  .row-title {
    font-size: 0.9375rem;
  }
}

@media (max-width: 720px) {
  .sheet {
    width: calc(100vw - 24px);
    margin: auto auto 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row,
  .row-actions {
    transition: none;
  }
}
</style>
