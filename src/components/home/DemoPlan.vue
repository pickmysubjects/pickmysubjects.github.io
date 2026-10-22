<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Check } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { categoryTag } from '@/i18n/format'
import { localTitle } from '@/i18n/localized'
import type { HomeDemo } from '@/utils/homeDemo'

/**
 * A real generated plan as a small product preview: the planner's progress header, then one
 * column per year with its first few subject cards (code, title, a colour for what the subject
 * counts as) and how many more follow. Opens the planner.
 */
const props = defineProps<{ plan: HomeDemo['plan']; caption?: string; hideRules?: boolean }>()
const { t, locale } = useI18n()

type Kind = 'major' | 'core' | 'breadth' | 'elective'
const SHOWN = 3

function kindOf(code: string): Kind {
  const c = props.plan.cards[code]
  if (c?.major) return 'major'
  if (c?.category === 'core') return 'core'
  if (c?.category === 'breadth') return 'breadth'
  return 'elective'
}

const years = computed(() => {
  const first = props.plan.terms[0]?.year ?? 0
  const out: { n: number; codes: string[] }[] = []
  for (const term of props.plan.terms) {
    const n = term.year - first + 1
    const row = out.find((y) => y.n === n)
    if (row) row.codes.push(...term.subjects)
    else out.push({ n, codes: [...term.subjects] })
  }
  return out.map((y) => ({
    n: y.n,
    more: Math.max(0, y.codes.length - SHOWN),
    cards: y.codes.slice(0, SHOWN).map((code) => {
      const c = props.plan.cards[code]
      return { code, kind: kindOf(code), title: (c && localTitle({ titles: c.titles }, locale.value)) || c?.title || code }
    }),
  }))
})

// Only the kinds the plan actually has, in a fixed order.
const legend = computed(() => {
  const present = new Set(props.plan.terms.flatMap((x) => x.subjects.map(kindOf)))
  const label: Record<Kind, string> = {
    major: t.value('progress.major'),
    core: categoryTag(t.value, 'core'),
    breadth: categoryTag(t.value, 'breadth'),
    elective: categoryTag(t.value, 'science'),
  }
  return (['major', 'core', 'elective', 'breadth'] as const).filter((k) => present.has(k)).map((k) => ({ kind: k, label: label[k] }))
})
const allMet = computed(() => props.plan.met === props.plan.total)
</script>

<template>
  <a class="demo surface" :href="link('plan')">
    <span v-if="caption" class="caption">{{ caption }}</span>
    <span class="head">
      <span class="ring" :class="{ 'ring-ok': allMet }" aria-hidden="true"><Check :size="20" :stroke-width="3" /></span>
      <span class="head-text">
        <span class="head-title">{{ allMet ? t('progress.allMet') : t('progress.left', { n: plan.total - plan.met }) }}</span>
        <span class="head-sub">{{ plan.courseTitle }} · {{ plan.majorTitle }}</span>
      </span>
    </span>

    <span class="years">
      <span v-for="y in years" :key="y.n" class="year">
        <span class="year-label">{{ t('home.year', { n: y.n }) }}</span>
        <span v-for="c in y.cards" :key="c.code" class="card" :class="`k-${c.kind}`">
          <span class="card-code">{{ c.code }}</span>
          <span class="card-title">{{ c.title }}</span>
        </span>
        <span v-if="y.more" class="more">{{ t('home.moreSubjects', { n: y.more }) }}</span>
      </span>
    </span>

    <span class="foot">
      <span class="legend">
        <span v-for="l in legend" :key="l.kind" class="legend-item"><span class="dot" :class="`k-${l.kind}`" aria-hidden="true" />{{ l.label }}</span>
      </span>
      <span v-if="!hideRules" class="rules">{{ t('rules.progress', { met: plan.met, total: plan.total }) }}</span>
      <span class="go">{{ t('home.cardPlan') }} <ArrowRight :size="16" aria-hidden="true" /></span>
    </span>
  </a>
</template>

<style scoped>
.demo {
  /* One colour per kind of subject, as a bar on the card's left edge. */
  --k-major: var(--accent);
  --k-core: #6d5dfc;
  --k-elective: #0e8fc7;
  --k-breadth: #d9822b;

  display: grid;
  align-content: start;
  gap: 20px;
  height: 100%;
  padding: 24px;
  color: var(--ink);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

@media (prefers-color-scheme: dark) {
  .demo {
    --k-core: #a99bff;
    --k-elective: #5cc4f0;
    --k-breadth: #f0b06a;
  }
}

.demo:hover {
  box-shadow: var(--shadow-2);
}

.caption {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.head {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* The planner's ring, full: every rule met. */
.ring {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
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
  gap: 2px;
  min-width: 0;
}

.head-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--good);
}

.head-sub {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.years {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.year {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}

.year-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ink-soft);
}

/* A planner card in miniature: code, then the title on up to two lines. */
.card {
  display: grid;
  gap: 1px;
  min-width: 0;
  padding: 8px 10px 8px 12px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--k);
  border-radius: 10px;
  background: var(--surface);
}

.card-code {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--k);
  font-variant-numeric: tabular-nums;
}

.card-title {
  display: -webkit-box;
  overflow: hidden;
  min-height: 2.7em;
  font-size: 0.8125rem;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.more {
  padding-left: 12px;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.k-major {
  --k: var(--k-major);
}

.k-core {
  --k: var(--k-core);
}

.k-elective {
  --k: var(--k-elective);
}

.k-breadth {
  --k: var(--k-breadth);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--k);
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

/* Phones: the years scroll sideways inside the card, one and a bit in view. */
@media (max-width: 560px) {
  .demo {
    gap: 16px;
    padding: 18px 16px;
  }

  .years {
    grid-template-columns: none;
    grid-auto-columns: 72%;
    grid-auto-flow: column;
    margin-right: -16px;
    padding-right: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .year {
    scroll-snap-align: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo {
    transition: none;
  }
}
</style>
