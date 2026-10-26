<script setup lang="ts">
import { trackEvent } from '@/utils/analytics'
import { thisYear as calendarYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { RATING_TAGS, SKILLS, type Period, type RatingTag, type Skill } from '@/engine'
import { useI18n } from '@/i18n'
import { FACT_KEYS, FACT_QUESTIONS, LANGUAGES, NO_LANGUAGE, type FactKey } from '@/engine/studentFacts'
import { hasQuestion, isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { useGradeShare } from '@/composables/useGradeShare'
import { useProfile } from '@/composables/useProfile'

const props = defineProps<{ code: string }>()
const emit = defineEmits<{ done: [sent: boolean] }>()
const { t, locale } = useI18n()

const thisYear = calendarYear()
// Every question is optional: students send whatever they remember ('' = not sure). When and
// where they took it comes from My page if it's there; otherwise blank rather than a guess that
// would quietly go out with every rating.
const { profile, setOwnRating } = useProfile()
const taken = profile.value.results.find((r) => r.code === props.code)
const year = shallowRef<number | ''>(taken?.year ?? '')
const semester = shallowRef<Period | ''>(taken?.period ?? '')
const difficulty = shallowRef<number | null>(null)
const workload = shallowRef<number | null>(null)
const generosity = shallowRef<number | null>(null)
const examDifficulty = shallowRef<number | null>(null)
const usefulness = shallowRef<number | null>(null)
const interest = shallowRef<number | null>(null)
const teaching = shallowRef<number | null>(null)
const overall = shallowRef<number | null>(null)
const hours = shallowRef<number | ''>('')
const grade = shallowRef('')
const skills = shallowRef<Skill[]>([])
// Optional tags (shown once the form has the question). Nothing is prefilled.
const tags = shallowRef<RatingTag[]>([])
const hasTags = hasQuestion(RATINGS_FORM, 'tags')
const recommend = shallowRef('')
// Facts the Handbook doesn't give (exam format, recordings, …). Each shows only once the Google
// Form has that question; the value sent is the form's English option label.
const facts = shallowRef<Partial<Record<FactKey, string>>>({})
const languages = shallowRef<string[]>([])
const hasLanguages = hasQuestion(RATINGS_FORM, 'languages')
const OPTION_TEXT: Record<FactKey, Record<string, string>> = {
  exam: { open: 'studentFacts.q.examOpen', closed: 'studentFacts.q.examClosed', none: 'studentFacts.q.examNone' },
  lectures: { yes: 'rating.yes', some: 'studentFacts.q.some', no: 'rating.no' },
  attendance: { yes: 'rating.yes', no: 'rating.no' },
  groups: { assigned: 'studentFacts.q.groupsAssigned', choose: 'studentFacts.q.groupsChoose', none: 'studentFacts.q.groupsNone' },
  cost: { yes: 'rating.yes', no: 'rating.no' },
}
const factQuestions = FACT_KEYS.filter((k) => hasQuestion(RATINGS_FORM, k)).map((k) => ({
  key: k,
  options: Object.entries(FACT_QUESTIONS[k].options as Record<string, string | null>).map(([label, id]) => ({
    label,
    text: id === null ? 'rating.notSure' : (OPTION_TEXT[k][id] as string),
  })),
}))
const languageOptions = [...LANGUAGES, NO_LANGUAGE]

function setFact(k: FactKey, label: string): void {
  facts.value = { ...facts.value, [k]: facts.value[k] === label ? undefined : label }
}

function toggleLanguage(x: string): void {
  // "None" and a language exclude each other.
  if (languages.value.includes(x)) languages.value = languages.value.filter((y) => y !== x)
  else languages.value = x === NO_LANGUAGE ? [x] : [...languages.value.filter((y) => y !== NO_LANGUAGE), x]
}
const wish = shallowRef('')
const status = shallowRef<'idle' | 'sending' | 'failed'>('idle')
// With a grade band, the student's WAM range without this subject goes too (when the form has the
// question and My page has enough other marks): that's what makes a band comparable across students.
const { wamBandFor, markShared } = useGradeShare()
const wamBand = computed(() => (hasQuestion(RATINGS_FORM, 'wamBand') && BANDS.includes(grade.value) ? wamBandFor(props.code) : null))

const BANDS = ['H1', 'H2A', 'H2B', 'H3', 'P', 'N']
const ready = computed(() => isFormReady(RATINGS_FORM))
const complete = computed(
  () =>
    [difficulty, workload, generosity, examDifficulty, usefulness, interest, teaching, overall].some((r) => r.value !== null) ||
    hours.value !== '' ||
    skills.value.length > 0 ||
    tags.value.length > 0 ||
    Object.values(facts.value).some(Boolean) ||
    languages.value.length > 0 ||
    recommend.value !== '' ||
    BANDS.includes(grade.value),
)
const periods: Period[] = ['summer', 'semester-1', 'winter', 'semester-2']
// Option labels as typed in the Google Form (English), independent of the UI language.
const formSemester: Record<Period, string> = {
  summer: 'Summer',
  'semester-1': 'Semester 1',
  winter: 'Winter',
  'semester-2': 'Semester 2',
}
const scales = [
  { key: 'difficulty', model: difficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
  { key: 'workload', model: workload, low: 'rating.loadLow', high: 'rating.loadHigh' },
  { key: 'generosity', model: generosity, low: 'rating.genLow', high: 'rating.genHigh' },
] as const
// Optional extras, shown only once the Google Form has the matching question.
const extraScales = [
  { key: 'overall', model: overall, low: 'rating.teachLow', high: 'rating.teachHigh' },
  { key: 'examDifficulty', model: examDifficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
  { key: 'usefulness', model: usefulness, low: 'rating.useLow', high: 'rating.useHigh' },
  { key: 'interest', model: interest, low: 'rating.intLow', high: 'rating.intHigh' },
  { key: 'teaching', model: teaching, low: 'rating.teachLow', high: 'rating.teachHigh' },
] as const
const extras = extraScales.filter((s) => hasQuestion(RATINGS_FORM, s.key))
// Exams and teamwork come from the assessment, not from students' answers.
const rateableSkills = SKILLS.filter((s) => s !== 'exams' && s !== 'teamwork')
const asText = (n: number | null): string => (n === null ? '' : String(n))

function toggleTag(x: RatingTag): void {
  tags.value = tags.value.includes(x) ? tags.value.filter((y) => y !== x) : [...tags.value, x]
}

function toggleSkill(s: Skill): void {
  skills.value = skills.value.includes(s) ? skills.value.filter((x) => x !== s) : [...skills.value, s]
}

async function send(): Promise<void> {
  if (!complete.value) return
  status.value = 'sending'
  try {
    await submitGoogleForm(RATINGS_FORM, {
      code: props.code,
      year: year.value === '' ? '' : String(year.value),
      semester: semester.value === '' ? '' : formSemester[semester.value],
      // Unanswered stays blank: "null" would be an invalid scale answer and the form would drop the whole response.
      difficulty: asText(difficulty.value),
      workload: asText(workload.value),
      generosity: asText(generosity.value),
      examDifficulty: asText(examDifficulty.value),
      usefulness: asText(usefulness.value),
      interest: asText(interest.value),
      teaching: asText(teaching.value),
      overall: asText(overall.value),
      hours: hours.value === '' ? '' : String(hours.value),
      grade: grade.value,
      wamBand: wamBand.value ?? '',
      skills: skills.value,
      tags: hasTags ? tags.value : [],
      exam: facts.value.exam ?? '',
      lectures: facts.value.lectures ?? '',
      attendance: facts.value.attendance ?? '',
      groups: facts.value.groups ?? '',
      cost: facts.value.cost ?? '',
      languages: hasLanguages ? languages.value : [],
      recommend: recommend.value,
      wish: wish.value.trim(),
      language: locale.value,
    })
    trackEvent('rating-submit')
    if (wamBand.value) markShared([props.code])
    // Kept in this browser too: how they found it shapes their own suggestions.
    const rec = recommend.value === 'Yes' || recommend.value === 'Maybe' || recommend.value === 'No' ? recommend.value : undefined
    setOwnRating(props.code, { difficulty: difficulty.value ?? undefined, interest: interest.value ?? undefined, recommend: rec })
    emit('done', true)
  } catch {
    status.value = 'failed'
  }
}

function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}
</script>

<template>
  <form class="rate surface" @submit.prevent="send">
    <h3 class="rate-title">{{ t('rating.title', { code }) }}</h3>
    <p class="rate-intro">{{ t('rating.intro') }}</p>
    <p v-if="!ready" class="rate-off">{{ t('rating.notReady') }}</p>
    <template v-else>
      <!-- The four that matter most, a tap each; everything else is folded away. -->
      <fieldset v-for="s in scales" :key="s.key" class="scale">
        <legend class="field">{{ t(`rating.${s.key}`) }}</legend>
        <span class="scale-end">{{ t(s.low) }}</span>
        <label v-for="n in 5" :key="n" class="scale-option">
          <input type="radio" :name="`${code}-${s.key}`" :value="n" :checked="s.model.value === n" @change="s.model.value = n" />
          {{ n }}
        </label>
        <span class="scale-end">{{ t(s.high) }}</span>
      </fieldset>

      <fieldset class="chips-field">
        <legend class="field">{{ t('rating.grade') }}</legend>
        <button v-for="g in BANDS" :key="g" type="button" class="chip" :aria-pressed="grade === g" @click="grade = grade === g ? '' : g">{{ g }}</button>
        <p v-if="wamBand" class="rate-note">{{ t('rating.wamBandNoteShort', { range: wamBand }) }}<InfoTip :text="t('rating.wamBandNote', { range: wamBand })" /></p>
      </fieldset>

      <details class="rate-more">
        <summary class="rate-more-summary">{{ t('rating.more') }}</summary>
        <div class="rate-more-body">
          <div class="rate-row">
            <label class="field">
              {{ t('rating.year') }}
              <input
                class="input"
                type="number"
                :min="2010"
                :max="thisYear"
                :value="year"
                @change="year = value($event) === '' ? '' : Number(value($event))"
              />
            </label>
            <label class="field">
              {{ t('rating.semester') }}
              <select class="select" :value="semester" @change="semester = value($event) as Period | ''">
                <option v-for="p in periods" :key="p" :value="p">{{ t(`period.${p}`) }}</option>
                <option value="">{{ t('rating.notSure') }}</option>
              </select>
            </label>
            <label class="field">
              {{ t('rating.hours') }}
              <input v-model="hours" class="input" type="number" min="0" max="60" />
            </label>
          </div>

          <fieldset v-for="s in extras" :key="s.key" class="scale">
            <legend class="field">{{ t(`rating.${s.key}`) }}</legend>
            <span class="scale-end">{{ t(s.low) }}</span>
            <label v-for="n in 5" :key="n" class="scale-option">
              <input type="radio" :name="`${code}-${s.key}`" :value="n" :checked="s.model.value === n" @change="s.model.value = n" />
              {{ n }}
            </label>
            <span class="scale-end">{{ t(s.high) }}</span>
          </fieldset>

          <fieldset class="chips-field">
            <legend class="field">{{ t('rating.recommend') }}</legend>
            <button
              v-for="r in ['Yes', 'Maybe', 'No']"
              :key="r"
              type="button"
              class="chip"
              :aria-pressed="recommend === r"
              @click="recommend = recommend === r ? '' : r"
            >
              {{ t(`rating.${r.toLowerCase()}`) }}
            </button>
          </fieldset>

          <fieldset class="chips-field">
            <legend class="field">{{ t('rating.skills') }}</legend>
            <button
              v-for="sk in rateableSkills"
              :key="sk"
              type="button"
              class="chip"
              :aria-pressed="skills.includes(sk)"
              @click="toggleSkill(sk)"
            >
              {{ t(`skill.${sk}`) }}
            </button>
          </fieldset>

          <fieldset v-if="hasTags" class="chips-field">
            <legend class="field">{{ t('ratingTags.question') }}</legend>
            <button
              v-for="x in RATING_TAGS"
              :key="x"
              type="button"
              class="chip"
              :aria-pressed="tags.includes(x)"
              @click="toggleTag(x)"
            >
              {{ t(`ratingTags.${x}`) }}
            </button>
          </fieldset>

          <fieldset v-for="q in factQuestions" :key="q.key" class="chips-field">
            <legend class="field">{{ t(`studentFacts.q.${q.key}`) }}</legend>
            <button
              v-for="o in q.options"
              :key="o.label"
              type="button"
              class="chip"
              :aria-pressed="facts[q.key] === o.label"
              @click="setFact(q.key, o.label)"
            >
              {{ t(o.text) }}
            </button>
          </fieldset>

          <fieldset v-if="hasLanguages" class="chips-field">
            <legend class="field">{{ t('studentFacts.q.languages') }}</legend>
            <button
              v-for="x in languageOptions"
              :key="x"
              type="button"
              class="chip"
              :aria-pressed="languages.includes(x)"
              @click="toggleLanguage(x)"
            >
              {{ x === NO_LANGUAGE ? t('studentFacts.q.langNone') : x }}
            </button>
          </fieldset>

          <label class="field">
            {{ t('rating.wish') }}
            <textarea v-model="wish" class="textarea" rows="3" maxlength="1000" />
            <span class="hint">{{ t('rating.wishHint') }}<InfoTip :text="t('rating.wishInfo')" /></span>
          </label>
        </div>
      </details>

      <p v-if="status === 'failed'" class="rate-failed" role="alert">{{ t('rating.failed') }}</p>
    </template>

    <div class="rate-actions">
      <button v-if="ready" class="button" type="submit" :disabled="!complete || status === 'sending'">
        {{ t('rating.submit') }}
      </button>
      <button class="button button-quiet" type="button" @click="emit('done', false)">{{ t('rating.cancel') }}</button>
      <span v-if="ready && !complete" class="rate-need">{{ t('rating.needOne') }}</span>
    </div>
  </form>
</template>

<style scoped>
.rate {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.rate-more {
  display: grid;
  gap: 12px;
}

.rate-more[open] {
  padding-bottom: 4px;
}

.rate-more-summary {
  width: fit-content;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.rate-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.rate-intro,
.hint {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--ink-soft);
}

.rate-off {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid var(--open);
  background: var(--open-tint);
}

.rate-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.scale,
.chips-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.scale legend,
.chips-field legend {
  margin-bottom: 6px;
}

.scale-end {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.scale-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border: 1px solid var(--contour);
  border-radius: 999px;
  cursor: pointer;
}

.scale-option:has(input:checked) {
  border-color: var(--overprint);
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.scale-option input {
  accent-color: var(--overprint);
}

.chip {
  padding: 5px 11px;
  border: 1px solid var(--contour);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 0.875rem;
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  border-color: var(--overprint);
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}

.textarea {
  resize: vertical;
}

.rate-failed {
  margin: 0;
  color: var(--stop);
}

.rate-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}


.rate-need {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .rate-row {
    grid-template-columns: 1fr;
  }
}
.rate-note {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}
.rate-more-body {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

/* Phones: the five choices on one line, with the two end labels above them. */
@media (max-width: 560px) {
  .scale {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }

  .scale legend {
    grid-column: 1 / -1;
  }

  .scale-end {
    grid-row: 2;
  }

  .scale-end:first-of-type {
    grid-column: 1 / 3;
  }

  .scale-end:last-of-type {
    grid-column: 4 / 6;
    text-align: right;
  }

  .scale-option {
    grid-row: 3;
    justify-content: center;
    padding: 6px 0;
  }

  .scale-option input {
    display: none;
  }
}
</style>
