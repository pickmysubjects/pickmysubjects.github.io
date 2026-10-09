<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RATINGS_FORM } from '@/config'
import { useDataset } from '@/composables/useDataset'
import { SKILLS, type Period, type Skill } from '@/engine'
import { useI18n } from '@/i18n'
import { hasQuestion, isFormReady, submitGoogleForm } from '@/utils/googleForm'

const props = defineProps<{ code: string }>()
const emit = defineEmits<{ done: [sent: boolean] }>()
const { t, locale } = useI18n()

const thisYear = new Date().getFullYear()
// Every question is optional: students send whatever they remember ('' = not sure).
const year = shallowRef<number | ''>(thisYear - 1)
const semester = shallowRef<Period | ''>('semester-1')
const difficulty = shallowRef<number | null>(null)
const workload = shallowRef<number | null>(null)
const generosity = shallowRef<number | null>(null)
const examDifficulty = shallowRef<number | null>(null)
const usefulness = shallowRef<number | null>(null)
const interest = shallowRef<number | null>(null)
const teaching = shallowRef<number | null>(null)
const hours = shallowRef<number | ''>('')
const grade = shallowRef('')
const skills = shallowRef<Skill[]>([])
const recommend = shallowRef('')
const wish = shallowRef('')
const status = shallowRef<'idle' | 'sending' | 'failed'>('idle')

// Demo subjects are fictional: their ratings must never reach the real form.
const { name: dataset } = useDataset()
const demo = computed(() => dataset.value === 'demo')
const ready = computed(() => isFormReady(RATINGS_FORM) && !demo.value)
const complete = computed(
  () =>
    [difficulty, workload, generosity, examDifficulty, usefulness, interest, teaching].some((r) => r.value !== null) ||
    hours.value !== '' ||
    skills.value.length > 0 ||
    recommend.value !== '',
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
  { key: 'examDifficulty', model: examDifficulty, low: 'rating.diffLow', high: 'rating.diffHigh' },
  { key: 'usefulness', model: usefulness, low: 'rating.useLow', high: 'rating.useHigh' },
  { key: 'interest', model: interest, low: 'rating.intLow', high: 'rating.intHigh' },
  { key: 'teaching', model: teaching, low: 'rating.teachLow', high: 'rating.teachHigh' },
] as const
const extras = extraScales.filter((s) => hasQuestion(RATINGS_FORM, s.key))
const asText = (n: number | null): string => (n === null ? '' : String(n))

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
      difficulty: String(difficulty.value),
      workload: String(workload.value),
      generosity: String(generosity.value),
      examDifficulty: asText(examDifficulty.value),
      usefulness: asText(usefulness.value),
      interest: asText(interest.value),
      teaching: asText(teaching.value),
      hours: hours.value === '' ? '' : String(hours.value),
      grade: grade.value,
      skills: skills.value,
      recommend: recommend.value,
      wish: wish.value.trim(),
      language: locale.value,
    })
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
    <p class="rate-required">{{ t('rating.allOptional') }}</p>

    <p v-if="demo" class="rate-off">{{ t('rating.demoOff') }}</p>
    <p v-else-if="!ready" class="rate-off">{{ t('rating.notReady') }}</p>
    <template v-else>
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
      </div>

      <fieldset v-for="s in scales" :key="s.key" class="scale">
        <legend class="field">{{ t(`rating.${s.key}`) }}</legend>
        <span class="scale-end">{{ t(s.low) }}</span>
        <label v-for="n in 5" :key="n" class="scale-option">
          <input type="radio" :name="`${code}-${s.key}`" :value="n" :checked="s.model.value === n" @change="s.model.value = n" />
          {{ n }}
        </label>
        <span class="scale-end">{{ t(s.high) }}</span>
      </fieldset>

      <details v-if="extras.length" class="rate-more">
        <summary class="rate-more-summary">{{ t('rating.more') }}</summary>
        <fieldset v-for="s in extras" :key="s.key" class="scale">
          <legend class="field">{{ t(`rating.${s.key}`) }}</legend>
          <span class="scale-end">{{ t(s.low) }}</span>
          <label v-for="n in 5" :key="n" class="scale-option">
            <input type="radio" :name="`${code}-${s.key}`" :value="n" :checked="s.model.value === n" @change="s.model.value = n" />
            {{ n }}
          </label>
          <span class="scale-end">{{ t(s.high) }}</span>
        </fieldset>
      </details>

      <div class="rate-row">
        <label class="field">
          {{ t('rating.hours') }}
          <input v-model="hours" class="input" type="number" min="0" max="60" />
        </label>
        <label class="field">
          {{ t('rating.grade') }}
          <select v-model="grade" class="select">
            <option value="">—</option>
            <option v-for="g in ['H1', 'H2A', 'H2B', 'H3', 'P', 'N']" :key="g" :value="g">{{ g }}</option>
            <option value="Prefer not to say">{{ t('rating.gradeNone') }}</option>
          </select>
        </label>
      </div>

      <fieldset class="chips-field">
        <legend class="field">{{ t('rating.skills') }}</legend>
        <button
          v-for="s in SKILLS"
          :key="s"
          type="button"
          class="chip"
          :aria-pressed="skills.includes(s)"
          @click="toggleSkill(s)"
        >
          {{ t(`skill.${s}`) }}
        </button>
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

      <label class="field">
        {{ t('rating.wish') }}
        <textarea v-model="wish" class="textarea" rows="3" maxlength="1000" />
        <span class="hint">{{ t('rating.wishHint') }}</span>
      </label>

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

.rate-required {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 0.875rem;
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
</style>
