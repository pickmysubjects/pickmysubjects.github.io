<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef, useId } from 'vue'
import { Calculator, Check, Plus, Search, Star, Trash2 } from 'lucide-vue-next'
import { isFail, PASS_MARK, type Credit, type Period, type Profile, type Subject } from '@/engine'
import CreditEditor from './CreditEditor.vue'
import { termLabel } from '@/i18n/format'
import { recordTermChoices } from '@/utils/pastTerms'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { link } from '@/composables/useView'
import RatingForm from '@/components/rating/RatingForm.vue'
import RatePrompt from '@/components/rating/RatePrompt.vue'
import { useRated } from '@/composables/useRated'

const results = defineModel<Profile['results']>({ required: true })
// Credit for study elsewhere with no named subject (see CreditEditor).
const credit = defineModel<Credit[]>('credit', { default: () => [] })
const creditOpen = defineModel<boolean>('creditOpen', { default: false })
const props = defineProps<{ subjects: Record<string, Subject>; options: { code: string; title: string }[] }>()

const listId = useId()
const { t, locale } = useI18n()
const { rated, markRated, shouldPrompt } = useRated()
// Just added a subject: offer to rate it once (not for every row, and never again after).
const rateNext = shallowRef<string | null>(null)
const rating = shallowRef<string | null>(null)
const thanks = shallowRef<string | null>(null)

function onRated(code: string, sent: boolean): void {
  rating.value = null
  if (sent) {
    markRated(code)
    thanks.value = code
  }
}
const code = shallowRef('')
const mark = shallowRef<number | ''>('')
// The semester it was taken, if the student gives one ("year|period").
const addTerm = shallowRef('')
const error = shallowRef('')

function add(): void {
  const c = code.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  if (!/^[A-Z]{4}\d{5}$/.test(c)) {
    error.value = t.value('record.badCode')
    return
  }
  // A retake is a new line (both attempts stay on the transcript and in the WAM); a second
  // pass of the same subject is a mistake.
  if (results.value.some((r) => r.code === c && !isFail(r))) {
    error.value = t.value('record.duplicate', { code: c })
    return
  }
  // Pass/fail subjects have no mark to keep.
  const m = mark.value === '' || props.subjects[c]?.passFail ? undefined : Number(mark.value)
  const [y, p] = addTerm.value.split('|')
  results.value = [...results.value, y && p ? { code: c, mark: m, year: Number(y), period: p as Period } : { code: c, mark: m }]
  rateNext.value = props.subjects[c] && shouldPrompt(c) ? c : null
  code.value = ''
  mark.value = ''
  error.value = ''
  // The semester stays: several subjects from one semester are usually entered in a row.
}

function setMark(i: number, event: Event): void {
  const input = event.target as HTMLInputElement
  const m = input.value === '' ? undefined : Math.max(0, Math.min(100, Number(input.value)))
  // Keep whatever else the row holds (the semester it was taken).
  results.value = results.value.map((r, j) => (j === i ? { ...r, mark: m } : r))
  // If the stored mark didn't change (e.g. 100 → 150 → 100), Vue won't repaint the box.
  input.value = m === undefined ? '' : String(m)
}

// When it was taken: the semesters of the plan, from the start of study to its last semester
// (and any semester already on the record), so the two pages use the same years.
const plan = usePlan()
const TERMS = computed(() =>
  recordTermChoices([
    { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod },
    ...plan.terms.value,
    ...results.value.filter((r): r is typeof r & { year: number; period: Period } => r.year !== undefined && r.period !== undefined),
  ]),
)
const termValue = (r: Profile['results'][number]) => (r.year && r.period ? `${r.year}|${r.period}` : '')
function setTerm(i: number, event: Event): void {
  const [y, p] = (event.target as HTMLSelectElement).value.split('|')
  results.value = results.value.map((r, j) => {
    if (j !== i) return r
    const { year: _y, period: _p, ...rest } = r
    return y && p ? { ...rest, year: Number(y), period: p as Period } : rest
  })
}

const titleOf = (c: string) => {
  const s = props.subjects[c]
  return s ? localTitle(s, locale.value) || s.title : t.value('record.notInDataset')
}

