<script setup lang="ts">
import { trackEvent } from '@/utils/analytics'
import { thisYear as calendarYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import RatingScale from './RatingScale.vue'
import TipBox from './TipBox.vue'
import { computed, shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { RATING_TAGS, SKILLS, type Period, type RatingTag, type Skill } from '@/engine'
import { useI18n } from '@/i18n'
import { FACT_KEYS, FACT_QUESTIONS, LANGUAGES, NO_LANGUAGE, type FactKey } from '@/engine/studentFacts'
import { hasQuestion, isFormReady, submitGoogleForm } from '@/utils/googleForm'
import { useGradeShare } from '@/composables/useGradeShare'
import { useProfile } from '@/composables/useProfile'
import { useMyRatings, type QuickStart } from '@/composables/useMyRatings'

// start: where the one-tap rating (QuickRate) had got to. edit: change this browser's earlier
// rating of the subject, starting from what it sent (useMyRatings).
const props = defineProps<{ code: string; start?: QuickStart; edit?: boolean }>()
const emit = defineEmits<{ done: [sent: boolean] }>()
const { t, locale } = useI18n()

const thisYear = calendarYear()
// Every question is optional: students send whatever they remember ('' = not sure). When and
// where they took it comes from My page if it's there; otherwise blank rather than a guess that
// would quietly go out with every rating.
const { profile, setOwnRating } = useProfile()
const mine = useMyRatings()
const editId = mine.idFor(props.code)
// Answers sent before (editing), read back into the form's own values.
const before = props.edit ? (mine.get(props.code)?.answers ?? {}) : {}
const text = (k: string): string => (typeof before[k] === 'string' ? (before[k] as string) : '')
const list = (k: string): string[] => (Array.isArray(before[k]) ? (before[k] as string[]) : [])
const num = (k: string): number | null => (/^[1-5]$/.test(text(k)) ? Number(text(k)) : null)
// The one-tap difficulty already counted and can't be replaced: not asked or sent again.
const difficultyGiven = props.start?.sent && !mine.editable ? props.start.difficulty : undefined
const taken = profile.value.results.find((r) => r.code === props.code)
const year = shallowRef<number | ''>(/^\d{4}$/.test(text('year')) ? Number(text('year')) : (taken?.year ?? ''))
const SEMESTER_OF: Record<string, Period> = { Summer: 'summer', 'Semester 1': 'semester-1', Winter: 'winter', 'Semester 2': 'semester-2' }
const semester = shallowRef<Period | ''>(SEMESTER_OF[text('semester')] ?? taken?.period ?? '')
const difficulty = shallowRef<number | null>(num('difficulty') ?? props.start?.difficulty ?? null)
const workload = shallowRef<number | null>(num('workload'))
const generosity = shallowRef<number | null>(num('generosity'))
const examDifficulty = shallowRef<number | null>(num('examDifficulty'))
const usefulness = shallowRef<number | null>(num('usefulness'))
const interest = shallowRef<number | null>(num('interest'))
const teaching = shallowRef<number | null>(num('teaching'))
const overall = shallowRef<number | null>(num('overall'))
const hours = shallowRef<number | ''>(text('hours') === '' ? '' : Number(text('hours')))
const grade = shallowRef(text('grade'))
const skills = shallowRef<Skill[]>(list('skills').filter((x): x is Skill => (SKILLS as readonly string[]).includes(x)))
// Optional tags (shown once the form has the question). Nothing is prefilled.
const tags = shallowRef<RatingTag[]>(list('tags').filter((x): x is RatingTag => (RATING_TAGS as readonly string[]).includes(x)))
const hasTags = hasQuestion(RATINGS_FORM, 'tags')
const recommend = shallowRef(text('recommend'))
// Facts the Handbook doesn't give (exam format, recordings, …). Each shows only once the Google
// Form has that question; the value sent is the form's English option label.
const facts = shallowRef<Partial<Record<FactKey, string>>>(Object.fromEntries(FACT_KEYS.filter((k) => text(k)).map((k) => [k, text(k)])))
const languages = shallowRef<string[]>(list('languages'))
const hasLanguages = hasQuestion(RATINGS_FORM, 'languages')
const OPTION_TEXT: Record<FactKey, Record<string, string>> = {
  exam: { open: 'studentFacts.q.examOpen', closed: 'studentFacts.q.examClosed', none: 'studentFacts.q.examNone' },
  lectures: { yes: 'rating.yes', some: 'studentFacts.q.some', no: 'rating.no' },
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
const wish = shallowRef(text('wish') || (props.start?.wish ?? ''))
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
    wish.value.trim() !== '' ||
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
// Difficulty and the tip lead, as on the one-tap card; then the two other quick scales.
const scales = [
  { key: 'workload', model: workload, low: 'rating.loadLow', high: 'rating.loadHigh' },
  { key: 'generosity', model: generosity, low: 'rating.genLow', high: 'rating.genHigh' },
]
// Coming from the one-tap card the heading carries on its question; otherwise the form's own.
const heading = computed(() => (props.start ? t.value('rating.quickTitle', { code: props.code }) : props.edit ? t.value('rating.change') : t.value('rating.title', { code: props.code })))
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
    const answers = {
      code: props.code,
      year: year.value === '' ? '' : String(year.value),
      semester: semester.value === '' ? '' : formSemester[semester.value],
      // Unanswered stays blank: "null" would be an invalid scale answer and the form would drop the whole response.
      difficulty: difficultyGiven ? '' : asText(difficulty.value),
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
      groups: facts.value.groups ?? '',
      cost: facts.value.cost ?? '',
      languages: hasLanguages ? languages.value : [],
      recommend: recommend.value,
      wish: wish.value.trim(),
      language: locale.value,
      ...(mine.editable ? { editId } : {}),
    }
    await submitGoogleForm(RATINGS_FORM, answers)
    if (mine.editable) mine.save(props.code, editId, answers)
    trackEvent(props.edit ? 'rating-edit' : 'rating-submit')
    if (wamBand.value) markShared([props.code])
    // Kept in this browser too: how they found it shapes their own suggestions.
    const rec = recommend.value === 'Yes' || recommend.value === 'Maybe' || recommend.value === 'No' ? recommend.value : undefined
    setOwnRating(props.code, { difficulty: difficultyGiven ?? difficulty.value ?? undefined, interest: interest.value ?? undefined, recommend: rec })
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
  <!-- The same card as the one-tap rating, carried on: its question, the 1–5 buttons and the tip
       box stay as they were, and the other questions follow below. -->
  <form class="rating-card rate" @submit.prevent="send">
    <p class="rating-q">{{ heading }}</p>
    <p v-if="!ready" class="rate-off">{{ t('rating.notReady') }}</p>
    <template v-else>
      <RatingScale v-if="!difficultyGiven" :value="difficulty" :label="start ? undefined : t('rating.difficulty')" low="rating.diffLow" high="rating.diffHigh" @pick="difficulty = $event" />

      <TipBox v-model="wish" class="rating-split" :code="code" />

      <div class="rating-split rate-rest">
        <RatingScale v-for="s in scales" :key="s.key" :value="s.model.value" :label="t(`rating.${s.key}`)" :low="s.low" :high="s.high" @pick="s.model.value = $event" />

        <fieldset class="chips">
          <legend class="rating-label">{{ t('rating.grade') }}</legend>
          <button v-for="g in BANDS" :key="g" type="button" class="chip" :aria-pressed="grade === g" @click="grade = grade === g ? '' : g">{{ g }}</button>
          <p v-if="wamBand" class="rate-note">{{ t('rating.wamBandNoteShort', { range: wamBand }) }}<InfoTip :text="t('rating.wamBandNote', { range: wamBand })" /></p>
        </fieldset>


      <details class="rate-more" :open="edit">
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

          <RatingScale v-for="s in extras" :key="s.key" :value="s.model.value" :label="t(`rating.${s.key}`)" :low="s.low" :high="s.high" @pick="s.model.value = $event" />

          <fieldset class="chips">
            <legend class="rating-label">{{ t('rating.recommend') }}</legend>
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

          <fieldset class="chips">
            <legend class="rating-label">{{ t('rating.skills') }}</legend>
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

          <fieldset v-if="hasTags" class="chips">
            <legend class="rating-label">{{ t('ratingTags.question') }}</legend>
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

          <fieldset v-for="q in factQuestions" :key="q.key" class="chips">
            <legend class="rating-label">{{ t(`studentFacts.q.${q.key}`) }}</legend>
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

          <fieldset v-if="hasLanguages" class="chips">
            <legend class="rating-label">{{ t('studentFacts.q.languages') }}</legend>
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

        </div>
      </details>
      </div>

      <p v-if="status === 'failed'" class="rating-bad" role="alert">{{ t('rating.failed') }}</p>
    </template>

    <p class="rating-note">{{ t('rating.intro') }}</p>
    <div class="rating-actions">
      <button v-if="ready" class="button" type="submit" :disabled="!complete || status === 'sending'">
        {{ edit ? t('rating.update') : t('rating.submit') }}
      </button>
      <button class="button button-quiet" type="button" @click="emit('done', false)">{{ t('rating.cancel') }}</button>
      <span v-if="ready && !complete" class="rate-need">{{ t('rating.needOne') }}</span>
    </div>
  </form>
</template>

<style scoped src="./rating.css"></style>
<style scoped>
.rate-rest {
  display: grid;
  gap: 14px;
}

.rate-more {
  display: grid;
  gap: 12px;
}

.rate-more-summary {
  width: fit-content;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  cursor: pointer;
}

.rate-more-body {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}

.rate-off {
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid var(--open);
  background: var(--open-tint);
}

.rate-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.rate-note {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.rate-need {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .rate-row {
    grid-template-columns: 1fr;
  }
}
</style>
