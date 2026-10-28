<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { Lock, Plus, RotateCcw, TriangleAlert } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useFinalCalc, type CalcRow } from '@/composables/useFinalCalc'
import { usePlan } from '@/composables/usePlan'
import { link, replaceAddress } from '@/composables/useView'
import { ASSESSMENT_KINDS } from '@/engine/schema'
import { finalBand, finalNeeds, handbookChanged, partsFromAssessment, percentOf, sameCalcParts, type CalcPart } from '@/engine/finalCalc'
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
const { plannedCodes } = usePlan()
// Subjects on the plan without a mark on the record yet: one tap picks one.
const fromPlan = computed(() => {
  const marked = new Set(profile.value.results.filter((r) => r.mark !== undefined || r.credit).map((r) => r.code))
  return [...new Set(plannedCodes.value)].filter((c) => c !== props.code && !marked.has(c) && data.value.subjects[c]).slice(0, 8)
})

const subject = computed(() => (props.code ? data.value.subjects[props.code] : undefined))
const handbookRows = computed<CalcRow[]>(() => partsFromAssessment(subject.value?.assessment).map((p) => ({ ...p, score: '', outOf: '' })))
const entry = computed(() => (props.code ? saved.value[props.code] : undefined))
const rows = computed<CalcRow[]>(() => entry.value?.rows ?? handbookRows.value)
const custom = computed(() => entry.value?.custom === true)

