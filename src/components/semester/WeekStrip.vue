<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { SemesterShape, WeekSegment } from '@/utils/semester'

/**
 * The semester as a row of weeks: teaching weeks by number, the break, SWOT Vac and the exam
 * period (as wide as its weeks). Weeks gone by are filled softly, this week in the accent.
 * `slim`: a thin bar without labels, for the home preview.
 */
const props = defineProps<{ sem: SemesterShape; today: string; name: string; slim?: boolean }>()
const { t } = useI18n()

const label = (s: WeekSegment) => (s.kind === 'teach' ? String(s.week) : t.value(s.kind === 'break' ? 'sem.segBreak' : s.kind === 'swotvac' ? 'sem.segSwot' : 'sem.segExams'))
const state = (s: WeekSegment) => (props.today > s.end ? 'past' : props.today >= s.start ? 'now' : 'next')
const cells = computed(() => props.sem.segments.map((s) => ({ ...s, label: label(s), state: state(s) })))
</script>

<template>
  <ol class="strip" :class="{ slim }" :aria-label="t('sem.stripLabel', { term: name })">
    <li
      v-for="(c, i) in cells"
      :key="i"
      class="cell"
      :class="[`is-${c.state}`, `k-${c.kind}`]"
      :style="{ flexGrow: c.span }"
      :aria-current="c.state === 'now' ? 'step' : undefined"
    >
      <span v-if="!slim" class="cell-label">{{ c.label }}</span>
      <span v-else class="sr-only">{{ c.label }}</span>
    </li>
  </ol>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: max-content;
}

.cell {
  display: flex;
  flex: 1 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 40px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
  white-space: nowrap;
}

.cell.k-break,
.cell.k-swotvac,
.cell.k-exams {
  border-style: dashed;
}

.cell.is-past {
  border-color: transparent;
  background: var(--accent-soft);
  color: var(--accent);
}

.cell.is-now {
  border-color: var(--accent-fill);
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
}

/* Home: a thin bar, no words. */
.strip.slim {
  gap: 3px;
  min-width: 0;
}

.slim .cell {
  min-width: 0;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--line);
}

.slim .cell.is-past {
  background: color-mix(in srgb, var(--accent-fill) 45%, transparent);
}

.slim .cell.is-now {
  background: var(--accent-fill);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
