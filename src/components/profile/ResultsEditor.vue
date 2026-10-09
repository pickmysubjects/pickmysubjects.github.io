<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { PASS_MARK, type Period, type Profile, type Subject } from '@/engine'
import { termLabel } from '@/i18n/format'
import { recentTerms } from '@/utils/pastTerms'
import { useI18n } from '@/i18n'
import { link } from '@/composables/useView'
import RatingForm from '@/components/rating/RatingForm.vue'
import { useRated } from '@/composables/useRated'

const results = defineModel<Profile['results']>({ required: true })
defineProps<{ subjects: Record<string, Subject>; options: { code: string; title: string }[] }>()

const listId = useId()
const { t } = useI18n()
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
  const m = mark.value === '' ? undefined : Number(mark.value)
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

// When it was taken: optional, only used to show it in its semester on the plan board.
const TERMS = recentTerms()
const termValue = (r: Profile['results'][number]) => (r.year && r.period ? `${r.year}|${r.period}` : '')
function setTerm(c: string, event: Event): void {
  const [y, p] = (event.target as HTMLSelectElement).value.split('|')
  results.value = results.value.map((r) => {
    if (r.code !== c) return r
    const { year: _y, period: _p, ...rest } = r
    return y && p ? { ...rest, year: Number(y), period: p as Period } : rest
  })
}

function remove(c: string): void {
  results.value = results.value.filter((r) => r.code !== c)
}

</script>

<template>
  <section class="results" aria-labelledby="results-title">
    <h2 id="results-title" class="section-title">{{ t('record.completed') }}</h2>
    <form class="add" @submit.prevent="add">
      <label class="field add-code">
        {{ t('record.subject') }}
        <input v-model="code" class="input" :list="listId" :placeholder="t('record.subjectPlaceholder')" />
        <datalist :id="listId">
          <option v-for="o in options" :key="o.code" :value="`${o.code} ${o.title}`" />
        </datalist>
      </label>
      <label class="field add-mark">
        {{ t('record.mark') }}
        <input v-model="mark" class="input" type="number" min="0" max="100" :placeholder="t('record.markPlaceholder')" />
      </label>
      <button class="button" type="submit">{{ t('record.add') }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="results.length === 0" class="empty">{{ t('record.empty', { pass: PASS_MARK }) }}</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th scope="col">{{ t('record.colSubject') }}</th>
          <th scope="col">{{ t('record.colMark') }}</th>
          <th scope="col"><span class="visually-hidden">{{ t('record.colActions') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in results" :key="r.code">
          <td>
            <span class="code">{{ r.code }}</span>
            <span class="title">{{ subjects[r.code]?.title ?? t('record.notInDataset') }}</span>
            <label class="when">
              <span class="visually-hidden">{{ t('record.termFor', { code: r.code }) }}</span>
              <select class="when-select" :value="termValue(r)" @change="setTerm(r.code, $event)">
                <option value="">{{ t('record.termUnknown') }}</option>
                <option v-for="x in TERMS" :key="`${x.year}|${x.period}`" :value="`${x.year}|${x.period}`">{{ termLabel(t, x) }}</option>
              </select>
            </label>
          </td>
          <td>
            <input
              class="input mark"
              type="number"
              min="0"
              max="100"
              :value="r.mark ?? ''"
              :aria-label="t('record.markFor', { code: r.code })"
              @change="setMark(r.code, $event)"
            />
            <span v-if="r.mark !== undefined && r.mark < PASS_MARK" class="fail">{{ t('record.fail') }}</span>
          </td>
          <td class="row-actions">
            <span v-if="rated.has(r.code)" class="rated">{{ t('rating.rated') }}</span>
            <button v-else class="button button-quiet" type="button" @click="rating = r.code">{{ t('rating.rate') }}</button>
            <button class="button button-quiet" type="button" @click="remove(r.code)">{{ t('record.remove') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
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

.add {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
}

.add-code {
  flex: 1 1 260px;
}

.add-mark {
  flex: 0 1 140px;
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

.table {
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.table th {
  padding: 6px 8px;
  border-bottom: 1px solid var(--contour);
  font-size: 0.75rem;
  text-align: left;
  color: var(--ink-soft);
}

.table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--contour);
  vertical-align: middle;
}

.title {
  margin-left: 8px;
  color: var(--ink-soft);
}

.mark {
  width: 80px;
}

.when {
  display: block;
  margin-top: 4px;
}

.when-select {
  max-width: 100%;
  padding: 2px 4px;
  border: 0;
  border-bottom: 1px dashed var(--line);
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.row-actions .button {
  padding: 5px 10px;
  font-size: 0.875rem;
  white-space: nowrap;
}

.rated {
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

.fail {
  margin-left: 8px;
  white-space: nowrap;
  color: var(--stop);
  font-size: 0.8125rem;
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
</style>
