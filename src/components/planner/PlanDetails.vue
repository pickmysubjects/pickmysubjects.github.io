<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import PlanHowBuilt from '@/components/planner/PlanHowBuilt.vue'
import { isPassedDuplicate, type CourseRule, type Issue, type Note, type RuleStatus } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { issueText, ruleDetail, ruleText } from '@/i18n/format'
import { reducedMotion } from '@/utils/motion'

/**
 * The fold under the board: every degree rule as one row (name, status, progress, "Show" lights
 * its subjects on the board), then the plan's subject checks as one row and one action each, then
 * how the plan was built behind a one-line fold. The rules strip above summarises; this lists.
 */
const props = defineProps<{
  statuses: RuleStatus[]
  /** Every rule (the degree's, then a diploma's). */
  rules: CourseRule[]
  /** The degree's own rules, for "how this plan was built". */
  degreeRules: CourseRule[]
  members: Record<string, string[]>
  /** The rule lit on the board, if any. */
  active: string | null
  issues: Issue[]
  /** Codes already passed on My record: the record line above handles those repeats. */
  passed: Set<string>
  notes: (Note | string)[]
  unplaced: { code: string; reason: string; reasonKey?: string }[]
}>()
const emit = defineEmits<{ focus: [ruleId: string | null]; select: [code: string]; open: [code: string] }>()
const { t } = useI18n()
const { data } = useDataset()
const plan = usePlan()
const { setConfirmed } = useProfile()

type Group = 'credits' | 'major' | 'other'
const GROUPS: Group[] = ['credits', 'major', 'other']
const groupOf = (rule: CourseRule | undefined): Group => {
  const kind = rule?.kind
  if (kind === 'points' || kind === 'level1-areas' || kind === 'area-cap' || kind === 'progression') return 'credits'
  if (kind === 'major' || kind === 'specialisation' || kind === 'minor') return 'major'
  return 'other'
}

const fmt = (n: number) => String(Math.round(n * 10) / 10)
interface Row {
  id: string
  group: Group
  status: RuleStatus['status']
  name: string
  state: string
  progress: string
  /** 0–1 for a points rule, shown as a slim bar. */
  share?: number
  members: string[]
}
const rows = computed<Row[]>(() =>
  props.statuses.map((s) => {
    const rule = props.rules.find((r) => r.id === s.ruleId)
    const members = props.members[s.ruleId] ?? []
    const points = rule?.kind === 'points' && rule.min !== undefined
    const have = Number(s.params.have ?? 0)
    const state =
      s.status === 'ok'
        ? t.value('checks.met')
        : s.status === 'unknown'
          ? t.value('checks.toConfirm')
          : points
            ? t.value('checks.short', { n: fmt(Math.max(0, rule.min! - have)) })
            : t.value('checks.notMet')
    // Met: how many subjects count (the detail would only repeat the name). Unmet: what's missing.
    const progress = s.status === 'ok' && !points ? (members.length ? t.value('checks.subjects', { n: members.length }) : '') : ruleDetail(t.value, s)
    return {
      id: s.ruleId,
      group: groupOf(rule),
      status: s.status,
      name: ruleText(t.value, rule, s.description),
      state,
      progress,
      share: points ? Math.min(1, have / rule.min!) : undefined,
      members,
    }
  }),
)
const grouped = (list: Row[]) => GROUPS.map((g) => ({ g, rows: list.filter((r) => r.group === g) })).filter((x) => x.rows.length)
const open = computed(() => rows.value.filter((r) => r.status !== 'ok'))
const met = computed(() => rows.value.filter((r) => r.status === 'ok'))

function scrollToBoard(): void {
  document.getElementById('board')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}
function show(id: string): void {
  const on = props.active !== id
  emit('focus', on ? id : null)
  if (on) scrollToBoard()
}