// Melbourne's grade bands, the names on a transcript.
function gradeOf(m: number): string {
  return m >= 80 ? 'H1' : m >= 75 ? 'H2A' : m >= 70 ? 'H2B' : m >= 65 ? 'H3' : m >= 50 ? 'P' : 'N'
}

const PERIOD_ORDER: Record<string, number> = { summer: 0, 'semester-1': 1, winter: 2, 'semester-2': 3 }
const groups = computed(() => {
  const by = new Map<string, (Profile['results'][number] & { i: number })[]>()
  for (const [i, r] of results.value.entries()) {
    const key = r.year && r.period ? `${r.year}|${r.period}` : ''
    by.set(key, [...(by.get(key) ?? []), { ...r, i }])
  }
  const sortKey = (k: string) => {
    if (!k) return Infinity
    const [y, p] = k.split('|')
    return Number(y) * 10 + (PERIOD_ORDER[p ?? ""] ?? 5)
  }
  return [...by.entries()]
    .sort(([a], [b]) => sortKey(a) - sortKey(b))
    .map(([key, rows]) => {
      const marks = rows.map((r) => r.mark).filter((m): m is number => m !== undefined)
      const [y, p] = key.split('|')
      return {
        key,
        label: key ? termLabel(t.value, { year: Number(y), period: p as Period }) : t.value('record.termUnknown'),
        avg: marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null,
        rows,
      }
    })
})

function setFailed(i: number, failed: boolean): void {
  results.value = results.value.map((r, j) => {
    if (j !== i) return r
    const { failed: _f, ...rest } = r
    return failed ? { ...rest, failed: true } : rest
  })
}

// The University's academic progress rules flag a subject failed twice; worth saying plainly.
const failedTwice = computed(() => {
  const n = new Map<string, number>()
  for (const r of results.value) if (isFail(r)) n.set(r.code, (n.get(r.code) ?? 0) + 1)
  return [...n].filter(([, k]) => k >= 2).map(([c]) => c)
})

function remove(i: number): void {
  results.value = results.value.filter((_, j) => j !== i)
}

</script>

