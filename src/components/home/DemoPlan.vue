<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Check } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import type { HomeDemo } from '@/utils/homeDemo'

/**
 * A real generated plan in miniature: each semester's subject codes, grouped by year, and the
 * planner's progress ring showing every course rule met. Opens the planner.
 */
const props = defineProps<{ plan: HomeDemo['plan'] }>()
const { t } = useI18n()

const years = computed(() => {
  const first = props.plan.terms[0]?.year ?? 0
  const out: { n: number; terms: HomeDemo['plan']['terms'] }[] = []
  for (const term of props.plan.terms) {
    const n = term.year - first + 1
    const row = out.find((y) => y.n === n)
    if (row) row.terms.push(term)
    else out.push({ n, terms: [term] })
  }
  return out
})
const allMet = computed(() => props.plan.met === props.plan.total)
</script>

<template>
  <a class="demo surface" :href="link('plan')">
    <span class="head">
      <span class="ring" :class="{ 'ring-ok': allMet }" aria-hidden="true"><Check :size="18" :stroke-width="3" /></span>
      <span class="head-text">
        <span class="head-title">{{ allMet ? t('progress.allMet') : t('progress.left', { n: plan.total - plan.met }) }}</span>
        <span class="head-sub">{{ plan.courseTitle }} · {{ plan.majorTitle }}</span>
      </span>
    </span>

    <span class="years">
      <span v-for="y in years" :key="y.n" class="year">
        <span class="year-label">{{ t('home.year', { n: y.n }) }}</span>
        <span class="terms">
          <span v-for="term in y.terms" :key="term.period" class="term">
            <span class="term-label">{{ t(`periodShort.${term.period}`) }}</span>
            <span v-for="c in term.subjects" :key="c" class="cell code">{{ c }}</span>
          </span>
        </span>
      </span>
    </span>

    <span class="foot">
      <span class="rules">{{ t('rules.progress', { met: plan.met, total: plan.total }) }}</span>
      <span class="go">{{ t('home.cardPlan') }} <ArrowRight :size="16" aria-hidden="true" /></span>
    </span>
  </a>
</template>

<style scoped>
.demo {
  display: grid;
  align-content: start;
  gap: 14px;
  height: 100%;
  padding: 20px 22px;
  color: var(--ink);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

.demo:hover {
  box-shadow: var(--shadow-2);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* The planner's ring, full: every rule met. */
.ring {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 4px solid var(--warn);
  border-radius: 50%;
  color: var(--warn);
}

.ring-ok {
  border-color: var(--good);
  color: var(--good);
}

.head-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.head-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--good);
}

.head-sub {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.years {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.year {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
}

.year-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.terms {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.term {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
}

.term-label {
  font-size: 0.6875rem;
  color: var(--ink-faint);
}

.cell {
  padding: 4px 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.6875rem;
  text-align: center;
  color: var(--ink);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
}

.rules {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}

/* Phones: one year per row, its two semesters side by side, each semester's codes two by two. */
@media (max-width: 560px) {
  .years {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .terms {
    gap: 10px;
  }

  .term {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .term-label {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo {
    transition: none;
  }
}
</style>
