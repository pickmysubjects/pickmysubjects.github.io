<script setup lang="ts">
import { computed } from 'vue'
import type { CourseRule, Issue, RuleStatus } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { issueText } from '@/i18n/format'

const props = defineProps<{ issues: Issue[]; rules: CourseRule[]; statuses: RuleStatus[] }>()
const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()

const rows = computed(() =>
  props.issues.map((i) => ({ severity: i.severity, text: issueText(t.value, i, props.rules, props.statuses, data.value.subjects, plan.setup.value.course) })),
)
const problems = computed(() => rows.value.filter((i) => i.severity !== 'info'))
const notes = computed(() => rows.value.filter((i) => i.severity === 'info'))
</script>

<template>
  <section class="issues" aria-labelledby="issues-title">
    <h2 id="issues-title" class="issues-title">{{ t('checks.title') }}</h2>
    <p v-if="problems.length === 0" class="issues-clear">{{ t('checks.clear') }}</p>
    <ul v-else class="issue-list">
      <li v-for="(i, n) in problems" :key="n" class="issue" :class="`issue-${i.severity}`">{{ i.text }}</li>
    </ul>
    <details v-if="notes.length" class="issue-notes">
      <summary>{{ t('checks.notes', { n: notes.length }) }}</summary>
      <ul class="issue-list">
        <li v-for="(i, n) in notes" :key="n" class="issue issue-info">{{ i.text }}</li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
.issues-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.issues-clear {
  margin: 8px 0 0;
  color: var(--forest);
  font-weight: 600;
}

.issue-list {
  display: grid;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.issue {
  padding: 6px 8px 6px 10px;
  border-left: 3px solid;
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 0.875rem;
}

.issue-error {
  border-color: var(--stop);
  background: var(--stop-tint);
}

.issue-warning {
  border-color: var(--open);
  background: var(--open-tint);
}

.issue-info {
  border-color: var(--contour);
  background: var(--paper);
}

.issue-notes {
  margin-top: 10px;
  font-size: 0.875rem;
}

.issue-notes summary {
  cursor: pointer;
  color: var(--ink-soft);
}
</style>
