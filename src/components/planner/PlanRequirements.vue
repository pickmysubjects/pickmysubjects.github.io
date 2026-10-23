<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import type { CourseRule, RuleStatus } from '@/engine'
import { useI18n } from '@/i18n'
import { categoryLabel, ruleDetail, ruleText } from '@/i18n/format'

/**
 * The plan's progress in one place: how many degree rules are met, the totals students track
 * (overall, each category, level 3, the major), and — opened — every rule in plain words.
 * Tapping a rule lights up the subjects counting toward it on the board. Counting is automatic.
 */
const props = defineProps<{
  statuses: RuleStatus[]
  /** Every rule (the degree's, then a diploma's), for the full list. */
  rules: CourseRule[]
  /** The degree's own rules, for the meters. */
  degreeRules: CourseRule[]
  /** For each rule, the planned or done subjects that count toward it (where that can be told). */
  members: Record<string, string[]>
  active: string | null
}>()
const emit = defineEmits<{ focus: [ruleId: string | null] }>()
const { t } = useI18n()

// Closed until asked, unless a rule isn't met (or can't be told yet).
const open = shallowRef(props.statuses.some((s) => s.status !== 'ok'))

interface Meter {
  id: string
  kind: 'points' | 'major'
  label: string
  have: number
  need: number
  status: RuleStatus['status']
}

// The totals students track: overall, each category with no level, and level 3
// (the course-wide rule when there is one, else its category's); and the major.
const meters = computed<Meter[]>(() => {
  const out: Meter[] = []
  const anyLevel3 = props.degreeRules.some((r) => r.kind === 'points' && r.level === 3 && r.category === undefined && r.min !== undefined)
  for (const s of props.statuses) {
    const rule = props.degreeRules.find((r) => r.id === s.ruleId)
    if (!rule) continue
    if (rule.kind === 'points' && rule.min !== undefined) {
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
      out.push({ id: s.ruleId, kind: 'major', label: t.value('progress.major'), have: 0, need: 1, status: s.status })
    }
  }
  return out
})

const glyph = { ok: '✓', fail: '✕', unknown: '?' } as const
const rows = computed(() =>
  props.statuses.map((s) => ({
    id: s.ruleId,
    status: s.status,
    text: ruleText(t.value, props.rules.find((r) => r.id === s.ruleId), s.description),
    detail: ruleDetail(t.value, s),
    members: props.members[s.ruleId] ?? [],
  })),
)
const total = computed(() => rows.value.length)
const met = computed(() => rows.value.filter((r) => r.status === 'ok').length)
const left = computed(() => total.value - met.value)
// Unmet first: what still needs doing is what the student came to see.
const ordered = computed(() => [...rows.value].sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok')))
const health = computed(() => (left.value === 0 ? 'ok' : rows.value.some((r) => r.status === 'fail') ? 'fail' : 'unknown'))
// The ring: a circle filled by the share of rules met.
const RING = 2 * Math.PI * 17
const ringOffset = computed(() => RING * (1 - (total.value ? met.value / total.value : 0)))

const fmt = (n: number) => String(Math.round(n * 10) / 10)
function toggle(id: string): void {
  emit('focus', props.active === id ? null : id)
}
</script>

<template>
  <section v-if="total" class="progress surface" :class="`health-${health}`" :aria-label="t('progress.title')">
    <button class="head" type="button" :aria-expanded="open" @click="open = !open">
      <span class="health">
        <span class="ring-wrap" aria-hidden="true">
          <svg class="ring" viewBox="0 0 40 40">
            <circle class="ring-track" cx="20" cy="20" r="17" />
            <circle class="ring-fill" cx="20" cy="20" r="17" :stroke-dasharray="RING" :stroke-dashoffset="ringOffset" />
          </svg>
          <Check v-if="health === 'ok'" class="ring-mid" :size="18" :stroke-width="3" />
          <span v-else class="ring-mid ring-count">{{ left }}</span>
        </span>
        <span class="health-text">
          <span class="health-title">{{ health === 'ok' ? t('progress.allMet') : (left === 1 ? t('progress.leftOne') : t('progress.left', { n: left })) }}</span>
          <span class="health-sub">{{ t('rules.progress', { met, total }) }}</span>
        </span>
      </span>

      <span class="meters">
        <span v-for="m in meters" :key="m.id" class="meter" :class="[`meter-${m.status}`, `meter-kind-${m.kind}`]">
          <span class="meter-top">
            <span class="meter-label">{{ m.label }}</span>
            <span v-if="m.kind === 'major'" class="chip-state">{{ m.status === 'ok' ? t('progress.done') : t('progress.notYet') }}</span>
            <span v-else class="meter-value">{{ fmt(m.have) }}<span class="meter-need"> / {{ fmt(m.need) }}</span></span>
          </span>
          <span v-if="m.kind === 'points'" class="meter-bar" aria-hidden="true">
            <span class="meter-fill" :style="{ width: `${Math.min(100, (m.have / m.need) * 100)}%` }" />
          </span>
        </span>
      </span>

      <span class="toggle">
        {{ t('progress.showAll', { n: total }) }}
        <ChevronDown :size="16" aria-hidden="true" class="chevron" :class="{ turned: open }" />
      </span>
    </button>

    <div v-if="open" class="body">
      <p class="hint">{{ t('progress.tapHint') }}</p>
      <ul class="rules">
        <li v-for="r in ordered" :key="r.id">
          <button class="rule" :class="[`rule-${r.status}`, { 'rule-active': active === r.id }]" type="button" :aria-pressed="active === r.id" @click="toggle(r.id)">
            <span class="rule-glyph" aria-hidden="true">{{ glyph[r.status] }}</span>
            <span class="visually-hidden">{{ t(`rules.status.${r.status}`) }}:</span>
            <span class="rule-main">
              <span class="rule-text">{{ r.text }}</span>
              <span v-if="r.status !== 'ok' || active === r.id" class="rule-detail">{{ r.detail }}</span>
              <span v-if="active === r.id" class="rule-members">
                {{ r.members.length ? t('progress.counting', { codes: r.members.join(t('listSep')) }) : t('progress.countingNone') }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.progress {
  --tone: var(--good);
  min-width: 0;
  padding: 0;
  overflow: hidden;
}

.health-unknown {
  --tone: var(--warn);
}

.health-fail {
  --tone: var(--bad);
}

.head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 28px;
  width: 100%;
  padding: 14px 20px;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.health {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ring-wrap {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
}

.ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.ring-track,
.ring-fill {
  fill: none;
  stroke-width: 4;
}

.ring-track {
  stroke: color-mix(in srgb, var(--ink) 9%, transparent);
}

.ring-fill {
  stroke: var(--tone);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.4s;
}

.ring-mid {
  position: relative;
  color: var(--tone);
}

.ring-count {
  font-family: var(--font-code);
  font-size: 0.9375rem;
  font-weight: 700;
}

.health-text {
  display: grid;
  gap: 1px;
}

.health-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--tone);
  white-space: nowrap;
}

.health-sub {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  white-space: nowrap;
}

.meters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px 24px;
  min-width: 0;
  padding-left: 28px;
  border-left: 1px solid var(--line);
}

