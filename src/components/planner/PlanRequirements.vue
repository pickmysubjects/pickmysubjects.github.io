<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { CourseRule, RuleStatus } from '@/engine'
import { useI18n } from '@/i18n'
import { ruleDetail, ruleText } from '@/i18n/format'

/**
 * The degree's requirements beside the plan: each rule with how far along it is, in plain words.
 * Tapping one lights up the subjects that count toward it on the board and lists them here.
 * Counting is automatic; nothing has to be tagged.
 */
const props = defineProps<{
  statuses: RuleStatus[]
  rules: CourseRule[]
  /** For each rule, the planned or done subjects that count toward it (where that can be told). */
  members: Record<string, string[]>
  active: string | null
}>()
const emit = defineEmits<{ focus: [ruleId: string | null] }>()
const { t } = useI18n()
// One line until opened; a rule that isn't met (or can't be told yet) opens it by itself.
const open = shallowRef(props.statuses.some((s) => s.status !== 'ok'))

const glyph = { ok: '✓', fail: '✕', unknown: '?' } as const

const rows = computed(() =>
  props.statuses.map((s) => {
    const rule = props.rules.find((r) => r.id === s.ruleId)
    const points = rule?.kind === 'points' && rule.min !== undefined ? { have: Number(s.params.have ?? 0), need: rule.min } : null
    return {
      id: s.ruleId,
      status: s.status,
      text: ruleText(t.value, rule, s.description),
      detail: ruleDetail(t.value, s),
      points,
      members: props.members[s.ruleId] ?? [],
    }
  }),
)
const metCount = computed(() => rows.value.filter((r) => r.status === 'ok').length)
// Unmet first: what still needs doing is what the student came to see.
const ordered = computed(() => [...rows.value].sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok')))

function toggle(id: string): void {
  emit('focus', props.active === id ? null : id)
}
</script>

<template>
  <section v-if="rows.length" class="reqs surface" :aria-label="t('progress.title')">
    <button class="reqs-head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="reqs-title">{{ t('progress.title') }}</span>
      <span class="reqs-count">{{ t('rules.progress', { met: metCount, total: rows.length }) }}</span>
      <span class="reqs-bar" aria-hidden="true"><span class="reqs-fill" :style="{ width: `${(metCount / rows.length) * 100}%` }" /></span>
      <ChevronDown :size="18" aria-hidden="true" class="reqs-chevron" :class="{ turned: open }" />
    </button>
    <div class="reqs-body" :class="{ 'reqs-open': open }">
      <p class="reqs-hint">{{ t('progress.tapHint') }}</p>
      <ul class="reqs-list">
        <li v-for="r in ordered" :key="r.id">
          <button class="req" :class="[`req-${r.status}`, { 'req-active': active === r.id }]" type="button" :aria-pressed="active === r.id" @click="toggle(r.id)">
            <span class="req-glyph" aria-hidden="true">{{ glyph[r.status] }}</span>
            <span class="visually-hidden">{{ t(`rules.status.${r.status}`) }}:</span>
            <span class="req-main">
              <span class="req-text">{{ r.text }}</span>
              <span v-if="r.status !== 'ok' || active === r.id" class="req-detail">{{ r.detail }}</span>
              <span v-if="r.points" class="req-bar" aria-hidden="true">
                <span class="req-fill" :style="{ width: `${Math.min(100, (r.points.have / r.points.need) * 100)}%` }" />
              </span>
              <span v-if="active === r.id" class="req-members">
                <template v-if="r.members.length">{{ t('progress.counting', { codes: r.members.join(', ') }) }}</template>
                <template v-else>{{ t('progress.countingNone') }}</template>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.reqs {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 8px 12px;
}

.reqs-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  padding: 2px 4px;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.reqs-title {
  font-weight: 700;
}

.reqs-count {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.reqs-chevron {
  flex: none;
  margin-left: auto;
  color: var(--ink-faint);
  transition: transform 0.15s;
}

.reqs-chevron.turned {
  transform: rotate(180deg);
}

.reqs-body {
  display: none;
  gap: 8px;
}

.reqs-open {
  display: grid;
}

.reqs-hint {
  padding: 0 4px;
  font-size: 0.75rem;
  color: var(--ink-faint);
}

.reqs-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.req {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.req:hover {
  background: var(--surface-2);
}

.req-active {
  border-color: var(--good);
  background: color-mix(in srgb, var(--good-soft) 70%, transparent);
}

.req-glyph {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  background: var(--good);
}

.req-fail .req-glyph {
  background: var(--bad);
}

.req-unknown .req-glyph {
  background: var(--warn);
}

.req-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.req-text {
  font-size: 0.875rem;
  line-height: 1.35;
}

.req-detail {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.req-fail .req-detail {
  color: var(--bad);
}

.req-bar {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

.req-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--warn);
}

.req-ok .req-fill {
  background: var(--good);
}

.req-members {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--good);
  overflow-wrap: anywhere;
}

.reqs-bar {
  flex: 1;
  max-width: 260px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

.reqs-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--good);
}

/* Wide screens: the rules in columns, so the open list stays short. */
@media (min-width: 900px) {
  .reqs-list {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}
</style>
