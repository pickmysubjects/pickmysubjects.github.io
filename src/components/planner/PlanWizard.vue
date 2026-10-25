<script setup lang="ts">
import { thisYear as calendarYear } from '@/engine/dataYear'
import { link } from '@/composables/useView'
import { computed, shallowRef } from 'vue'
import { ArrowLeft, ArrowRight, Check } from 'lucide-vue-next'
import { canEnterIn, cannotCombine, componentCourse, findCourse, nextEntry, diplomaClash, heldAsMinor, majorClash, maxMajors, minorClash, type Component, type Course, type Period } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import type { PlanSetup } from '@/composables/usePlan'
import MajorPicker from './MajorPicker.vue'
import { useI18n } from '@/i18n'
import { useProfile } from '@/composables/useProfile'
import { termLabel } from '@/i18n/format'

/** Three plain questions, one at a time, then "Build my plan". */
const props = withDefaults(
  defineProps<{ setup: PlanSetup; courses: Course[]; components: Component[]; cancellable?: boolean }>(),
  { cancellable: true },
)
const emit = defineEmits<{ done: [setup: PlanSetup]; cancel: [] }>()
const { t } = useI18n()
const { data } = useDataset()

const { profile } = useProfile()

// The earliest semester on My record: you started no later than that. A summer or winter term
// counts as the semester it sits before.
const ORDER: Record<Period, number> = { summer: 0, 'semester-1': 1, winter: 2, 'semester-2': 3 }
const fromRecord = computed(() => {
  const dated = profile.value.results.filter((r) => r.year && r.period)
  if (!dated.length) return null
  const first = dated.reduce((a, b) => ((a.year as number) * 10 + ORDER[a.period as Period] <= (b.year as number) * 10 + ORDER[b.period as Period] ? a : b))
  const period: Period = first.period === 'summer' || first.period === 'semester-1' ? 'semester-1' : 'semester-2'
  return { year: first.year as number, period }
})
const key = (y: number, p: Period) => y * 10 + ORDER[p]

// The record wins when it says you started earlier than the saved answer (it can't be later).
const start0 =
  fromRecord.value && key(fromRecord.value.year, fromRecord.value.period) < key(props.setup.startYear, props.setup.startPeriod)
    ? { startYear: fromRecord.value.year, startPeriod: fromRecord.value.period }
    : {}
const draft = shallowRef<PlanSetup>({ ...props.setup, ...start0 })
const step = shallowRef(0)
const thisYear = calendarYear()
const firstYear = Math.min(thisYear - 2, fromRecord.value?.year ?? thisYear)
const years = Array.from({ length: thisYear + 1 - firstYear + 1 }, (_, i) => firstYear + i)
const startFromRecord = computed(
  () => fromRecord.value !== null && draft.value.startYear === fromRecord.value.year && draft.value.startPeriod === fromRecord.value.period,
)
const course = computed(() => findCourse(data.value, draft.value.course, draft.value.courseYear))
// A new start only in the periods the course takes new students in; a student whose record shows
// they've started already isn't held to that, and a saved start stays offered (with a note).
const startOk = computed(() => fromRecord.value !== null || canEnterIn(course.value, draft.value.startPeriod))
const periods: Period[] = ['semester-1', 'semester-2']
const showPeriod = (y: number, p: Period) => fromRecord.value !== null || canEnterIn(course.value, p) || (y === draft.value.startYear && p === draft.value.startPeriod)

// A major closed to new students stays only for those who started before it closed (or already chose it).
const majors = computed(() =>
  props.components.filter(
    (c) =>
      c.course === componentCourse(data.value, draft.value.course) &&
      c.kind === 'major' &&
      (c.closedFrom === undefined || draft.value.startYear < c.closedFrom || c.id === draft.value.major),
  ),
)
// A second major: only in a course that allows two, once a first is picked. Not the same one
// again, nor one the Handbook rules out with it.
const majors2 = computed(() => {
  const first = draft.value.major
  if (!first || maxMajors(data.value, draft.value.course, draft.value.courseYear) < 2) return []
  return majors.value.filter((c) => !majorClash(data.value, first, c.id)).sort((a, b) => a.title.localeCompare(b.title))
})
const chosenMajors = computed(() => [draft.value.major, majors2.value.some((m) => m.id === draft.value.major2) ? draft.value.major2 : ''].filter(Boolean) as string[])

