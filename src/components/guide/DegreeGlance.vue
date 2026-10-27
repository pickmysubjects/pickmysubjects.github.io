<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

/**
 * The degree's arithmetic in one row, so the numbers explain each other: a subject is 12.5
 * points, four make a standard 50-point semester, six semesters make the 300-point degree.
 * Then the pass mark and H1, with a jump to the grade table.
 */
const { t } = useI18n()
const STEPS = [
  { value: '12.5', key: 'guide.factPoints', times: '× 4' },
  { value: '50', key: 'guide.factLoad', times: '× 6' },
  { value: '300', key: 'guide.factDegree', times: null },
] as const
</script>

<template>
  <section class="glance surface" aria-labelledby="glance-title">
    <h2 id="glance-title" class="glance-title">{{ t('guide.structTitle') }}</h2>
    <ol class="flow">
      <template v-for="s in STEPS" :key="s.key">
        <li class="node">
          <span class="value">{{ s.value }}</span>
          <span class="label">{{ t(s.key) }}</span>
        </li>
        <li v-if="s.times" class="times" aria-hidden="true">
          <span>{{ s.times }}</span>
        </li>
      </template>
    </ol>
    <a class="grades" href="#grades">
      <span>{{ t('guide.gradesShort') }}</span>
      <span class="grades-go">{{ t('guide.gradesTitle') }}<ArrowRight :size="15" aria-hidden="true" /></span>
    </a>
  </section>
</template>

<style scoped>
.glance {
  display: grid;
  gap: 20px;
  padding: 24px 28px;
}

.glance-title {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.node {
  display: grid;
  gap: 6px;
}

.value {
  font-family: var(--font-code);
  font-size: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--accent);
}

.label {
  font-size: var(--fs-small);
  line-height: 1.45;
  color: var(--ink-soft);
}

/* The multiplier between two numbers: a small pill on a hairline. */
.times {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 36px;
}

.times::before {
  content: '';
  position: absolute;
  inset: 50% 0 auto;
  border-top: 1px dashed var(--divider);
}

.times span {
  position: relative;
  padding: 2px 10px;
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--tile-fill);
}

.grades {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  font-weight: var(--fw-medium);
  color: var(--ink);
  text-decoration: none;
  border-radius: 14px;
  background: var(--inset-fill);
}

.grades-go {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.grades:hover .grades-go {
  text-decoration: underline;
}

/* Phones: the three numbers stack, the multipliers between them. */
@media (max-width: 640px) {
  .glance {
    padding: 20px 18px;
    border-radius: 20px;
  }

  .flow {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .node {
    grid-template-columns: 4.5rem minmax(0, 1fr);
    align-items: baseline;
    gap: 12px;
  }

  .value {
    font-size: 1.625rem;
  }

  .times {
    justify-content: start;
    width: auto;
    height: 28px;
    padding-left: 1rem;
  }

  .times::before {
    inset: 0 auto 0 calc(1rem + 0px);
    border-top: 0;
    border-left: 1px dashed var(--divider);
  }

  .times span {
    margin-left: 12px;
  }
}
</style>