.meter {
  display: grid;
  align-content: end;
  gap: 6px;
  min-width: 0;
}

.meter-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 8px;
}

.meter-kind-major .meter-top {
  justify-content: flex-start;
  /* Sits on the same line as the other meters' bars. */
  margin-bottom: -2px;
}

/* Category names are lower case for use inside sentences; a label starts with a capital. */
.meter-label::first-letter {
  text-transform: uppercase;
}

.meter-label {
  display: inline-block;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.meter-value {
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.meter-need {
  font-weight: 500;
  color: var(--ink-faint);
}

.meter-bar {
  height: 5px;
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
  background: var(--good);
}

.meter-fail .meter-fill {
  background: var(--bad);
}

.chip-state {
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 650;
  background: var(--warn-soft);
  color: var(--warn);
}

.meter-ok .chip-state {
  background: var(--good-soft);
  color: var(--good);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
}

.head:hover .toggle,
.head:focus-visible .toggle {
  color: var(--accent);
}

.chevron {
  transition: transform 0.15s;
}

.chevron.turned {
  transform: rotate(180deg);
}

.body {
  display: grid;
  gap: 8px;
  padding: 4px 16px 16px;
  border-top: 1px solid var(--line);
}

.hint {
  padding: 8px 4px 0;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.rules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 2px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.rule:hover {
  background: var(--surface-2);
}

.rule-active {
  border-color: var(--good);
  background: color-mix(in srgb, var(--good-soft) 70%, transparent);
}

.rule-glyph {
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

.rule-fail .rule-glyph {
  background: var(--bad);
}

.rule-unknown .rule-glyph {
  background: var(--warn);
}

.rule-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.rule-text {
  font-size: 0.875rem;
  line-height: 1.4;
}

.rule-detail {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.rule-fail .rule-detail {
  color: var(--bad);
}

.rule-members {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--good);
  overflow-wrap: anywhere;
}

/* Narrower screens: status and toggle on one line, the meters below in two columns. */
@media (max-width: 900px) {
  .head {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px 12px;
    padding: 14px 16px;
  }

  .meters {
    grid-column: 1 / -1;
    grid-row: 2;
    grid-template-columns: 1fr 1fr;
    padding: 12px 0 0;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .health-title,
  .health-sub {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-fill,
  .chevron {
    transition: none;
  }
}
</style>
