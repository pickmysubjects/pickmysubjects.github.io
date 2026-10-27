<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { Lock, Plus, RotateCcw, TriangleAlert, X } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useFinalCalc, type CalcRow } from '@/composables/useFinalCalc'
import { link, replaceAddress } from '@/composables/useView'
import { ASSESSMENT_KINDS } from '@/engine/schema'
import { finalBand, finalNeeds, partsFromAssessment, percentOf, type CalcPart } from '@/engine/finalCalc'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { attendanceText } from '@/utils/attendance'
import { gradeOf } from '@/utils/wamGoal'

/** "What do I need on the final?" for any subject: the Handbook's parts, editable, plus the student's marks. */
const props = defineProps<{ code: string }>()
const { t, locale } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()
const saved = useFinalCalc()

const subject = computed(() => (props.code ? data.value.subjects[props.code] : undefined))
const handbookRows = computed<CalcRow[]>(() => partsFromAssessment(subject.value?.assessment).map((p) => ({ ...p, score: '', outOf: '' })))
const entry = computed(() => (props.code ? saved.value[props.code] : undefined))
const rows = computed<CalcRow[]>(() => entry.value?.rows ?? handbookRows.value)
const custom = computed(() => entry.value?.custom === true)

// Custom while the parts differ from the Handbook's (changing a weight back undoes it).
const sameParts = (a: readonly CalcRow[], b: readonly CalcRow[]) =>
  a.length === b.length && a.every((r, i) => r.kind === b[i]!.kind && r.weight === b[i]!.weight && !!r.hurdle === !!b[i]!.hurdle)
function save(next: CalcRow[]): void {
  if (!props.code) return
  saved.value = { ...saved.value, [props.code]: { rows: next, ...(sameParts(next, handbookRows.value) ? {} : { custom: true }) } }
}
function setField(i: number, field: keyof CalcRow, value: unknown): void {
  save(rows.value.map((r, j) => (j === i ? { ...r, [field]: value } : r)))
}
// A weight cleared to type a new one stays empty while editing: nothing is saved until there's a
// number, and leaving it empty puts the old weight back.
function setWeight(i: number, e: Event): void {
  const n = numberOf(e)
  if (n === '' || n === rows.value[i]?.weight) return
  setField(i, 'weight', Math.min(100, n))
}
function weightDone(i: number, e: Event): void {
  const el = e.target as HTMLInputElement
  if (el.value === '' || !Number.isFinite(Number(el.value))) el.value = String(rows.value[i]?.weight ?? '')
}
// A negative mark is kept as typed so it shows as wrong instead of quietly counting as "not done".
const numberOf = (e: Event, allowNegative = false): number | '' => {
  const raw = (e.target as HTMLInputElement).value
  const n = Number(raw)
  return raw === '' || !Number.isFinite(n) || (n < 0 && !allowNegative) ? '' : n
}
function addRow(): void {
  save([...rows.value, { kind: 'assignment', weight: 0, score: '', outOf: '' }])
}
function removeRow(i: number): void {
  save(rows.value.filter((_, j) => j !== i))
}
function reset(): void {
  // Back to the Handbook's list, keeping marks typed for parts still in the same place.
  const now = rows.value
  const next = handbookRows.value.map((r, i) => (now[i]?.kind === r.kind ? { ...r, score: now[i]!.score, outOf: now[i]!.outOf } : r))
  saved.value = { ...saved.value, [props.code]: { rows: next } }
}

const parts = computed<CalcPart[]>(() =>
  rows.value.map((r) => {
    const pct = r.score === '' ? null : percentOf(r.score, r.outOf === '' ? 100 : r.outOf)
    return { kind: r.kind, weight: r.weight, ...(r.hurdle ? { hurdle: true } : {}), ...(pct !== null ? { score: pct } : {}) }
  }),
)
const badScore = (r: CalcRow) => r.score !== '' && percentOf(r.score, r.outOf === '' ? 100 : r.outOf) === null
const result = computed(() => finalNeeds(parts.value))
// A pass/fail subject has only one grade worth aiming for.
const shownBands = computed(() => (subject.value?.passFail ? result.value?.bands.filter((b) => b.band === 'P') : result.value?.bands) ?? [])
const weightsOff = computed(() => result.value && Math.abs(result.value.totalWeight - 100) > 0.01)
const anyDone = computed(() => (result.value?.doneWeight ?? 0) > 0)
const allDone = computed(() => result.value !== null && result.value.leftWeight <= 0)
const recordMark = computed(() => profile.value.results.filter((r) => r.code === props.code && r.mark !== undefined).at(-1)?.mark)
const kindName = (k: string) => t.value(`assess.kind.${k}`)

