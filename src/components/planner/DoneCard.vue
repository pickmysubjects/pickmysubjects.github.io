<script setup lang="ts">
import { computed } from 'vue'
import type { Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import type { PastResult } from '@/utils/pastTerms'
import DoneToggle from './DoneToggle.vue'

/**
 * A subject from My record on the plan board: the same two-line card as a planned one, in green,
 * with "已修 · 82" as its one status line (red "未通过" when not passed). A start for prerequisite
 * lines (data-past-code). Tapping the status line edits the mark or takes it back to planned.
 * A graded entry with no mark isn't done: a plain card with the mark box open ("add a mark").
 */
const props = defineProps<{ result: PastResult; subject?: Subject; note?: string; highlighted?: boolean; dimmed?: boolean; future?: boolean }>()
const emit = defineEmits<{ open: []; hover: [on: boolean]; done: [mark: number | undefined]; undo: [] }>()
const { t, locale } = useI18n()
// The title in the reader's language where we have one; the English one goes to the tooltip.
const local = computed(() => (props.subject ? localTitle(props.subject, locale.value) : ''))
const tooltip = computed(() => [`${props.result.code} ${local.value || props.subject?.title || ''}`, local.value ? props.subject?.title : '', props.note].filter(Boolean).join('\n'))
</script>

<template>
  <div
    class="done"
    :class="{ failed: result.failed, pending: result.pending, highlighted, dimmed }"
    :data-past-code="result.code"
    :title="tooltip"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
  >
    <button type="button" class="done-main" @click="emit('open')" @focusin="emit('hover', true)" @focusout="emit('hover', false)">
      <span class="code">{{ result.code }}</span>
      <span v-if="subject" class="points">{{ subject.points }}</span>
      <span class="title">{{ local || subject?.title || t('subject.notYetAdded') }}</span>
    </button>
    <span v-if="result.failed" class="foot foot-failed">{{ t('plan.pastNotPassed') }}<template v-if="result.mark !== undefined"> · {{ result.mark }}</template></span>
    <span v-else-if="note" class="foot foot-failed">{{ note }}</span>
    <DoneToggle v-else class="foot" card :code="result.code" :done="!result.pending" :ask="result.pending" :mark="result.mark" :pass-fail="subject?.passFail" :future="future" @done="emit('done', $event)" @undo="emit('undo')" />
  </div>
</template>

<style scoped>
/* The same shape as a planned card (SubjectCard): two lines and one status line, a flat tint. */
.done {
  /* Above the prerequisite lines, like a planned card. */
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1px;
  min-height: 74px;
  padding: 7px 9px 7px 11px;
  border: 1px solid color-mix(in srgb, var(--good) 35%, transparent);
  border-radius: 10px;
  background: var(--good-soft);
  box-shadow: 0 1px 2px rgb(60 20 80 / 10%);
  color: var(--ink);
  transition: border-color 0.12s;
}

.done::before {
  content: '';
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 3px;
  width: 3px;
  border-radius: 2px;
  background: var(--good);
}

.done:hover {
  border-color: var(--good);
}

.done-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 1px 8px;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.done-main:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.code {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.points {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.title {
  grid-column: 1 / -1;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.foot {
  min-width: 0;
  margin-top: 3px;
  font-size: 0.75rem;
  line-height: 22px;
}

.foot-failed {
  overflow: hidden;
  font-weight: 650;
  color: var(--bad);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.highlighted {
  border-color: var(--overprint);
  box-shadow: 0 0 0 1px var(--overprint);
}

.dimmed {
  opacity: 0.45;
}

.pending {
  border-color: var(--col-edge, var(--line));
  background: var(--card-solid);
}

.pending::before {
  background: transparent;
}

.failed {
  border: 1px dashed var(--bad);
  background: var(--bad-soft);
}

.failed::before {
  background: var(--bad);
}

@media (prefers-reduced-motion: reduce) {
  .done {
    transition: none;
  }
}
</style>