<template>
  <section class="results" aria-labelledby="results-title">
    <h2 id="results-title" class="section-title visually-hidden">{{ t('record.completed') }}</h2>
    <form class="add" @submit.prevent="add">
      <label class="add-code">
        <span class="visually-hidden">{{ t('record.subject') }}</span>
        <Search :size="16" aria-hidden="true" class="add-icon" />
        <input v-model="code" class="input add-input" :list="listId" :placeholder="t('record.subjectPlaceholder')" />
        <datalist :id="listId">
          <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
        </datalist>
      </label>
      <label class="add-mark">
        <span class="visually-hidden">{{ t('record.mark') }}</span>
        <input v-model="mark" class="input" type="number" min="0" max="100" :placeholder="t('record.markShort')" />
      </label>
      <label class="add-term">
        <span class="visually-hidden">{{ t('record.addTerm') }}</span>
        <select v-model="addTerm" class="input add-term-select">
          <option value="">{{ t('record.addTerm') }}</option>
          <option v-for="x in TERMS" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
        </select>
      </label>
      <button class="button button-accent add-btn" type="submit"><Plus :size="16" aria-hidden="true" /> {{ t('record.add') }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="results.length === 0" class="empty">{{ t('record.empty', { pass: PASS_MARK }) }}</p>
    <!-- Grouped by semester, like a transcript; subjects without a semester come last. -->
    <div v-else class="groups">
      <section v-for="g in groups" :key="g.key" class="group">
        <h3 class="group-head">
          <span>{{ g.label }}</span>
          <span v-if="g.avg !== null" class="group-avg">{{ t('record.termAvg', { n: g.avg }) }}</span>
        </h3>
        <ul class="rows">
          <li v-for="r in g.rows" :key="r.i" class="row" :class="{ 'row-fail': isFail(r) }">
            <div class="row-main">
              <span class="code">{{ r.code }}</span>
              <span class="title">{{ titleOf(r.code) }}</span>
            </div>
            <!-- One cell on a phone, so the mark can drop under a long semester name. -->
            <div class="row-sub">
            <label class="when">
              <span class="visually-hidden">{{ t('record.termFor', { code: r.code }) }}</span>
              <select class="when-select" :value="termValue(r)" @change="setTerm(r.i, $event)">
                <option value="">{{ t('record.termUnknown') }}</option>
                <option v-for="x in TERMS" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
              </select>
            </label>
            <!-- Credit for a named subject: passed, with no mark (it isn't in the WAM). -->
            <div v-if="r.credit" class="mark-cell">
              <span class="credit-chip" :title="t('record.creditChipHint')">{{ t('record.creditChip') }}</span>
            </div>
            <!-- Pass/fail: no mark, just whether it was passed. -->
            <div v-else-if="subjects[r.code]?.passFail" class="mark-cell pf-seg" role="group" :aria-label="t('record.passFailHint')" :title="t('record.passFailHint')">
              <button type="button" :aria-pressed="!r.failed" @click="setFailed(r.i, false)">{{ t('record.pfPass') }}</button>
              <button type="button" :aria-pressed="r.failed === true" @click="setFailed(r.i, true)">{{ t('record.pfFail') }}</button>
            </div>
            <div v-else class="mark-cell">
              <input
                class="input mark"
                type="number"
                min="0"
                max="100"
                :placeholder="t('record.markShort')"
                :value="r.mark ?? ''"
                :aria-label="t('record.markFor', { code: r.code })"
                @change="setMark(r.i, $event)"
              />
              <span v-if="r.mark !== undefined" class="grade" :class="`grade-${gradeOf(r.mark).toLowerCase()}`">{{ gradeOf(r.mark) }}</span>
            </div>
            </div>
            <div class="row-actions">
              <template v-if="r.credit" />
              <!-- No mark yet (taking it now): what the final needs, from this subject's assessment. -->
              <a
                v-if="!r.credit && r.mark === undefined && !subjects[r.code]?.passFail"
                class="act act-calc"
                :href="link(`tools/final/?subject=${r.code}`)"
                :aria-label="`${t('calc.openShort')} ${r.code}`"
                :title="t('calc.open')"
              ><Calculator :size="14" aria-hidden="true" /></a>
              <span v-else-if="rated.has(r.code)" class="rated"><Check :size="14" aria-hidden="true" /> {{ t('rating.rated') }}</span>
              <button v-else class="act act-rate" type="button" @click="rating = r.code"><Star :size="14" aria-hidden="true" /> <span class="act-label">{{ t('rating.rate') }}</span></button>
              <button class="act act-remove" type="button" :aria-label="`${t('record.remove')} ${r.code}`" :title="t('record.remove')" @click="remove(r.i)">
                <Trash2 :size="15" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
    <CreditEditor v-model:credit="credit" v-model:open="creditOpen" v-model:results="results" :options="options" />
    <p v-if="results.some((x) => isFail(x))" class="fail-hint">
      {{ t('record.failHintShort') }}<InfoTip :text="t('record.failHint')" />
      <template v-if="failedTwice.length">{{ t('record.failedTwice', { codes: failedTwice.join(t('listSep')) }) }}</template>
      <a :href="link('guide/semester/#fail')">{{ t('guide.failTitle') }}</a>
    </p>
    <RatePrompt v-if="rateNext && !rating && !rated.has(rateNext)" :key="rateNext" class="rating-form" :code="rateNext" @close="rateNext = null" />
    <p v-if="thanks" class="thanks" role="status">{{ t('rating.sent') }}</p>
    <RatingForm v-if="rating" :key="rating" class="rating-form" :code="rating" @done="onRated(rating, $event)" />
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.05rem;
  font-weight: 650;
  margin-bottom: 10px;
}

/* Add: one line — search the subject, an optional mark, add. */
.add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-code {
  position: relative;
  flex: 1 1 240px;
}

.add-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  color: var(--ink-soft);
  transform: translateY(-50%);
}

.add-input {
  width: 100%;
  padding-left: 36px;
}

.add-mark {
  flex: 0 0 96px;
}

.add-term {
  flex: 0 1 190px;
  min-width: 0;
}

.add-term-select {
  width: 100%;
}

.add-mark .input {
  width: 100%;
}