// Subject checks: rule issues are the rows above, a passed subject planned again is the record
// line's job. The same sentence twice (a subject planned twice) is one row.
const CONFIRM = new Set(['prereq-unknown', 'prereq-unknown-missing', 'prereq-advisory'])
interface Check {
  text: string
  tone: 'bad' | 'warn'
  confirm?: string
  subject?: string
}
const checks = computed<Check[]>(() => {
  const seen = new Set<string>()
  const out: Check[] = []
  const issues = props.issues.filter((i) => i.severity !== 'info' && !i.ruleId && !isPassedDuplicate(i, props.passed))
  // Problems first, then things to confirm or keep an eye on.
  issues.sort((a, b) => Number(a.severity !== 'error') - Number(b.severity !== 'error'))
  for (const i of issues) {
    const text = issueText(t.value, i, props.rules, props.statuses, data.value.subjects, plan.setup.value.course)
    if (seen.has(text)) continue
    seen.add(text)
    out.push({
      text,
      tone: i.severity === 'error' ? 'bad' : 'warn',
      confirm: CONFIRM.has(i.kind) ? i.subject : undefined,
      subject: i.subject,
    })
  }
  for (const u of props.unplaced) {
    out.push({ text: t.value('plan.unplaced', { code: u.code, reason: u.reasonKey ? t.value(`unplacedReason.${u.reasonKey}`) : u.reason }), tone: 'bad' })
  }
  return out
})
const assumptions = computed(() =>
  props.issues
    .filter((i) => i.severity === 'info')
    .map((i) => issueText(t.value, i, props.rules, props.statuses, data.value.subjects, plan.setup.value.course))
    .filter((x, n, all) => all.indexOf(x) === n),
)
function showSubject(code: string): void {
  emit('select', code)
  scrollToBoard()
}
</script>

<template>
  <details class="details">
    <summary class="details-summary">
      <span>{{ t('checks.allTitle') }}</span>
      <ChevronDown :size="18" aria-hidden="true" class="details-chevron" />
    </summary>

    <div class="body">
      <section v-if="rows.length" class="block" aria-labelledby="details-rules">
        <h2 id="details-rules" class="block-title">{{ t('rules.title') }}</h2>
        <template v-for="list in [open.length ? open : met]" :key="open.length ? 'open' : 'met'">
          <div v-for="x in grouped(list)" :key="x.g" class="group">
            <h3 class="group-title">{{ t(`checks.group.${x.g}`) }}</h3>
            <ul class="rows">
              <li v-for="r in x.rows" :key="r.id" class="row" :class="[`row-${r.status}`, { 'row-active': active === r.id }]">
                <span class="row-name">{{ r.name }}</span>
                <span class="row-state">{{ r.state }}</span>
                <span class="row-progress">
                  <span v-if="r.share !== undefined" class="bar" aria-hidden="true"><span class="bar-fill" :style="{ width: `${r.share * 100}%` }" /></span>
                  <span class="row-detail">{{ r.progress }}</span>
                </span>
                <button v-if="r.members.length" class="row-action" type="button" :aria-pressed="active === r.id" @click="show(r.id)">
                  {{ active === r.id ? t('checks.hide') : t('checks.show') }}
                </button>
                <span v-else class="row-action-empty" />
              </li>
            </ul>
          </div>
        </template>
        <details v-if="open.length && met.length" class="fold">
          <summary>{{ met.length === 1 ? t('checks.metFoldOne') : t('checks.metFold', { n: met.length }) }}</summary>
          <div v-for="x in grouped(met)" :key="x.g" class="group">
            <h3 class="group-title">{{ t(`checks.group.${x.g}`) }}</h3>
            <ul class="rows">
              <li v-for="r in x.rows" :key="r.id" class="row row-ok" :class="{ 'row-active': active === r.id }">
                <span class="row-name">{{ r.name }}</span>
                <span class="row-state">{{ r.state }}</span>
                <span class="row-progress"><span class="row-detail">{{ r.progress }}</span></span>
                <button v-if="r.members.length" class="row-action" type="button" :aria-pressed="active === r.id" @click="show(r.id)">
                  {{ active === r.id ? t('checks.hide') : t('checks.show') }}
                </button>
                <span v-else class="row-action-empty" />
              </li>
            </ul>
          </div>
        </details>
      </section>

      <section class="block" aria-labelledby="details-checks">
        <h2 id="details-checks" class="block-title">{{ t('checks.title') }}</h2>
        <p v-if="!checks.length" class="clear">{{ t('checks.clear') }}</p>
        <ul v-else class="rows">
          <li v-for="(c, n) in checks" :key="n" class="row check" :class="`check-${c.tone}`">
            <span class="check-text">{{ c.text }}</span>
            <button v-if="c.confirm" class="row-action" type="button" @click="setConfirmed(c.confirm, true)">{{ t('plan.iMeetThis') }}</button>
            <button v-else-if="c.subject" class="row-action" type="button" @click="showSubject(c.subject)">{{ t('checks.show') }}</button>
            <span v-else class="row-action-empty" />
          </li>
        </ul>
        <details v-if="assumptions.length" class="fold">
          <summary>{{ assumptions.length === 1 ? t('checks.notesOne') : t('checks.notes', { n: assumptions.length }) }}</summary>
          <ul class="plain">
            <li v-for="a in assumptions" :key="a">{{ a }}</li>
          </ul>
        </details>
      </section>

      <div class="foot">
        <details v-if="notes.length" class="fold how">
          <summary>{{ t('plan.howBuilt') }}</summary>
          <PlanHowBuilt :notes="notes" :rules="degreeRules" :unplaced="[]" @open="emit('open', $event)" />
        </details>
        <span class="board-help">{{ t('checks.boardHelp') }} <InfoTip :text="`${t('plan.hint')} ${t('plan.tagLegend')}`" /></span>
      </div>
    </div>
  </details>