// Saved before the Handbook's parts changed: offer its new list (Reset), saying why.
const changed = computed(() => handbookChanged(entry.value, handbookRows.value))
// Custom while the parts differ from the Handbook's (changing a weight back undoes it).
function save(next: CalcRow[]): void {
  if (!props.code) return
  saved.value = { ...saved.value, [props.code]: { rows: next, ...(sameCalcParts(next, handbookRows.value) ? {} : { custom: true }) } }
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
// How the answer is worked out, behind the result's ⓘ.
const mathsText = computed(() => {
  const r = result.value
  if (!r) return ''
  const maths = t.value('calc.maths', { earned: r.earned, left: Math.round(r.leftWeight * (100 / r.totalWeight) * 10) / 10 })
  return r.roundingMatters ? `${maths} ${t.value('calc.roundInfo')}` : maths
})

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
        <p class="calc-code code">{{ subject.code }}</p>
        <p class="calc-name">{{ localTitle(subject, locale) || subject.title }}</p>
        <a class="calc-link" :href="link(`subject/${subject.code}`)">{{ t('calc.subjectPage') }}</a>
      </div>
      <label class="calc-search">
        <span class="calc-label">{{ subject ? t('calc.change') : t('calc.pick') }}</span>
        <SubjectSearch compact select :placeholder="t('calc.pickPrompt')" @pick="pick" />
      </label>
      <div v-if="fromPlan.length" class="calc-plan">
        <span class="calc-label">{{ t('calc.fromPlan') }}</span>
        <button v-for="c in fromPlan" :key="c" type="button" class="chip calc-chip" @click="pick(c)">{{ c }}</button>
      </div>
    </section>

    <p v-if="code && !subject" class="calc-note warn" role="status">{{ t('calc.unknown', { code }) }}</p>
    <template v-if="subject">
      <p v-if="subject.passFail" class="calc-note chip">{{ t('calc.passFail') }}</p>
      <p v-if="recordMark !== undefined" class="calc-note">{{ t('calc.fromRecord', { mark: recordMark, band: gradeOf(recordMark) }) }}</p>

      <div class="calc-work">
      <section class="surface calc-parts" aria-labelledby="calc-parts">
        <div class="calc-head">
          <h2 id="calc-parts" class="sec-title">{{ t('calc.parts') }}</h2>
          <button v-if="(custom || changed) && handbookRows.length" type="button" class="button button-quiet" @click="reset">
            <RotateCcw :size="15" aria-hidden="true" /> {{ t('calc.reset') }}
          </button>
        </div>
        <p class="calc-hint" :class="{ warn: changed }">{{ changed ? t('calc.handbookChanged') : handbookRows.length ? t('calc.fromHandbook') : t('calc.noData') }}</p>

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
              <!-- Always there, so the row keeps its height as a mark is typed. -->
              <span class="f-counts">{{ contribution(r) ? t('calc.counts', contribution(r)!) : '' }}</span>
            </label>
            <label class="f f-hurdle">
              <input type="checkbox" :checked="!!r.hurdle" @change="setField(i, 'hurdle', ($event.target as HTMLInputElement).checked)" />
              <span>{{ t('calc.hurdle') }}</span>
            </label>
            <button type="button" class="button button-quiet row-remove" @click="removeRow(i)">{{ t('calc.remove') }}</button>
          </li>
        </ul>
        <div class="calc-foot">
          <button type="button" class="button button-quiet" @click="addRow"><Plus :size="15" aria-hidden="true" /> {{ t('calc.add') }}</button>
          <span class="calc-privacy"><Lock :size="13" aria-hidden="true" /> {{ t('calc.privacy') }}<InfoTip :text="t('calc.privacyInfo')" /></span>
        </div>
        <p v-if="weightsOff && result" class="calc-hint warn">{{ t('calc.weightsOff', { n: result.totalWeight }) }}</p>
      </section>

      <section v-if="result" ref="resultEl" class="surface calc-result" aria-labelledby="calc-result" aria-live="polite">
        <h2 id="calc-result" class="sec-title">{{ allDone ? t('calc.resultAll') : t('calc.resultTitle') }}<InfoTip v-if="!allDone" :text="mathsText" /></h2>
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

/* The subject on the left, the search to change it on the right; stacked on narrow screens. */
.calc-pick {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: end;
  gap: var(--space-3) var(--space-5);
}

.calc-pick:not(:has(.calc-subject)) {
  grid-template-columns: minmax(0, 1fr);
}

.calc-subject {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.calc-code {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.calc-name {
  margin: 0;
  font-size: var(--fs-h2);
  font-weight: var(--fw-semibold);
  line-height: var(--lh-tight);
  overflow-wrap: anywhere;
}

.calc-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.calc-search {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.calc-plan {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  grid-column: 1 / -1;
}

.calc-chip {
  min-height: 44px;
  font-family: var(--font-code);
  cursor: pointer;
}

.calc-label,
.f-label {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.calc-note {
  margin: 0;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  justify-self: start;
}

.calc-parts,
.calc-result {
  display: grid;
  align-content: start;
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

.calc-head .sec-title,
.calc-result .sec-title {
  margin: 0;
}

.calc-hint {
  margin: 0;
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

/* Fixed columns, so typing never moves a field: part, weight, mark / out of, hurdle, remove. */
.row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 6em minmax(10.5em, 1fr) auto auto;
  align-items: start;
  gap: 4px var(--space-3);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 0.8fr);
  align-items: center;
  gap: 6px;
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

.f-hurdle input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.row-remove {
  color: var(--ink-soft);
}

.row-remove:hover {
  color: var(--bad);
}

.calc-privacy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

/* The answer: one line per grade, the mark needed big on the right. */
.bands {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.band {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 10px var(--space-4);
  border-radius: var(--radius);
  background: var(--surface-2);
}

.band-name {
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}

.band-name small {
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}

.band-need {
  font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
  font-weight: var(--fw-bold);
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.s-secured {
  background: var(--good-soft);
  color: var(--good);
}

.s-impossible {
  background: var(--bad-soft);
  color: var(--bad);
}

.s-secured .band-name small,
.s-impossible .band-name small {
  color: inherit;
}

.s-impossible .band-need,
.s-secured .band-need {
  font-size: var(--fs-body, 1rem);
  font-weight: var(--fw-semibold);
}

.final {
  margin: 0;
  font-size: clamp(1.5rem, 1.2rem + 1vw, 2rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
}

.hurdles {
  display: grid;
  gap: var(--space-2);
}

.hurdle {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
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
  min-height: 1.4em;
  font-size: var(--fs-meta);
  line-height: 1.4;
  color: var(--ink-soft);
}

/* Labels on one fixed line height, so the unlabelled controls can line up with the inputs. */
.f-label {
  line-height: 20px;
}

@media (min-width: 641px) {
  .f-kind,
  .f-hurdle,
  .row-remove {
    margin-top: 24px;
  }
}

/* Wide screens: the answer sits beside the parts and stays in view while marks are typed. */
@media (min-width: 1024px) {
  .calc-work {
    display: grid;
    grid-template-columns: minmax(0, 1.9fr) minmax(320px, 1fr);
    align-items: start;
    gap: var(--space-4);
  }

  .calc-result {
    position: sticky;
    top: 96px;
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
  .calc-pick {
    grid-template-columns: minmax(0, 1fr);
  }

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

/* Phones: each part as a small card of its own, full width. */
@media (max-width: 640px) {
  .calc-pick,
  .calc-parts,
  .calc-result {
    padding: var(--space-4);
  }

  .row {
    grid-template-columns: 5.5em minmax(0, 1fr);
    grid-template-areas: 'kind kind' 'weight score' 'hurdle x';
  }

  .f-kind { grid-area: kind; }
  .f-weight { grid-area: weight; }
  .f-score { grid-area: score; }
  .f-hurdle { grid-area: hurdle; }
  .row-remove { grid-area: x; justify-self: end; }
}
</style>
