<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import type { Edge } from '@/utils/planBoard'

/**
 * A subject's place in the plan in one line: what it needs (and when those are taken), the
 * subject, and what it unlocks. Only links inside the plan or My record; the full lists are in
 * the subject window.
 */
const props = defineProps<{
  code: string
  edges: readonly Edge[]
  /** Where each subject sits: "2027 S1", or "Done". */
  whereOf: Record<string, string>
  /** Show the close and details buttons (the strip above the board). */
  bar?: boolean
}>()
const emit = defineEmits<{ select: [code: string]; open: [code: string]; clear: [] }>()
const { t } = useI18n()

const needs = computed(() => [...new Set(props.edges.filter((e) => e.to === props.code).map((e) => e.from))])
const unlocks = computed(() => [...new Set(props.edges.filter((e) => e.from === props.code).map((e) => e.to))])
</script>

<template>
  <div class="timeline" :class="{ 'timeline-bar': bar }" role="status">
    <span class="tl-group">
      <span class="tl-label">{{ t('plan.tlNeeds') }}</span>
      <template v-if="needs.length">
        <button v-for="c in needs" :key="c" class="tl-chip" type="button" @click="emit('select', c)">
          <span class="code">{{ c }}</span> <span class="tl-when">{{ whereOf[c] }}</span>
        </button>
      </template>
      <span v-else class="tl-none">{{ t('plan.tlNone') }}</span>
    </span>
    <ArrowRight :size="16" aria-hidden="true" class="tl-arrow" />
    <span class="tl-self code">{{ code }} <span class="tl-when">{{ whereOf[code] }}</span></span>
    <ArrowRight :size="16" aria-hidden="true" class="tl-arrow" />
    <span class="tl-group">
      <span class="tl-label">{{ t('plan.tlUnlocks') }}</span>
      <template v-if="unlocks.length">
        <button v-for="c in unlocks" :key="c" class="tl-chip" type="button" @click="emit('select', c)">
          <span class="code">{{ c }}</span> <span class="tl-when">{{ whereOf[c] }}</span>
        </button>
      </template>
      <span v-else class="tl-none">{{ t('plan.tlNone') }}</span>
    </span>
    <span v-if="bar" class="tl-actions">
      <button class="button button-quiet tl-btn" type="button" @click="emit('open', code)">{{ t('plan.detailsShort') }}</button>
      <button class="tl-close" type="button" :aria-label="t('plan.tlClear')" :title="t('plan.tlClear')" @click="emit('clear')">
        <X :size="16" aria-hidden="true" />
      </button>
    </span>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  font-size: 0.8125rem;
}

.timeline-bar {
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--overprint) 40%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--overprint-tint) 70%, var(--surface));
}

.tl-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tl-label {
  font-weight: 650;
  color: var(--ink-soft);
}

.tl-chip {
  padding: 2px 10px;
  border: 1px solid var(--overprint);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}

.tl-self {
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--overprint);
  color: var(--accent-ink);
  font-weight: 650;
}

.tl-self .tl-when {
  color: inherit;
  opacity: 0.85;
}

.tl-when {
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.tl-none {
  color: var(--ink-faint);
}

.tl-arrow {
  flex: none;
  color: var(--overprint);
}

.tl-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.tl-btn {
  min-height: 32px;
  padding: 0 12px;
  font-size: 0.8125rem;
}

.tl-close {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}
</style>