// Specialisations that go with the chosen major(s) (an extra, optional choice).
const specs = computed(() =>
  props.components.filter(
    (c) =>
      c.course === componentCourse(data.value, draft.value.course) &&
      c.kind === 'specialisation' &&
      !c.informal &&
      (c.requiresMajor.length === 0 || chosenMajors.value.some((m) => c.requiresMajor.includes(m))) &&
      // Not one the major's own subjects rule out (Mechatronics with a computing specialisation).
      !chosenMajors.value.some((m) => cannotCombine(data.value, m, c.id)),
  ),
)

// Minors of the course (an optional extra, shown only when the course has any), open to new
// students and not the major's own discipline. In B-DES these are its informal specialisations.
const minors = computed(() =>
  props.components
    .filter(
      (c) =>
        c.course === componentCourse(data.value, draft.value.course) &&
        heldAsMinor(c) &&
        (c.closedFrom === undefined || draft.value.startYear < c.closedFrom || draft.value.minors?.includes(c.id)) &&
        !minorClash(data.value, chosenMajors.value, c.id),
    )
    .sort((a, b) => a.title.localeCompare(b.title)),
)
const minor = computed(() => draft.value.minors?.[0] ?? '')
const informal = computed(() => minors.value.some((c) => c.informal))

// A concurrent diploma (optional): the ones the chosen majors don't rule out, and its streams
// that aren't already the major or minor.
const diplomas = computed(() => (data.value.diplomas ?? []).filter((d) => !diplomaClash(data.value, d, { major: draft.value.major, major2: chosenMajors.value[1], specialisation: draft.value.specialisation })))
const diploma = computed(() => diplomas.value.find((d) => d.code === draft.value.diploma))
const streams = computed(() =>
  (diploma.value?.streams ?? [])
    .map((id) => props.components.find((c) => c.id === id))
    .filter((c): c is Component => !!c && !diplomaClash(data.value, diploma.value!, { major: draft.value.major, major2: chosenMajors.value[1], minors: draft.value.minors, diplomaStream: c.id }))
    .sort((a, b) => a.title.localeCompare(b.title)),
)

function set(patch: Partial<PlanSetup>): void {
  draft.value = { ...draft.value, ...patch }
}

// A specialisation that doesn't go with the final major choice is dropped.
function finish(): void {
  const spec = specs.value.some((sp) => sp.id === draft.value.specialisation) ? draft.value.specialisation : ''
  // Likewise a minor the final major rules out.
  const kept = (draft.value.minors ?? []).filter((id) => minors.value.some((m) => m.id === id))
  // And a second major that doesn't go with the first (or the course allows only one).
  const major2 = majors2.value.some((m) => m.id === draft.value.major2) ? (draft.value.major2 ?? '') : ''
  // And a diploma (or stream) the final choices rule out.
  const dip = diploma.value?.code ?? ''
  const stream = dip && streams.value.some((s) => s.id === draft.value.diplomaStream) ? (draft.value.diplomaStream ?? '') : ''
  emit('done', { ...draft.value, courseYear: draft.value.startYear, commencementYear: draft.value.startYear, major2, specialisation: spec, minors: kept, diploma: dip, diplomaStream: stream })
}

function chooseCourse(c: Course): void {
  // A new student's start moves to the next term the course takes new students in.
  const start = fromRecord.value ? { year: draft.value.startYear, period: draft.value.startPeriod } : nextEntry(c, { year: draft.value.startYear, period: draft.value.startPeriod })
  set({ course: c.code, courseYear: start.year, startYear: start.year, startPeriod: start.period, major: '', major2: '', specialisation: '', minors: [], field: '', diploma: '', diplomaStream: '' })
}
</script>

