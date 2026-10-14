<script setup lang="ts">
import type { PlanTerm, Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import type { PastResult } from '@/utils/pastTerms'
import { computed } from 'vue'
import DoneCard from './DoneCard.vue'

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
  /** A semester's usual load, shown as in planned columns. */
  load?: number
  /** Subjects linked to the hovered one, to highlight (others dim). */
  related?: Set<string> | null
}>()
const emit = defineEmits<{ open: [code: string]; hover: [code: string | null] }>()
const { t } = useI18n()

// Enrolled points, a fail included.
const points = computed(() => props.results.reduce((sum, r) => sum + (props.subjects[r.code]?.points ?? 12.5), 0))

function retake(code: string): string | null {
  const at = props.planned.find((p) => p.subjects.includes(code))
  return at ? termLabel(t.value, at) : null
}
</script>

<template>
  <!-- A semester from My record: the same column as a planned one, its subjects as done cards. -->
  <section class="past" :aria-label="term ? termLabel(t, term) : t('plan.pastUndated')">
    <header class="past-head">
      <h3 class="past-name">{{ term ? termLabel(t, term) : t('plan.pastUndated') }}</h3>
      <span class="past-points">{{ points }}<template v-if="load && term"> / {{ load }}</template></span>
      <span class="past-bar" aria-hidden="true" />
    </header>
    <DoneCard
      v-for="r in results"
      :key="r.code"
      :result="r"
      :subject="subjects[r.code]"
      :note="r.failed ? (retake(r.code) ? t('plan.pastRetake', { term: retake(r.code) as string }) : undefined) : undefined"
      :highlighted="related?.has(r.code) ?? false"
      :dimmed="!!related && !related.has(r.code)"
      @open="emit('open', r.code)"
      @hover="emit('hover', $event ? r.code : null)"
    />
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
}

.past-head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 4px 8px;
}

.past-name {
  font-size: 0.9375rem;
  font-weight: 700;
}

.past-points {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.past-bar {
  grid-column: 1 / -1;
  height: 3px;
  border-radius: 2px;
  background: var(--good);
}
</style>