.add-btn {
  flex: none;
  gap: 6px;
}

.error {
  margin: 6px 0 0;
  color: var(--stop);
  font-size: 0.875rem;
}

.empty {
  margin: 12px 0 0;
  color: var(--ink-soft);
}

.groups {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.group-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--ink-soft);
}

.group-avg {
  font-weight: 500;
  color: var(--ink-soft);
}

.rows {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  /* Semester, mark and actions line up from row to row: every select holds the same
     options, so its natural width is the same in every row. */
  grid-template-columns: minmax(0, 1fr) auto 120px minmax(140px, auto);
  grid-template-areas: 'main when mark actions';
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 16px;
  /* A thin pane of the section's glass, not a white box: shine on top, mostly see-through. */
  background: var(--glass-shine), color-mix(in srgb, var(--glass-fill) 45%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--glass-edge) 80%, transparent);
  transition: background-color 0.2s ease;
}

.row:hover {
  background-color: color-mix(in srgb, var(--glass-fill) 70%, transparent);
}

.row-fail {
  border-color: var(--bad);
}

.row-sub {
  display: contents;
}

.row-main {
  grid-area: main;
  display: grid;
  min-width: 0;
}

.when {
  grid-area: when;
  min-width: 0;
}

.when-select {
  width: 100%;
}

@media (prefers-color-scheme: dark) {
  .row {
    --accent: #ff8cc6;
  }
}

.code {
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  font-weight: 600;
}

.when-select {
  padding: 4px 8px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill-hover);
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.mark-cell {
  grid-area: mark;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mark {
  /* Wide enough for "Markah" / "Điểm" as the placeholder; no spinner eating the space. */
  width: 76px;
  padding: 6px 4px;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.mark::-webkit-inner-spin-button,
.mark::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.grade {
  min-width: 36px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.credit-chip {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
}

.grade-h1 {
  color: var(--good);
  background: var(--good-soft);
}

.grade-h2a,
.grade-h2b {
  color: var(--accent);
  background: var(--accent-soft);
}

.grade-n {
  color: var(--bad);
  background: var(--bad-soft);
}

.row-actions {
  grid-area: actions;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
}

.act,
.rated {
  white-space: nowrap;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.act-rate {
  color: var(--accent);
  background: var(--accent-soft);
}

.act-calc {
  padding: 0 8px;
  color: var(--accent);
}

.act-remove {
  padding: 0 8px;
  color: var(--ink-soft);
}

.act-remove:hover {
  color: var(--bad);
  background: var(--bad-soft);
}

.rated {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  font-size: 0.8125rem;
  color: var(--forest);
  white-space: nowrap;
}

.thanks {
  margin: 12px 0 0;
  color: var(--forest);
  font-weight: 600;
}

.rating-form {
  margin-top: 14px;
}

.fail-hint {
  margin-top: 10px;
  padding: 10px 12px;
  font-size: 0.875rem;
  color: var(--ink);
  background: var(--bad-soft);
  border-radius: var(--radius-sm);
}

.fail-hint a {
  color: var(--bad);
}

/* Phones: name across the top; semester, mark and actions on the line under it. */
@media (max-width: 560px) {
  /* Phones: name with its actions on top; semester and mark on the line under it. */
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'main actions'
      'sub sub';
    row-gap: 8px;
  }

  .row-sub {
    grid-area: sub;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .when {
    flex: 1 0 auto;
  }

  .row-actions {
    align-self: start;
  }

  /* Just the star on a phone; the button keeps its name for screen readers. */
  .act-rate .act-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .act-rate {
    padding: 0 10px;
  }

  .add-btn {
    flex: 1 1 auto;
    justify-content: center;
  }

  .add-mark {
    flex: 1 1 96px;
  }

  .add-term {
    flex: 2 1 160px;
  }
}

@media (pointer: coarse) {
  .act {
    min-height: 40px;
  }
}
.pf-seg {
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.pf-seg button {
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.pf-seg button[aria-pressed='true'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

/* Light glass: a deeper green keeps the badge at AA. */
@media (prefers-color-scheme: light) {
  .grade-h1 {
    color: #146c3e;
  }
}
</style>