</template>

<style scoped>
.details {
  border-top: 1px solid var(--divider);
}

.details-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

.details-summary::-webkit-details-marker,
.fold > summary::-webkit-details-marker {
  display: none;
}

.details-chevron {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.15s;
}

.details[open] .details-chevron {
  transform: rotate(180deg);
}

/* Flat sections divided by lines: no card inside the board's glass. */
.body {
  display: grid;
  gap: 20px;
  padding: 4px 0 12px;
}

.block {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.block-title {
  font-size: 1rem;
  font-weight: 700;
}

.group {
  display: grid;
  gap: 2px;
}

.group-title {
  margin-top: 4px;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* One rule per row: name | status | progress | action. */
.row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 10em minmax(0, 1.4fr) 7em;
  align-items: center;
  gap: 4px 16px;
  min-height: 44px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 0.875rem;
}

.rows > .row:last-child {
  border-bottom: 0;
}

.row-active {
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--good-soft) 70%, transparent);
}

.row-name {
  line-height: 1.4;
}

.row-state {
  font-weight: 650;
  --tone: var(--good);
  color: color-mix(in srgb, var(--tone) 75%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 */
}

.row-fail .row-state {
  --tone: var(--accent);
}

.row-unknown .row-state {
  --tone: var(--warn);
}

.row-progress {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.row-detail {
  font-size: 0.8125rem;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.bar {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.row-ok .bar-fill {
  background: var(--good);
}

.row-action {
  justify-self: end;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.row-action:hover,
.row-action:focus-visible {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 */
}

.row-action[aria-pressed='true'] {
  border-color: var(--good);
}

/* A check: a coloured mark, the sentence, one action. */
.check {
  grid-template-columns: minmax(0, 1fr) auto;
}

.check-text {
  padding-left: 12px;
  border-left: 3px solid var(--warn);
  line-height: 1.45;
}

.check-bad .check-text {
  border-left-color: var(--bad);
}

.clear {
  margin: 0;
  font-weight: 600;
  color: color-mix(in srgb, var(--good) 75%, var(--ink));
}

.fold > summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
  list-style: none;
}

.fold > summary::before {
  content: '';
  flex: none;
  width: 6px;
  height: 6px;
  margin: 0 4px 0 2px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.15s;
}

.fold[open] > summary::before {
  transform: rotate(45deg);
}

.plain {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0 0 0 20px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px 16px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.how {
  flex: 1 1 320px;
}

/* The fold's summary already says it; the component's own heading would repeat it. */
.how :deep(.how-title) {
  display: none;
}

.board-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

/* Phones: name and status on one line, progress under them, the action full width. */
@media (max-width: 560px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 10px 4px;
  }

  .row-progress {
    grid-column: 1 / -1;
  }

  .row-action {
    grid-column: 1 / -1;
    justify-self: stretch;
    min-height: 44px;
  }

  .row-action-empty {
    display: none;
  }

  .check {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .details-chevron,
  .fold > summary::before {
    transition: none;
  }
}
</style>
