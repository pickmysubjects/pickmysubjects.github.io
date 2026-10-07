<script setup lang="ts">
import { computed } from 'vue'
import type { RuleStatus } from '@/engine'

const props = defineProps<{ statuses: RuleStatus[]; title: string }>()

const glyph = { ok: '✓', fail: '✕', unknown: '?' } as const
const label = { ok: 'Met', fail: 'Not met', unknown: "Can't tell yet" } as const

const met = computed(() => props.statuses.filter((s) => s.status === 'ok'))
const open = computed(() => props.statuses.filter((s) => s.status !== 'ok'))
const percent = computed(() => (props.statuses.length ? (met.value.length / props.statuses.length) * 100 : 0))
const summary = computed(() => {
  if (props.statuses.length === 0) return 'No rules curated for this course yet.'
  if (open.value.length === 0) return 'Every course rule is met.'
  return `${met.value.length} of ${props.statuses.length} course rules met`
})
</script>

<template>
  <section class="legend" aria-labelledby="legend-title">
    <h2 id="legend-title" class="legend-title">{{ title }}</h2>
    <p class="legend-summary">{{ summary }}</p>
    <span class="legend-bar" aria-hidden="true"><span class="legend-fill" :style="{ width: `${percent}%` }" /></span>

    <ul v-if="open.length" class="rules">
      <li v-for="s in open" :key="s.ruleId" class="rule" :class="`rule-${s.status}`">
        <span class="rule-glyph" :title="label[s.status]" aria-hidden="true">{{ glyph[s.status] }}</span>
        <span class="visually-hidden">{{ label[s.status] }}:</span>
        <span class="rule-text">
          {{ s.description }}
          <span class="rule-detail">{{ s.detail }}</span>
        </span>
      </li>
    </ul>
    <details v-if="met.length" class="met">
      <summary>{{ met.length }} rule{{ met.length === 1 ? '' : 's' }} met</summary>
      <ul class="rules">
        <li v-for="s in met" :key="s.ruleId" class="rule rule-ok">
          <span class="rule-glyph" aria-hidden="true">{{ glyph.ok }}</span>
          <span class="rule-text">
            {{ s.description }}
            <span class="rule-detail">{{ s.detail }}</span>
          </span>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
.legend {
  display: grid;
  gap: 10px;
}

.legend-title {
  font-size: 1rem;
  font-weight: 800;
}

.legend-summary {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.legend-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--paper);
  overflow: hidden;
}

.legend-fill {
  display: block;
  height: 100%;
  background: var(--forest);
  transition: width 0.3s;
}

.rules {
  display: grid;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 8px;
  font-size: 0.86rem;
}

.rule-glyph {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 800;
}

.rule-ok .rule-glyph {
  background: var(--forest-tint);
  color: var(--forest);
}

.rule-fail .rule-glyph {
  background: var(--stop-tint);
  color: var(--stop);
}

.rule-unknown .rule-glyph {
  background: var(--open-tint);
  color: var(--open);
}

.rule-detail {
  display: block;
  font-family: var(--font-code);
  font-size: 0.74rem;
  color: var(--ink-soft);
}

.met {
  font-size: 0.86rem;
}

.met summary {
  cursor: pointer;
  color: var(--ink-soft);
  font-weight: 600;
}

.met .rules {
  margin-top: 10px;
}
</style>
