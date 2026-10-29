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
  /** Problems with the plan's subjects (errors): every rule met isn't "ready to graduate" while there are any. */
  problems?: number
  /** False: start folded even with rules unmet (a plan just built). */
  startOpen?: boolean
  /** Conditions we can't check (a VCE score, a test) the student still has to confirm. */
  unconfirmed?: number
}>()
const emit = defineEmits<{ focus: [ruleId: string | null] }>()
const { t } = useI18n()

// Folded: the status line and meters say it; the full list is one tap away. Opened only when a rule
// fails on a plan that wasn't just built.
const open = shallowRef(props.startOpen !== false && props.statuses.some((s) => s.status === 'fail'))

interface Meter {
  id: string
  label: string
  have: number
  need: number
  status: RuleStatus['status']
}

// The totals students track: overall, each category with no level, and level 3
// (the course-wide rule when there is one, else its category's); and the major.
// A meter's name stands alone, so it starts with a capital ("Science"), though the word is
// lower case mid-sentence elsewhere. Scripts without case are unchanged.
const capitalised = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)
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
          ? capitalised(categoryLabel(t.value, rule.category))
          : rule.level !== undefined
            ? t.value('progress.level', { n: rule.level })
            : t.value('progress.total')
      out.push({ id: s.ruleId, label, have: Number(s.params.have ?? 0), need: rule.min, status: s.status })
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
// The major isn't a total: it shows only while unmet, as a row under the meters.
const majorLeft = computed(() =>
  rows.value.filter((r) => r.status !== 'ok' && props.degreeRules.find((x) => x.id === r.id)?.kind === 'major'),
)
const total = computed(() => rows.value.length)
const met = computed(() => rows.value.filter((r) => r.status === 'ok').length)
const left = computed(() => total.value - met.value)
// Unmet first: what still needs doing is what the student came to see.
const ordered = computed(() => [...rows.value].sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok')))
// Every rule met but subjects with problems (planned twice, a missing prerequisite): not "ready".
const blocked = computed(() => left.value === 0 && (props.problems ?? 0) > 0)
const health = computed(() => (left.value === 0 ? (blocked.value ? 'unknown' : 'ok') : rows.value.some((r) => r.status === 'fail') ? 'fail' : 'unknown'))
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
    <div class="head">
      <span class="health">
        <span class="ring-wrap" aria-hidden="true">
          <svg class="ring" viewBox="0 0 40 40">
            <circle class="ring-track" cx="20" cy="20" r="17" />
            <circle class="ring-fill" cx="20" cy="20" r="17" :stroke-dasharray="RING" :stroke-dashoffset="ringOffset" />
          </svg>
          <Check v-if="health === 'ok'" class="ring-mid" :size="16" :stroke-width="3" />
          <span v-else-if="blocked" class="ring-mid ring-count">!</span>
          <span v-else class="ring-mid ring-count">{{ left }}</span>
        </span>
        <span class="health-text">
          <span class="health-title">{{ health === 'ok' ? t('progress.allMet') : blocked ? t('progress.metButProblems', { n: problems ?? 0 }) : (left === 1 ? t('progress.leftOne') : t('progress.left', { n: left })) }}</span>
          <!-- Conditions we can't check: their own line, jumping to the rows that confirm them. -->
          <a v-if="health === 'ok' && unconfirmed" class="confirm-chip" :href="$slots.notes ? '#rules-notes' : undefined">{{ t('progress.toConfirm', { n: unconfirmed }) }}</a>
        </span>
      </span>
      <button class="toggle" type="button" :aria-expanded="open" aria-controls="rules-all" @click="open = !open">
        {{ t('progress.showAll', { n: total }) }}
        <ChevronDown :size="16" aria-hidden="true" class="chevron" :class="{ turned: open }" />
      </button>
    </div>

    <!-- One row of totals, a cell each: name, points, bar, what's left. -->
    <ul class="meters">
      <li v-for="m in meters" :key="m.id" class="meter" :class="`meter-${m.status}`">
        <span class="meter-label">{{ m.label }}</span>
        <span class="meter-value">
          {{ fmt(m.have) }}<span class="meter-need"> / {{ fmt(m.need) }}</span>
        </span>
        <span class="meter-bar" aria-hidden="true">
          <span class="meter-fill" :style="{ width: `${Math.min(100, (m.have / m.need) * 100)}%` }" />
        </span>
        <!-- A minimum met (more than enough counts too: the extra points still go to the total). -->
        <span class="meter-state">{{ m.status === 'ok' ? t('progress.done') : t('progress.short', { n: fmt(Math.max(0, m.need - m.have)) }) }}</span>
      </li>
    </ul>

    <ul v-if="majorLeft.length" class="major-left">
      <li v-for="r in majorLeft" :key="r.id">
        <button class="major-row" :class="{ 'rule-active': active === r.id }" type="button" :aria-pressed="active === r.id" @click="toggle(r.id)">
          <span class="major-name">{{ t('progress.major') }}</span>
          <span>{{ r.text }}<template v-if="r.detail"> — {{ r.detail }}</template></span>
        </button>
      </li>
    </ul>

    <!-- The plan's other status (conditions to confirm, subject problems, notes) lives in the same card. -->
    <div v-if="$slots.notes" id="rules-notes" class="notes">
      <slot name="notes" />
    </div>

    <!-- One-line headlines that jump elsewhere on the page (e.g. heavy semesters). -->
    <div v-if="$slots.alerts" class="alerts">
      <slot name="alerts" />
    </div>

    <div v-if="open" id="rules-all" class="body">
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'health toggle' 'meters meters' 'major major' 'notes notes' 'alerts alerts' 'body body';
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

.alerts {
  grid-area: alerts;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid var(--line);
}

.notes {
  grid-area: notes;
  display: grid;
  gap: 8px;
  padding: 10px 18px 12px;
  scroll-margin-top: 96px;
  border-top: 1px solid var(--line);
  font-size: 0.9375rem;
}

/* The status and the toggle place themselves in the card's grid: side by side here, the
   toggle under the rows on phones. */
.head {
  display: contents;
}

.health {
  grid-area: health;
  padding: 12px 18px 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.ring-wrap {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
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
  color: color-mix(in srgb, var(--tone) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.ring-count {
  font-family: var(--font-code);
  font-size: 0.875rem;
  font-weight: 700;
}

.health-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
}

.health-title {
  font-size: 1rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--tone) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

/* A small chip, not a second headline. */
.confirm-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--warn-soft);
  color: color-mix(in srgb, var(--warn) 70%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 */
  text-decoration: none;
}

.confirm-chip[href]:hover,
.confirm-chip[href]:focus-visible {
  text-decoration: underline;
}

/* One row of totals: equal cells with a fine line between them. */
.meters {
  grid-area: meters;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  margin: 0;
  padding: 6px 18px 14px;
  list-style: none;
}

.meter {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 2px 16px;
  border-left: 1px solid var(--line);
}

.meter:first-child {
  padding-left: 0;
  border-left: 0;
}

/* Category names are lower case for use inside sentences; a label starts with a capital. */
.meter-label::first-letter {
  text-transform: uppercase;
}

.meter-label {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.meter-value {
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.meter-need {
  font-weight: 500;
  color: var(--ink-soft);
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
  background: var(--accent);
}

.meter-ok .meter-fill {
  background: var(--good);
}

.meter-state {
  font-size: 0.8125rem;
  font-weight: 650;
  white-space: nowrap;
  color: color-mix(in srgb, var(--accent) 75%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 */
}

.meter-ok .meter-state {
  color: color-mix(in srgb, var(--good) 75%, var(--ink));
}

.major-left {
  grid-area: major;
  margin: 0;
  padding: 0 12px 10px;
  list-style: none;
}

.major-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  width: 100%;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
}

.major-row:hover {
  background: var(--inset-fill);
}

.major-name {
  font-weight: 650;
  color: color-mix(in srgb, var(--accent) 75%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 */
}

.toggle {
  grid-area: toggle;
  align-self: center;
  margin-right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
  cursor: pointer;
}

.toggle:hover,
.toggle:focus-visible {
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.chevron {
  transition: transform 0.15s;
}

.chevron.turned {
  transform: rotate(180deg);
}

.body {
  grid-area: body;
  display: grid;
  gap: 8px;
  padding: 4px 16px 16px;
  border-top: 1px solid var(--line);
}

.hint {
  padding: 8px 4px 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
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
  background: var(--inset-fill);
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
  font-size: 0.75rem;
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

/* Phones: name, points and what's left on one line, the bar under them. */
@media (max-width: 560px) {
  .progress {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'health' 'meters' 'toggle' 'major' 'notes' 'alerts' 'body';
  }

  .health {
    padding: 12px 16px 6px;
  }

  /* Phones: the cells wrap into two columns. */
  .meters {
    grid-auto-flow: row;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 12px;
    padding: 6px 16px 12px;
  }

  .meter {
    padding: 2px 10px;
  }

  .meter:nth-child(2n + 1) {
    padding-left: 0;
    border-left: 0;
  }

  .alerts {
    padding: 10px 16px;
  }

  .toggle {
    justify-self: start;
    min-height: 44px;
    margin: -6px 0 4px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-fill,
  .chevron {
    transition: none;
  }
}
</style>
