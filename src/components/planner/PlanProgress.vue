<script setup lang="ts">
import { computed } from 'vue'
import type { CourseRule, RuleStatus } from '@/engine'
import { useI18n } from '@/i18n'
import { categoryLabel } from '@/i18n/format'

/**
 * "What's left", always in view: the degree's main point totals and the major, each as
 * planned-or-done / needed. The full rule list stays in the details below.
 */
const props = defineProps<{ statuses: RuleStatus[]; rules: CourseRule[] }>()
const { t } = useI18n()

interface Meter {
  id: string
  kind: 'points' | 'major'
  label: string
  have: number
  need: number
  status: RuleStatus['status']
}

const meters = computed<Meter[]>(() => {
  const out: Meter[] = []
  for (const s of props.statuses) {
    const rule = props.rules.find((r) => r.id === s.ruleId)
    if (!rule) continue
    if (rule.kind === 'points' && rule.min !== undefined) {
      // The totals students track: overall, each category with no level, and level 3.
      // Level 3: the course-wide rule when there is one, else its category's.
      const anyLevel3 = props.rules.some((r) => r.kind === 'points' && r.level === 3 && r.category === undefined && r.min !== undefined)
      const shown = rule.level === undefined || (rule.level === 3 && (rule.category === undefined || !anyLevel3))
      if (!shown) continue
      const label =
        rule.category && rule.level === undefined
          ? categoryLabel(t.value, rule.category)
          : rule.level !== undefined
            ? t.value('progress.level', { n: rule.level })
            : t.value('progress.total')
      out.push({ id: s.ruleId, kind: 'points', label, have: Number(s.params.have ?? 0), need: rule.min, status: s.status })
    } else if (rule.kind === 'major') {
      out.push({ id: s.ruleId, kind: 'major', label: t.value('progress.major'), have: s.status === 'ok' ? 1 : 0, need: 1, status: s.status })
    }
  }
  return out
})
</script>

<template>
  <section v-if="meters.length" class="progress surface" :aria-label="t('progress.title')">
    <div v-for="m in meters" :key="m.id" class="meter" :class="`meter-${m.status}`">
      <span class="meter-label">{{ m.label }}</span>
      <span class="meter-value">
        <template v-if="m.kind === 'major'">{{ m.status === 'ok' ? t('progress.done') : t('progress.notYet') }}</template>
        <template v-else>{{ m.have }} / {{ m.need }}</template>
      </span>
      <span class="meter-bar" aria-hidden="true"><span class="meter-fill" :style="{ width: `${Math.min(100, (m.have / m.need) * 100)}%` }" /></span>
    </div>
  </section>
</template>

<style scoped>
.progress {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px 18px;
  padding: 14px 18px;
}

.meter {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  align-items: baseline;
  min-width: 0;
}

.meter-label {
  overflow: hidden;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meter-value {
  font-size: 0.875rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.meter-bar {
  grid-column: 1 / -1;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

.meter-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--warn);
}

.meter-ok .meter-fill {
  background: var(--good, var(--accent));
}

.meter-fail .meter-fill {
  background: var(--bad);
}
</style>
