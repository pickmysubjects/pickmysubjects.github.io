<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef } from 'vue'
import { courseFocus, type Skill } from '@/engine'
import { skillsFromMarks } from '@/engine/skills'
import { useProfile } from '@/composables/useProfile'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { MARK_SCALES, MARK_SCALE_IDS, defaultMarkScale, isMarkScale, type MarkScale } from '@/utils/markScales'

const skills = defineModel<Partial<Record<Skill, number>>>('skills', { required: true })
const { t, locale } = useI18n()
const { data, course } = useDataset()
// The skills the student's own degree leans on come first (business for B-COM, programming for B-SCI).
const order = computed(() => courseFocus(data.value, course.value).skills)
// What the student's marks say, per skill: shown where it differs from their own answer.
const { profile, setMarkScale } = useProfile()
const fromMarks = computed(() => skillsFromMarks(profile.value.results, data.value))
const suggestion = (k: Skill) => {
  const s = fromMarks.value[k]
  return s && s.level !== skills.value[k] ? s : null
}
// The first few, plus any already rated; the rest a tap away.
const FIRST = 8
const showAll = shallowRef(false)
const shown = computed(() => (showAll.value ? order.value : order.value.filter((k, i) => i < FIRST || skills.value[k] !== undefined || suggestion(k) !== null)))
const hidden = computed(() => order.value.length - shown.value.length)

// Five steps, like a course survey: 1 = finds it hard … 5 = strong. Blank means "not sure".
const LEVELS = [1, 2, 3, 4, 5] as const
// The usual mark in that kind of subject for each level, in the scale the student reads marks in
// (UniMelb bands once they have uni results; their school system's before that). Labels only.
const scale = computed<MarkScale>(() => {
  const saved = profile.value.markScale
  return isMarkScale(saved) ? saved : defaultMarkScale(locale.value, profile.value.results.length > 0)
})
const ranges = computed(() => MARK_SCALES[scale.value])
function onScale(e: Event): void {
  const v = (e.target as HTMLSelectElement).value
  if (isMarkScale(v)) setMarkScale(v)
}

function useSuggestion(skill: Skill, level: number): void {
  skills.value = { ...skills.value, [skill]: level }
}

function pick(skill: Skill, level: number): void {
  const next = { ...skills.value }
  // Tapping the chosen level again clears it.
  if (next[skill] === level) delete next[skill]
  else next[skill] = level
  skills.value = next
}
</script>

<template>
  <section class="card surface" aria-labelledby="skills-title">
    <header class="card-head">
      <h2 id="skills-title" class="card-title">{{ t('record.skillsTitle') }}</h2>
      <p class="card-hint">{{ t('record.levelLegendShort') }}<InfoTip :text="t('record.levelLegend')" /></p>
      <!-- What each level means, in marks: more accurate than a feeling (see the research notes). -->
      <ul class="legend">
        <li v-for="n in LEVELS" :key="n"><strong>{{ t(`record.level.${n}`) }}</strong> {{ ranges[n - 1] }}</li>
      </ul>
      <div class="scale-pick">
        <label class="scale-field">
          <span>{{ t('record.markScaleLabel') }}</span>
          <select :value="scale" @change="onScale">
            <option v-for="id in MARK_SCALE_IDS" :key="id" :value="id">{{ t(`record.markScale.${id}`) }}</option>
          </select>
        </label>
        <p class="scale-note">
          {{ t('record.markScaleNoteShort') }}<InfoTip :text="t('record.markScaleNote') + (scale === 'cn' ? ' ' + t('record.markScaleCn150') : '')" />
        </p>
      </div>
    </header>
    <ul class="skill-list">
      <li v-for="s in shown" :key="s" class="skill">
        <span class="skill-name">{{ t(`skill.${s}`) }}</span>
        <span class="scale" role="radiogroup" :aria-label="t(`skill.${s}`)">
          <button
            v-for="n in LEVELS"
            :key="n"
            type="button"
            role="radio"
            class="step"
            :class="`step-${n}`"
            :aria-checked="skills[s] === n"
            :title="t(`record.level.${n}`)"
            @click="pick(s, n)"
          >
            <span class="step-label">{{ t(`record.level.${n}`) }}</span>
          </button>
        </span>
        <p v-if="suggestion(s)" class="suggest">
          {{ t('record.skillFromMarks', { codes: suggestion(s)!.codes.slice(0, 3).join(t('listSep')), avg: suggestion(s)!.avg, level: t(`record.level.${suggestion(s)!.level}`) }) }}
          <button type="button" class="suggest-use" @click="useSuggestion(s, suggestion(s)!.level)">{{ t('record.useIt') }}</button>
        </p>
      </li>
    </ul>
    <button v-if="hidden > 0 || showAll" type="button" class="more" @click="showAll = !showAll">
      {{ showAll ? t('record.fewerSkills') : t('record.moreSkills', { n: hidden }) }}
    </button>
  </section>
</template>

<style scoped>
.card {
  display: grid;
  /* One column no wider than the card: the mark-scale menu's longest option
     (e.g. 韓国 内申 9 等級…) shortens in its box instead of widening the page. */
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 20px 22px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.card-hint {
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(330px, 100%), 1fr));
  gap: 0 24px;
  /* A row that grows (a "use this" hint under its scale) doesn't stretch its neighbour. */
  align-items: start;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Name above its scale on every row, so a short name ("Maths") lines up like the long ones. */
.skill {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-size: 0.9375rem;
}

.scale {
  display: grid;
  /* Equal cells that may shrink below their label width: a long label (e.g. かなり得意)
     wraps inside its cell instead of pushing the scale out of its column. */
  grid-template-columns: repeat(5, minmax(44px, 1fr));
  flex: 0 1 auto;
  max-width: 100%;
  border: 1.5px solid color-mix(in srgb, var(--accent) 45%, var(--glass-edge));
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--glass-shine);
}

.step {
  min-width: 44px;
  min-height: 44px;
  padding: 6px 8px;
  border: 0;
  border-left: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  background: color-mix(in srgb, var(--glass-fill) 55%, transparent);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.25;
  color: var(--ink);
  cursor: pointer;
}

.step:first-child {
  border-left: 0;
}

.step:hover {
  background: var(--inset-fill);
}

.step[aria-checked='true'] {
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font-weight: 600;
}

.step-1[aria-checked='true'],
.step-2[aria-checked='true'] {
  background: var(--warn);
  color: #fff;
}

@media (prefers-color-scheme: dark) {
  .step-1[aria-checked='true'],
  .step-2[aria-checked='true'] {
    color: #1d1300;
  }
}

.step-3[aria-checked='true'] {
  background: var(--ink-soft);
  color: var(--bg);
}

/* Narrow screens: the same words, smaller, so every step says what it means. */
@media (max-width: 640px) {
  .scale {
    width: 100%;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .step {
    min-width: 0;
    min-height: 44px;
    padding: 4px 2px;
    font-size: 0.75rem;
    overflow-wrap: anywhere;
  }
}
.more {
  justify-self: start;
  padding: 6px 0;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--overprint);
  background: none;
  border: 0;
  cursor: pointer;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.legend li {
  padding: 3px 10px;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
}

.legend strong {
  margin-right: 4px;
  font-weight: 650;
  color: var(--ink);
}
.scale-pick {
  margin-top: 10px;
}

.scale-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.scale-field select {
  max-width: 100%;
  min-height: 32px;
  padding: 4px 28px 4px 10px;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink);
  background: var(--field-fill);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.scale-note {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--ink-soft);
}
.suggest {
  flex: 1 0 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 2px 0 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.suggest-use {
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
</style>
