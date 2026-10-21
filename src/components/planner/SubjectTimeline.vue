<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, X } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import type { Edge } from '@/utils/planBoard'

/**
 * A subject's place in the plan as a chain: what it needs (and when those are taken) → the
 * subject → what it unlocks. Only links inside the plan or My record; the full lists are in the
 * subject window's sections.
 */
const props = defineProps<{
  code: string
  edges: readonly Edge[]
  /** Where each subject sits: "2027 S1", or "Done". */
  whereOf: Record<string, string>
  /** The strip above the board: with Details and close buttons. */
  bar?: boolean
}>()
const emit = defineEmits<{ select: [code: string]; open: [code: string]; clear: [] }>()
const { t } = useI18n()

const needs = computed(() => [...new Set(props.edges.filter((e) => e.to === props.code && e.from !== props.code).map((e) => e.from))])
const unlocks = computed(() => [...new Set(props.edges.filter((e) => e.from === props.code && e.to !== props.code).map((e) => e.to))])
</script>

<template>
  <div class="chain" :class="{ 'chain-bar': bar }" role="group" :aria-label="t('plan.tlTitle', { code })">
    <div class="chain-grid">
    <div class="side">
      <span class="label">{{ t('plan.tlNeeds') }}</span>
      <span class="chips">
        <button v-for="c in needs" :key="c" class="chip-link" type="button" @click="emit('select', c)">
          <span class="code">{{ c }}</span><span class="when">{{ whereOf[c] }}</span>
        </button>
        <span v-if="!needs.length" class="none">{{ t('plan.tlNone') }}</span>
      </span>
    </div>
    <ArrowRight :size="18" aria-hidden="true" class="arrow" />
    <div class="self">
      <span class="code">{{ code }}</span><span class="when">{{ whereOf[code] }}</span>
    </div>
    <ArrowRight :size="18" aria-hidden="true" class="arrow" />
    <div class="side">
      <span class="label">{{ t('plan.tlUnlocks') }}</span>
      <span class="chips">
        <button v-for="c in unlocks" :key="c" class="chip-link" type="button" @click="emit('select', c)">
          <span class="code">{{ c }}</span><span class="when">{{ whereOf[c] }}</span>
        </button>
        <span v-if="!unlocks.length" class="none">{{ t('plan.tlNoUnlocks') }}</span>
      </span>
    </div>
    <div v-if="bar" class="bar-actions">
      <button class="button button-quiet bar-btn" type="button" @click="emit('open', code)">{{ t('plan.detailsShort') }}</button>
      <button class="bar-close" type="button" :aria-label="t('plan.tlClear')" :title="t('plan.tlClear')" @click="emit('clear')">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
    </div>
  </div>
</template>

<style scoped>
.chain {
  container-type: inline-size;
}

.chain-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto minmax(0, 1fr);
  align-items: center;
  gap: 10px 12px;
  padding: 12px 14px;
}

.chain {
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--overprint-tint) 60%, var(--surface));
}

.chain-bar {
  border: 1px solid color-mix(in srgb, var(--overprint) 35%, transparent);
}

.chain-bar .chain-grid {
  grid-template-columns: minmax(0, 1fr) auto auto auto minmax(0, 1fr) auto;
}

.side {
  display: grid;
  gap: 6px;
  min-width: 0;
}

/* The needs read right to left into the subject. */
.side:first-child {
  justify-items: end;
  text-align: right;
}

.side:first-child .chips {
  justify-content: flex-end;
}

.label {
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-link,
.self {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.chip-link {
  border: 1px solid color-mix(in srgb, var(--overprint) 50%, transparent);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.chip-link:hover,
.chip-link:focus-visible {
  border-color: var(--overprint);
}

.self {
  padding: 6px 14px;
  background: var(--overprint);
  color: var(--accent-ink);
  font-weight: 700;
}

.code {
  font-weight: 650;
}

.when {
  font-size: 0.75rem;
  opacity: 0.75;
}

.none {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.arrow {
  color: var(--overprint);
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bar-btn {
  min-height: 34px;
  padding: 0 14px;
  font-size: 0.8125rem;
}

.bar-close {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

/* Narrow (a phone, or the subject window): top to bottom, the arrows turned down. */
@container (max-width: 620px) {
  .chain-grid,
  .chain-bar .chain-grid {
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
  }

  .side:first-child {
    justify-items: start;
    text-align: left;
  }

  .side:first-child .chips {
    justify-content: flex-start;
  }

  .arrow {
    margin-left: 12px;
    transform: rotate(90deg);
  }
}
</style>
