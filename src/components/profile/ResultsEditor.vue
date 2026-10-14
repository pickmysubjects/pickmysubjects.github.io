<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { Check, Plus, Search, Star, Trash2 } from 'lucide-vue-next'
import { PASS_MARK, type Period, type Profile, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import { termsBetween } from '@/utils/pastTerms'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { link } from '@/composables/useView'
import RatingForm from '@/components/rating/RatingForm.vue'
import { useRated } from '@/composables/useRated'

const results = defineModel<Profile['results']>({ required: true })
const props = defineProps<{ subjects: Record<string, Subject>; options: { code: string; title: string }[] }>()

const listId = useId()
const { t, locale } = useI18n()
const { rated, markRated } = useRated()
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
const error = shallowRef('')

function add(): void {
  const c = code.value.trim().split(/\s/)[0]?.toUpperCase() ?? ''
  if (!/^[A-Z]{4}\d{5}$/.test(c)) {
    error.value = t.value('record.badCode')
    return
  }
  if (results.value.some((r) => r.code === c)) {
    error.value = t.value('record.duplicate', { code: c })
    return
  }
  // Pass/fail subjects have no mark to keep.
  const m = mark.value === '' || props.subjects[c]?.passFail ? undefined : Number(mark.value)
  results.value = [...results.value, { code: c, mark: m }]
  code.value = ''
  mark.value = ''
  error.value = ''
}

function setMark(c: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const m = input.value === '' ? undefined : Math.max(0, Math.min(100, Number(input.value)))
  // Keep whatever else the row holds (the semester it was taken).
  results.value = results.value.map((r) => (r.code === c ? { ...r, mark: m } : r))
  // If the stored mark didn't change (e.g. 100 → 150 → 100), Vue won't repaint the box.
  input.value = m === undefined ? '' : String(m)
}

// When it was taken: the semesters of the plan, from the start of study to its last semester
// (and any semester already on the record), so the two pages use the same years.
const plan = usePlan()
const TERMS = computed(() => {
  const order = (x: { year: number; period: Period }) => x.year * 10 + ['summer', 'semester-1', 'winter', 'semester-2'].indexOf(x.period)
  const known = [
    { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod },
    ...plan.terms.value,
    ...results.value.filter((r): r is typeof r & { year: number; period: Period } => r.year !== undefined && r.period !== undefined),
  ]
  const first = known.reduce((a, b) => (order(b) < order(a) ? b : a))
  const last = known.reduce((a, b) => (order(b) > order(a) ? b : a))
  // At least three years from the start, so a fresh setup still has semesters to pick.
  const floor = { year: first.year + 2, period: 'semester-2' as Period }
  return termsBetween(first, order(last) > order(floor) ? last : floor)
})
const termValue = (r: Profile['results'][number]) => (r.year && r.period ? `${r.year}|${r.period}` : '')
function setTerm(c: string, event: Event): void {
  const [y, p] = (event.target as HTMLSelectElement).value.split('|')
  results.value = results.value.map((r) => {
    if (r.code !== c) return r
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
  const by = new Map<string, Profile['results']>()
  for (const r of results.value) {
    const key = r.year && r.period ? `${r.year}|${r.period}` : ''
    by.set(key, [...(by.get(key) ?? []), r])
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

function remove(c: string): void {
  results.value = results.value.filter((r) => r.code !== c)
}

</script>

<template>
  <section class="results" aria-labelledby="results-title">
    <h2 id="results-title" class="section-title">{{ t('record.completed') }}</h2>
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
          <li v-for="r in g.rows" :key="r.code" class="row" :class="{ 'row-fail': r.mark !== undefined && r.mark < PASS_MARK }">
            <div class="row-main">
              <span class="code">{{ r.code }}</span>
              <span class="title">{{ titleOf(r.code) }}</span>
            </div>
            <label class="when">
              <span class="visually-hidden">{{ t('record.termFor', { code: r.code }) }}</span>
              <select class="when-select" :value="termValue(r)" @change="setTerm(r.code, $event)">
                <option value="">{{ t('record.termUnknown') }}</option>
                <option v-for="x in TERMS" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
              </select>
            </label>
            <div v-if="subjects[r.code]?.passFail" class="mark-cell">
              <span class="pf" :title="t('record.passFailHint')">{{ t('record.passFail') }}</span>
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
                @change="setMark(r.code, $event)"
              />
              <span v-if="r.mark !== undefined" class="grade" :class="`grade-${gradeOf(r.mark).toLowerCase()}`">{{ gradeOf(r.mark) }}</span>
            </div>
            <div class="row-actions">
              <span v-if="rated.has(r.code)" class="rated"><Check :size="14" aria-hidden="true" /> {{ t('rating.rated') }}</span>
              <button v-else class="act act-rate" type="button" @click="rating = r.code"><Star :size="14" aria-hidden="true" /> <span class="act-label">{{ t('rating.rate') }}</span></button>
              <button class="act act-remove" type="button" :aria-label="`${t('record.remove')} ${r.code}`" :title="t('record.remove')" @click="remove(r.code)">
                <Trash2 :size="15" aria-hidden="true" />
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
    <p v-if="results.some((x) => x.mark !== undefined && x.mark < PASS_MARK)" class="fail-hint">
      {{ t('record.failHint') }}
      <a :href="link('guide')">{{ t('guide.failTitle') }}</a>
    </p>
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
  color: var(--ink-faint);
  transform: translateY(-50%);
}

.add-input {
  width: 100%;
  padding-left: 36px;
}

.add-mark {
  flex: 0 0 96px;
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
  color: var(--ink-faint);
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
  /* Fixed columns so semester, mark and actions line up from row to row. */
  grid-template-columns: minmax(0, 1fr) 150px 112px minmax(140px, auto);
  grid-template-areas: 'main when mark actions';
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 14px;
  background: var(--glass-fill);
}

.row-fail {
  border-color: var(--bad);
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

.code {
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
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
  width: 64px;
  padding: 6px 8px;
  text-align: center;
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

.act-remove {
  padding: 0 8px;
  color: var(--ink-faint);
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
      'when mark';
    row-gap: 8px;
  }

  .row-actions {
    align-self: start;
  }

  .title {
    white-space: normal;
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
}

@media (pointer: coarse) {
  .act {
    min-height: 40px;
  }
}
.pf {
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
}
</style>