<template>
  <section class="wizard surface">
    <header class="wizard-head">
      <p class="eyebrow">{{ t('wizard.step', { n: step + 1 }) }}</p>
      <span class="dots" aria-hidden="true">
        <span v-for="n in 3" :key="n" class="dot" :class="{ 'dot-on': n - 1 <= step }" />
      </span>
    </header>

    <div v-if="step === 0" class="q">
      <h2 class="q-title">{{ t('wizard.qCourse') }}</h2>
      <div class="options">
        <button
          v-for="c in courses"
          :key="`${c.code}-${c.year}`"
          type="button"
          class="option"
          :aria-pressed="draft.course === c.code"
          @click="chooseCourse(c)"
        >
          <span>
            {{ c.title }}
            <span v-if="c.entryNote" class="intl-hint">{{ t(`entry.${c.entryNote}`) }}</span>
          </span>
          <Check v-if="draft.course === c.code" :size="18" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-else-if="step === 1" class="q">
      <h2 class="q-title">{{ t('wizard.qStart') }}</h2>
      <p v-if="startFromRecord && fromRecord" class="from-record">{{ t('wizard.startFromRecord', { term: termLabel(t, fromRecord) }) }}</p>
      <p v-if="!startOk" class="from-record">{{ t('wizard.entryOnlyS1') }}</p>
      <div class="options options-grid">
        <template v-for="y in years" :key="y">
          <button
            v-for="p in periods.filter((q) => showPeriod(y, q))"
            :key="`${y}-${p}`"
            type="button"
            class="option option-small"
            :aria-pressed="draft.startYear === y && draft.startPeriod === p"
            @click="set({ startYear: y, startPeriod: p })"
          >
            {{ y }} · {{ t(`period.${p}`) }}
          </button>
        </template>
      </div>
      <label class="intl">
        <input type="checkbox" :checked="draft.international === true" @change="set({ international: ($event.target as HTMLInputElement).checked })" />
        <span>
          {{ t('wizard.international') }}
          <span class="intl-hint">{{ t('wizard.internationalHint') }}</span>
        </span>
      </label>
    </div>

    <div v-else class="q">
      <h2 class="q-title">{{ t('wizard.qMajor') }}</h2>
      <MajorPicker
        :majors="majors"
        :model-value="draft.major"
        :field="draft.field ?? ''"
        @update:model-value="set({ major: $event })"
        @update:field="set({ field: $event })"
      />
      <a class="majors-link" :href="link('majors')" target="_blank" rel="noopener">{{ t('wizard.majorsLink') }}</a>
      <label v-if="majors2.length" class="minor">
        <span class="spec-title">{{ t('wizard.qMajor2') }}</span>
        <select
          class="select-glass minor-select"
          data-testid="major2-select"
          :value="chosenMajors[1] ?? ''"
          @change="set({ major2: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">{{ t('wizard.noMajor2') }}</option>
          <option v-for="m in majors2" :key="m.id" :value="m.id">{{ m.title }}</option>
        </select>
      </label>
      <div v-if="specs.length" class="spec">
        <p class="spec-title">{{ t('wizard.qSpec') }}</p>
        <div class="spec-chips" role="group" :aria-label="t('wizard.qSpec')">
          <button type="button" class="chip spec-chip" :aria-pressed="!draft.specialisation" @click="set({ specialisation: '' })">
            {{ t('wizard.noSpec') }}
          </button>
          <button
            v-for="sp in specs"
            :key="sp.id"
            type="button"
            class="chip spec-chip"
            :aria-pressed="draft.specialisation === sp.id"
            @click="set({ specialisation: sp.id })"
          >
            {{ sp.title }}
          </button>
        </div>
      </div>
      <label v-if="minors.length" class="minor">
        <span class="spec-title">{{ t(informal ? 'wizard.qInformal' : 'wizard.qMinor') }}</span>
        <select class="select-glass minor-select" :value="minor" @change="set({ minors: ($event.target as HTMLSelectElement).value ? [($event.target as HTMLSelectElement).value] : [] })">
          <option value="">{{ t(informal ? 'wizard.noInformal' : 'wizard.noMinor') }}</option>
          <option v-for="m in minors" :key="m.id" :value="m.id">{{ m.title }}</option>
        </select>
      </label>
      <label v-if="diplomas.length" class="minor">
        <span class="spec-title">{{ t('wizard.qDiploma') }}</span>
        <select
          class="select-glass minor-select"
          data-testid="diploma-select"
          :value="diploma?.code ?? ''"
          @change="set({ diploma: ($event.target as HTMLSelectElement).value, diplomaStream: '' })"
        >
          <option value="">{{ t('wizard.noDiploma') }}</option>
          <option v-for="d in diplomas" :key="d.code" :value="d.code">{{ d.title }}</option>
        </select>
        <span class="intl-hint">{{ t('wizard.diplomaHint') }}</span>
        <span v-if="diploma?.entryNote" class="intl-hint">{{ t(`entry.${diploma.entryNote}`) }}</span>
      </label>
      <label v-if="streams.length" class="minor">
        <span class="spec-title">{{ t('wizard.qStream') }}</span>
        <select
          class="select-glass minor-select"
          data-testid="diploma-stream-select"
          :value="draft.diplomaStream ?? ''"
          @change="set({ diplomaStream: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">{{ t('wizard.notSure') }}</option>
          <option v-for="s in streams" :key="s.id" :value="s.id">{{ s.title }}</option>
        </select>
      </label>
    </div>

    <footer class="wizard-foot">
      <button v-if="step > 0" class="button button-quiet" type="button" @click="step--">
        <ArrowLeft :size="16" aria-hidden="true" /> {{ t('wizard.back') }}
      </button>
      <button v-else-if="cancellable" class="button button-quiet" type="button" @click="emit('cancel')">{{ t('rating.cancel') }}</button>
      <!-- Nothing to go back to on a first visit: keep "Next" on the right. -->
      <span v-else aria-hidden="true" />
      <button v-if="step < 2" class="button" type="button" :disabled="step === 0 && !draft.course" @click="step++">
        {{ t('wizard.next') }} <ArrowRight :size="16" aria-hidden="true" />
      </button>
      <button v-else class="button button-accent" type="button" @click="finish">
        {{ t('wizard.build') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.wizard {
  display: grid;
  gap: 22px;
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
  padding: 28px;
}

.wizard-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 28px;
  height: 5px;
  border-radius: 999px;
  background: var(--line);
}

.dot-on {
  background: var(--accent);
}

.q {
  display: grid;
  gap: 16px;
}

.q-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.options {
  display: grid;
  gap: 10px;
}

.options-grid {
  grid-template-columns: repeat(2, 1fr);
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 18px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  font-size: 1rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.option:hover {
  background: var(--glass-fill-hover);
}

.option[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.option-small {
  min-height: 48px;
  justify-content: center;
}

.wizard-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
}

/* Each button keeps its label on one line; a long pair wraps, the forward one going right. */
.wizard-foot .button {
  white-space: nowrap;
}

.wizard-foot > :last-child {
  margin-left: auto;
}

@media (max-width: 560px) {
  .wizard {
    padding: 20px;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }
}
.intl {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  font-weight: 600;
  cursor: pointer;
}

.intl input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--accent);
}

.intl-hint {
  display: block;
  margin-top: 2px;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--ink-soft);
}
.spec {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.spec-title {
  font-weight: 600;
}

.spec-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-chip {
  color: var(--ink);
  cursor: pointer;
}

.spec-chip[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.minor {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.minor-select {
  width: 100%;
  max-width: 360px;
}

.majors-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 0.9375rem;
  color: var(--accent);
}
.from-record {
  margin: -4px 0 4px;
  font-size: 0.875rem;
  color: var(--good);
}
</style>