// What each marked part adds to the total, so a mark typed without its "out of" (24 meant as
// 24/30 but read as 24/100) shows up as a small contribution right away.
const contribution = (r: CalcRow) => {
  const pct = r.score === '' ? null : percentOf(r.score, r.outOf === '' ? 100 : r.outOf)
  if (pct === null || !r.weight) return null
  return { got: Math.round(((pct * r.weight) / 100) * 10) / 10, weight: r.weight }
}

// Phones: while the result is out of view (typing marks above it), a slim bar keeps it in sight.
const resultEl = useTemplateRef<HTMLElement>('resultEl')
const resultHidden = shallowRef(false)
let io: IntersectionObserver | null = null
watch(resultEl, (el) => {
  io?.disconnect()
  if (!el || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(([e]) => {
    // Only while it's below the screen: once scrolled past, the student has seen it.
    resultHidden.value = !!e && !e.isIntersecting && e.boundingClientRect.top > 0
  })
  io.observe(el)
})
onBeforeUnmount(() => io?.disconnect())

function pick(code: string): void {
  replaceAddress(`tools/final/?subject=${code}`)
}
</script>

<template>
  <div class="calc">
    <section class="calc-pick surface">
      <div v-if="subject" class="calc-subject">
        <div>
          <p class="calc-code code">{{ subject.code }}</p>
          <p class="calc-name">{{ localTitle(subject, locale) || subject.title }}</p>
        </div>
        <a class="button button-quiet" :href="link(`subject/${subject.code}`)">{{ t('calc.subjectPage') }}</a>
      </div>
      <label class="calc-search">
        <span class="calc-label">{{ subject ? t('calc.change') : t('calc.pick') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="pick" />
      </label>
    </section>

    <p v-if="code && !subject" class="calc-note warn" role="status">{{ t('calc.unknown', { code }) }}</p>
    <template v-if="subject">
      <p v-if="subject.passFail" class="calc-note chip">{{ t('calc.passFail') }}</p>
      <p v-if="recordMark !== undefined" class="calc-note">{{ t('calc.fromRecord', { mark: recordMark, band: gradeOf(recordMark) }) }}</p>

      <div class="calc-work">
      <section class="surface calc-parts" aria-labelledby="calc-parts">
        <div class="calc-head">
          <h2 id="calc-parts" class="sec-title">{{ t('calc.parts') }}</h2>
          <button v-if="custom && handbookRows.length" type="button" class="button button-quiet" @click="reset">
            <RotateCcw :size="15" aria-hidden="true" /> {{ t('calc.reset') }}
          </button>
        </div>
        <p class="calc-hint">{{ handbookRows.length ? t('calc.fromHandbook') : t('calc.noData') }}</p>

        <ul v-if="rows.length" class="rows">
          <li v-for="(r, i) in rows" :key="i" class="row">
            <label class="f f-kind">
              <span class="visually-hidden">{{ t('calc.part') }}</span>
              <select class="input" :value="r.kind" @change="setField(i, 'kind', ($event.target as HTMLSelectElement).value)">
                <option v-for="k in ASSESSMENT_KINDS" :key="k" :value="k">{{ kindName(k) }}</option>
              </select>
            </label>
            <label class="f f-weight">
              <span class="f-label">{{ t('calc.weight') }}</span>
              <input class="input" type="number" inputmode="decimal" min="0" max="100" :value="r.weight" @input="setWeight(i, $event)" @change="weightDone(i, $event)" />
            </label>
            <label class="f f-score">
              <span class="f-label">{{ t('calc.score') }} / {{ t('calc.outOf') }}</span>
              <span class="score">
                <input class="input" :class="{ bad: badScore(r) }" type="number" inputmode="decimal" min="0" :placeholder="t('calc.notDone')" :value="r.score" @input="setField(i, 'score', numberOf($event, true))" />
                <span class="slash" aria-hidden="true">/</span>
                <input class="input" type="number" inputmode="decimal" min="1" placeholder="100" :aria-label="t('calc.outOf')" :value="r.outOf" @input="setField(i, 'outOf', numberOf($event))" />
              </span>
              <span v-if="contribution(r)" class="f-counts">{{ t('calc.counts', contribution(r)!) }}</span>
            </label>
            <label class="f f-hurdle">
              <input type="checkbox" :checked="!!r.hurdle" @change="setField(i, 'hurdle', ($event.target as HTMLInputElement).checked)" />
              <span>{{ t('calc.hurdle') }}</span>
            </label>
            <button type="button" class="icon-btn" :aria-label="t('calc.remove')" :title="t('calc.remove')" @click="removeRow(i)"><X :size="16" /></button>
          </li>
        </ul>
        <div class="calc-foot">
          <button type="button" class="button button-quiet" @click="addRow"><Plus :size="15" aria-hidden="true" /> {{ t('calc.add') }}</button>
          <span class="calc-privacy"><Lock :size="13" aria-hidden="true" /> {{ t('calc.privacy') }}<InfoTip :text="t('calc.privacyInfo')" /></span>
        </div>
        <p v-if="weightsOff && result" class="calc-hint warn">{{ t('calc.weightsOff', { n: result.totalWeight }) }}</p>
      </section>

      <section v-if="result" ref="resultEl" class="surface calc-result" aria-labelledby="calc-result" aria-live="polite">
        <h2 id="calc-result" class="sec-title">{{ allDone ? t('calc.resultAll') : t('calc.resultTitle') }}</h2>
        <p v-if="allDone && result.mark !== null" class="final">
          <template v-if="finalBand(result, subject.passFail === true) === 'NH'">{{ t('calc.finalMarkNH', { mark: result.mark }) }}<InfoTip :text="t('calc.hurdleInfo')" /></template>
          <template v-else>{{ t('calc.finalMark', { mark: result.mark, band: finalBand(result, subject.passFail === true) }) }}</template>
        </p>
        <ul v-else class="bands">
          <li v-for="b in shownBands" :key="b.band" class="band" :class="`s-${b.status}`">
            <span class="band-name">{{ b.band }} <small>{{ b.target }}+</small></span>
            <strong class="band-need">{{ b.status === 'possible' ? `${b.needed}%` : b.status === 'secured' ? t('calc.secured') : t('calc.impossible') }}</strong>
          </li>
        </ul>
        <p v-for="(h, i) in allDone ? [] : result.hurdlesMissed" :key="`m${i}`" class="hurdle hurdle-missed" role="alert">
          <TriangleAlert :size="15" aria-hidden="true" />
          <span>{{ t('calc.hurdleUnder', { part: kindName(h.kind) }) }}<InfoTip :text="t('calc.hurdleInfo')" /></span>
        </p>
        <p v-if="!allDone" class="maths">{{ t('calc.maths', { earned: result.earned, left: Math.round(result.leftWeight * (100 / result.totalWeight) * 10) / 10 }) }}<InfoTip v-if="result.roundingMatters" :text="t('calc.roundInfo')" /></p>
        <p v-if="!anyDone" class="calc-hint">{{ t('calc.nothingDone') }}</p>

        <div v-if="result.hurdlesLeft.length || subject.minAttendance" class="hurdles">
          <p v-for="(h, i) in result.hurdlesLeft" :key="i" class="hurdle">
            <TriangleAlert :size="15" aria-hidden="true" />
            <span>{{ t('calc.hurdleLeft', { part: kindName(h.kind) }) }} {{ t('calc.hurdleMark') }}<InfoTip :text="t('calc.hurdleInfo')" /></span>
          </p>
          <p v-if="subject.minAttendance" class="hurdle">
            <TriangleAlert :size="15" aria-hidden="true" />
            <span>{{ t('calc.attendAlso', { what: attendanceText(t, subject.minAttendance, subject.attendanceAppliesTo) }) }}</span>
          </p>
        </div>
      </section>
      </div>

      <Teleport to="body">
        <a v-if="result && resultHidden" class="calc-dock" href="#calc-result" @click.prevent="resultEl?.scrollIntoView({ block: 'start', behavior: 'smooth' })">
          <template v-if="allDone && result.mark !== null">
            <span class="dock-final">{{ result.mark }} · {{ finalBand(result, subject.passFail === true) }}</span>
          </template>
          <template v-else>
            <span v-for="b in shownBands" :key="b.band" class="dock-band" :class="`s-${b.status}`">
              <span class="dock-band-name">{{ b.band }}</span>
              <strong>{{ b.status === 'possible' ? `${b.needed}%` : b.status === 'secured' ? '✓' : '–' }}</strong>
            </span>
          </template>
        </a>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.calc {
  display: grid;
  gap: var(--space-4);
}

.calc-pick,
.calc-parts,
.calc-result {
  padding: var(--space-5);
}

.calc-pick {
  display: grid;
  gap: var(--space-3);
}

.calc-subject {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.calc-code {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.calc-name {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}

.calc-search {
  display: grid;
  gap: 6px;
}

.calc-label,
.f-label {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.calc-note {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  justify-self: start;
}

.calc-parts,
.calc-result {
  display: grid;
  gap: var(--space-3);
}

.calc-head,
.calc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.calc-hint {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.warn {
  color: var(--warn);
}

.rows {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 6.5em minmax(0, 1.5fr) auto auto;
  /* Top-aligned, so a "counts 7/10" line under a mark doesn't push the row's other fields down;
     the controls without a label line up with the inputs below the labels. */
  align-items: start;
  gap: var(--space-2) var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--divider);
}

.f {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.f .input {
  width: 100%;
  min-width: 0;
}

.score {
  display: flex;
  align-items: center;
  gap: 6px;
}

.score .input:last-child {
  max-width: 5.5em;
}

.slash {
  color: var(--ink-faint);
}

.bad {
  border-color: var(--bad);
}

.f-hurdle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: var(--control-h);
  font-size: var(--fs-small);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: var(--control-h);
  height: var(--control-h);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--surface-2);
  color: var(--bad);
}

.calc-privacy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.bands {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.band {
  display: grid;
  gap: 4px;
  padding: var(--space-3);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.band-name {
  font-weight: var(--fw-semibold);
}

.band-name small {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

.band-need {
  font-size: var(--fs-h3);
}

.s-secured {
  background: var(--good-soft);
  color: var(--good);
}

.s-impossible {
  background: var(--bad-soft);
  color: var(--bad);
}

.s-impossible .band-need,
.s-secured .band-need {
  font-size: var(--fs-small);
}

.final {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}

.maths {
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.hurdles {
  display: grid;
  gap: var(--space-2);
}

.hurdle {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--warn-soft);
  color: var(--warn);
  font-size: var(--fs-small);
}

.hurdle svg {
  flex: none;
  margin-top: 3px;
}

.f-counts {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

/* Labels on one fixed line height, so the unlabelled controls can line up with the inputs. */
.f-label {
  line-height: 20px;
}

@media (min-width: 641px) {
  .f-kind {
    margin-top: 24px;
  }

  .f-hurdle,
  .icon-btn {
    margin-top: calc(24px + (var(--control-h) - 44px) / 2);
  }
}

/* Wide screens: the result sits beside the parts and stays in view while marks are typed. */
@media (min-width: 1024px) {
  .calc-work {
    display: grid;
    grid-template-columns: minmax(0, 1.75fr) minmax(300px, 1fr);
    align-items: start;
    gap: var(--space-4);
  }

  .calc-result {
    position: sticky;
    top: 96px;
  }

  .bands {
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  }
}

@media (max-width: 1023px) {
  .calc-work {
    display: grid;
    gap: var(--space-4);
  }
}

.calc-dock {
  display: none;
}

@media (max-width: 720px) {
  .calc-dock {
    position: fixed;
    inset: auto 12px calc(88px + env(safe-area-inset-bottom)) 12px;
    z-index: 40;
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: 4px;
    min-height: 48px;
    padding: 6px 10px;
    border: 1px solid var(--glass-edge);
    border-radius: 999px;
    background: var(--glass-shine), var(--float-fill);
    -webkit-backdrop-filter: var(--float-blur);
    backdrop-filter: var(--float-blur);
    box-shadow: var(--float-rim), var(--float-shadow);
    color: var(--ink);
    text-decoration: none;
    font-size: var(--fs-small);
  }

  .dock-band {
    display: grid;
    justify-items: center;
    line-height: 1.2;
    padding: 0 4px;
    border-radius: var(--radius-sm);
    background: none;
  }

  .dock-band-name {
    font-size: var(--fs-meta);
    color: var(--ink-soft);
  }

  .dock-final {
    font-weight: var(--fw-semibold);
  }
}

@media (max-width: 640px) {
  .calc-pick,
  .calc-parts,
  .calc-result {
    padding: var(--space-4);
  }

  .row {
    grid-template-columns: 5.5em minmax(0, 1fr) auto;
    grid-template-areas: 'kind kind x' 'weight score score' 'hurdle hurdle hurdle';
  }

  .f-kind { grid-area: kind; }
  .f-weight { grid-area: weight; }
  .f-score { grid-area: score; }
  .f-hurdle { grid-area: hurdle; }
  .icon-btn { grid-area: x; }

  .bands {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  }
}
</style>
