<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { useWamCalc } from '@/composables/useWamCalc'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { gradeOf } from '@/utils/wamGoal'

/**
 * The WAM calculator. It reads My record (marks, target WAM) and keeps no copy of it: subjects
 * typed here are what-ifs on top of the record, gone when the page closes, unless the record is
 * empty and the student saves them. The target WAM is the record's own.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const calc = useWamCalc()
const { rows, recordCount, fromRecord, recordWam, wam, left, target, need } = calc

const subjectOf = (code: string) => data.value.subjects[code]
const nameOf = (code: string) => {
  const s = subjectOf(code)
  return s ? localTitle(s, locale.value) || s.title : code
}
const numberOf = (e: Event): number | '' => {
  const raw = (e.target as HTMLInputElement).value
  const n = Number(raw)
  return raw === '' || !Number.isFinite(n) ? '' : n
}
// Target edits go to the record; a short "saved" line says so.
const targetSaved = shallowRef(false)
function onTarget(e: Event): void {
  calc.setTarget(numberOf(e))
  targetSaved.value = true
}
const typed = computed(() => rows.value.some((r) => r.mark !== ''))
const justSaved = shallowRef(false)
function save(): void {
  calc.save()
  justSaved.value = true
}
const verdict = computed(() => {
  const n = need.value
  if (target.value === null || wam.value === null) return ''
  if (n === null) return t.value('wamGoal.nothingLeft')
  if (n > 100) return t.value('wamGoal.outOfReach')
  if (n <= 50) return t.value('wamGoal.justPass')
  return ''
})
</script>

<template>
  <div class="wamcalc">
    <section class="surface wc-input" aria-labelledby="wc-rows">
      <p v-if="fromRecord" class="wc-source">
        <span>{{ t('wamCalc.fromRecord', { n: recordCount, wam: recordWam ?? '' }) }}</span>
        <a class="wc-edit" :href="link('record#sec-results')">{{ t('wamCalc.edit') }}</a>
      </p>
      <div class="wc-head">
        <h2 id="wc-rows" class="sec-title">{{ fromRecord ? t('wamCalc.whatIf') : t('wamCalc.yourMarks') }}</h2>
        <span v-if="fromRecord" class="wc-note">{{ t('wamCalc.whatIfNote') }}</span>
      </div>

      <ul v-if="rows.length" class="wc-rows">
        <li v-for="(r, i) in rows" :key="`${r.code}-${i}`" class="wc-row">
          <span class="wc-subject">
            <span class="code">{{ r.code }}</span>
            <span class="wc-name">{{ nameOf(r.code) }}</span>
            <span v-if="subjectOf(r.code)?.passFail" class="wc-pf">{{ t('wamCalc.pf') }}</span>
          </span>
          <label class="wc-mark">
            <span class="visually-hidden">{{ t('wamCalc.mark') }}</span>
            <input class="input" type="number" inputmode="decimal" min="0" max="100" :placeholder="t('wamCalc.mark')" :value="r.mark" :disabled="subjectOf(r.code)?.passFail" @input="calc.setMark(i, numberOf($event))" />
          </label>
          <button type="button" class="button button-quiet wc-remove" @click="calc.remove(i)">{{ t('calc.remove') }}</button>
        </li>
      </ul>
      <label class="wc-add">
        <span class="wc-label">{{ t('wamCalc.add') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="calc.add" />
      </label>
      <p v-if="!fromRecord && typed" class="wc-save">
        <button type="button" class="button button-quiet" @click="save">{{ t('wamCalc.save') }}</button>
      </p>
      <p v-if="justSaved && fromRecord" class="wc-note" role="status">{{ t('wamCalc.saved') }}</p>
    </section>

    <section class="surface wc-answer" aria-labelledby="wc-answer" aria-live="polite">
      <h2 id="wc-answer" class="visually-hidden">WAM</h2>
      <div class="wc-big">
        <span class="wc-label">{{ typed ? t('wamCalc.wamWith') : t('wamCalc.wamNow') }}</span>
        <span v-if="wam !== null" class="wc-num">{{ wam }}<small> {{ gradeOf(wam) }}</small></span>
        <span v-else class="wc-note">{{ t('wamCalc.empty') }}</span>
      </div>
      <label class="wc-target">
        <span class="wc-label">{{ t('wamGoal.target') }}</span>
        <input class="input" type="number" inputmode="decimal" min="0" max="100" step="1" :value="target ?? ''" @change="onTarget" />
      </label>
      <p v-if="targetSaved" class="wc-note" role="status">{{ t('wamCalc.saved') }}</p>
      <div v-if="need !== null && need > 50 && need <= 100" class="wc-need">
        <span class="wc-label">{{ t('wamGoal.needLabel') }}</span>
        <span class="wc-num wc-num-sm">{{ need }}<small> {{ gradeOf(need) }}</small></span>
        <span class="wc-note">{{ t('wamGoal.needOn', { n: left / 12.5 }) }}</span>
      </div>
      <p v-else-if="verdict" class="wc-verdict">{{ verdict }}</p>
      <p class="wc-note">{{ t('wamGoal.note') }}</p>
    </section>
  </div>
</template>

<style scoped>
.wamcalc {
  display: grid;
  gap: var(--space-4);
}

.wc-input,
.wc-answer {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-5);
}

.wc-source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--space-3);
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  font-weight: var(--fw-semibold);
}

.wc-edit {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.wc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px var(--space-3);
}

.wc-head .sec-title {
  margin: 0;
}

.wc-note,
.wc-label {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.wc-rows {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.wc-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 7em auto;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--divider);
}

.wc-subject {
  display: grid;
  min-width: 0;
}

.wc-subject .code {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.wc-name {
  font-weight: var(--fw-semibold);
  overflow-wrap: anywhere;
}

.wc-pf {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.wc-mark .input,
.wc-target .input {
  width: 100%;
}

.wc-remove {
  color: var(--ink-soft);
}

.wc-remove:hover {
  color: var(--bad);
}

.wc-add,
.wc-target {
  display: grid;
  gap: 6px;
}

.wc-save {
  margin: 0;
}

.wc-big,
.wc-need {
  display: grid;
  gap: 2px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--accent-soft);
}

.wc-need {
  background: var(--surface-2);
}

.wc-num {
  font-size: clamp(2.5rem, 2rem + 1.8vw, 3.25rem);
  font-weight: var(--fw-bold);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.wc-num-sm {
  font-size: clamp(1.75rem, 1.5rem + 1vw, 2.25rem);
}

.wc-num small {
  margin-left: 0.3em;
  font-size: 0.45em;
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.wc-verdict {
  margin: 0;
  font-weight: var(--fw-semibold);
}

.wc-target .input {
  max-width: 10em;
}

/* Wide screens: the subjects on the left, the answer beside them and in view while typing. */
@media (min-width: 1024px) {
  .wamcalc {
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
    align-items: start;
  }

  .wc-answer {
    position: sticky;
    top: 96px;
  }
}

@media (max-width: 640px) {
  .wc-input,
  .wc-answer {
    padding: var(--space-4);
  }

  .wc-row {
    grid-template-columns: minmax(0, 1fr) 6em;
    grid-template-areas: 'subject subject' 'mark x';
  }

  .wc-subject { grid-area: subject; }
  .wc-mark { grid-area: mark; }
  .wc-remove { grid-area: x; justify-self: end; }
}
</style>
