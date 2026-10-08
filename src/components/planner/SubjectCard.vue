<script setup lang="ts">
import { computed } from 'vue'
import type { Issue, Subject } from '@/engine'
import { categoryLabel, issueText as issueTextFor } from '@/i18n/format'
import { useI18n } from '@/i18n'

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
  highlighted: boolean
  dimmed: boolean
}>()
const emit = defineEmits<{ remove: []; moveBy: [delta: number]; hover: [on: boolean]; open: [] }>()

// A click anywhere on the card (but not its move/remove buttons) opens the details.
function onCardClick(event: MouseEvent): void {
  if ((event.target as Element).closest('.card-tools')) return
  emit('open')
}

// Info-level notes (e.g. "assumes the timetable repeats") stay in the Checks panel;
// cards only carry a flag when something needs the student's attention.
const worst = computed(() => {
  if (props.issues.some((i) => i.severity === 'error')) return 'error'
  if (props.issues.some((i) => i.severity === 'warning')) return 'warning'
  return null
})
const { t } = useI18n()
const category = computed(() => categoryLabel(t.value, props.subject?.categories[props.course]))
// Short hover text; the full localised messages are listed in the Checks panel.
const issueText = computed(() =>
  props.issues
    .filter((i) => i.severity !== 'info')
    .map((i) => issueTextFor(t.value, i, [], []))
    .join('\n'),
)
const cardClasses = computed(() => ({
  card: true,
  [`card-${worst.value}`]: worst.value !== null,
  'card-highlighted': props.highlighted,
  'card-dimmed': props.dimmed,
  'card-unknown': !props.subject,
}))

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', JSON.stringify({ code: props.code, from: props.termIndex }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <article
    :class="cardClasses"
    :data-code="code"
    draggable="true"
    @dragstart="onDragStart"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
    @focusin="emit('hover', true)"
    @focusout="emit('hover', false)"
    @click="onCardClick"
  >
    <header class="card-top">
      <span class="control" aria-hidden="true" />
      <span class="code card-code">{{ code }}</span>
      <span v-if="subject" class="card-points">{{ subject.points }}</span>
    </header>
    <button class="card-title" type="button" :aria-label="t('plan.openDetails', { code })" @click.stop="emit('open')">
      {{ subject?.title ?? t('plan.notInDataset') }}
    </button>
    <footer class="card-foot">
      <span v-if="role === 'required'" class="tag tag-required">{{ t('plan.tagRequired') }}</span>
      <span v-else-if="role === 'option'" class="tag tag-option">{{ t('plan.tagOption') }}</span>
      <span v-if="subject" class="tag">L{{ subject.level }}</span>
      <span v-if="category" class="tag">{{ category }}</span>
      <span v-if="onlyIn" class="tag tag-only">{{ onlyIn }}</span>
      <span v-if="worst" class="flag" :title="issueText">
        {{ worst === 'error' ? t('plan.problem') : t('plan.check') }}
        <span class="visually-hidden">: {{ issueText }}</span>
      </span>
    </footer>
    <span class="card-tools">
      <button class="tool" type="button" :aria-label="t('plan.moveEarlier', { code })" @click="emit('moveBy', -1)">←</button>
      <button class="tool" type="button" :aria-label="t('plan.moveLater', { code })" @click="emit('moveBy', 1)">→</button>
        <button class="tool" type="button" :aria-label="t('plan.remove', { code })" @click="emit('remove')">×</button>
    </span>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  padding: 10px 11px 9px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: var(--paper-raised);
  box-shadow: var(--shadow-1);
  cursor: grab;
  transition: opacity 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.card:hover {
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}

.card:active {
  cursor: grabbing;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* An orienteering control: an open magenta circle. */
.control {
  width: 12px;
  height: 12px;
  flex: none;
  border: 2px solid var(--overprint);
  border-radius: 50%;
}

.card-code {
  font-weight: 600;
  font-size: 0.86rem;
}

.card-points {
  margin-left: auto;
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.card-title {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 20px;
}

.tag {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--paper);
  font-size: 0.7rem;
  color: var(--ink-soft);
}

.tag-required {
  font-weight: 650;
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.tag-option {
  color: var(--accent);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
}

.tag-only {
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.flag {
  padding: 0 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.card-error {
  border-color: var(--stop);
}

.card-error .tag-only {
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.flag {
  background: var(--stop-tint);
  color: var(--stop);
}

.card-warning .tag-only {
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.flag {
  background: var(--open-tint);
  color: var(--open);
}

.card-unknown {
  border: 1px dashed var(--contour);
  box-shadow: none;
}

.card-tools {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  border-radius: var(--radius);
  background: var(--paper-raised);
  box-shadow: 0 0 0 1px var(--contour);
  opacity: 0;
  transition: opacity 0.15s;
}

.card:hover .card-tools,
.card:focus-within .card-tools {
  opacity: 1;
}

.tool {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}

.tool:hover {
  background: var(--paper);
  color: var(--ink);
}

.card-highlighted {
  border-color: var(--overprint);
  box-shadow: 0 0 0 1px var(--overprint);
}

.card-dimmed {
  opacity: 0.45;
}

@media (hover: none) {
  .card-tools {
    opacity: 1;
  }
}
</style>
