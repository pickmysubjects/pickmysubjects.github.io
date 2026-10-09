<script setup lang="ts">
import type { PlanTerm, Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import type { PastResult } from '@/utils/pastTerms'

/**
 * A semester already done, from the student's record: read-only, with marks. A failed subject
 * says where the plan takes it again. Nothing here is checked or balanced.
 */
const props = defineProps<{
  /** The semester, or null for subjects whose semester wasn't given. */
  term: { year: number; period: PlanTerm['period'] } | null
  results: PastResult[]
  subjects: Record<string, Subject>
  /** Planned semesters, to find a failed subject's retake. */
  planned: PlanTerm[]
}>()
const emit = defineEmits<{ open: [code: string] }>()
const { t } = useI18n()

function retake(code: string): string | null {
  const at = props.planned.find((p) => p.subjects.includes(code))
  return at ? termLabel(t.value, at) : null
}
</script>

<template>
  <section class="past" :aria-label="term ? termLabel(t, term) : t('plan.pastUndated')">
    <header class="past-head">
      <h3 class="past-name">{{ term ? termLabel(t, term) : t('plan.pastUndated') }}</h3>
      <span class="past-tag">{{ t('plan.pastTag') }}</span>
    </header>
    <!-- data-past-code, not data-code: the prerequisite lines are drawn between planned cards only. -->
    <button
      v-for="r in results"
      :key="r.code"
      type="button"
      class="past-card"
      :class="{ 'past-failed': r.failed }"
      :data-past-code="r.code"
      @click="emit('open', r.code)"
    >
      <span class="past-top">
        <span class="code past-code">{{ r.code }}</span>
        <span v-if="r.mark !== undefined" class="past-mark">{{ r.mark }}</span>
      </span>
      <span class="past-title">{{ subjects[r.code]?.title ?? t('subject.notYetAdded') }}</span>
      <span v-if="r.failed" class="past-fail">
        {{ retake(r.code) ? t('plan.pastRetake', { term: retake(r.code) as string }) : t('plan.pastNotPassed') }}
      </span>
    </button>
  </section>
</template>

<style scoped>
.past {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 185px;
  min-width: 185px;
  max-width: 300px;
  padding: 10px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.past-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--line);
}

.past-name {
  font-size: 0.9375rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.past-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-faint);
}

.past-card {
  display: grid;
  gap: 2px;
  padding: 9px 11px;
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--ink-soft);
  cursor: pointer;
}

.past-card:hover {
  border-style: solid;
  color: var(--ink);
}

.past-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.past-code {
  font-size: 0.8125rem;
  font-weight: 650;
}

.past-mark {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.past-title {
  font-size: 0.875rem;
  line-height: 1.35;
}

.past-failed {
  border-color: color-mix(in srgb, var(--bad) 45%, transparent);
}

.past-failed .past-mark,
.past-fail {
  color: var(--bad);
}

.past-fail {
  font-size: 0.75rem;
  font-weight: 600;
}

@media print {
  .past {
    display: none;
  }
}
</style>
