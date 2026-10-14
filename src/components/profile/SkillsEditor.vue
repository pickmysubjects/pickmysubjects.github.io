<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { courseFocus, type Skill } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

const skills = defineModel<Partial<Record<Skill, number>>>('skills', { required: true })
const { t } = useI18n()
const { data, course } = useDataset()
// The skills the student's own degree leans on come first (business for B-COM, programming for B-SCI).
const order = computed(() => courseFocus(data.value, course.value).skills)
// The first few, plus any already rated; the rest a tap away.
const FIRST = 8
const showAll = shallowRef(false)
const shown = computed(() => (showAll.value ? order.value : order.value.filter((k, i) => i < FIRST || skills.value[k] !== undefined)))
const hidden = computed(() => order.value.length - shown.value.length)

// Five steps, like a course survey: 1 = finds it hard … 5 = strong. Blank means "not sure".
const LEVELS = [1, 2, 3, 4, 5] as const
// The usual mark in that kind of subject for each level (UniMelb bands).
const RANGES: Record<number, string> = { 1: '<60', 2: '60–69', 3: '70–74', 4: '75–79', 5: '80+' }

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
      <p class="card-hint">{{ t('record.levelLegend') }}</p>
      <!-- What each level means, in marks: more accurate than a feeling (see the research notes). -->
      <ul class="legend">
        <li v-for="n in LEVELS" :key="n"><strong>{{ t(`record.level.${n}`) }}</strong> {{ RANGES[n] }}</li>
      </ul>
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
            <span class="step-num" aria-hidden="true">{{ n }}</span>
          </button>
        </span>
      </li>
    </ul>
    <button v-if="hidden > 0 || showAll" type="button" class="more" @click="showAll = !showAll">
      {{ showAll ? t('record.fewerSkills') : t('record.moreSkills', { n: hidden }) }}
    </button>
    <p class="scale-ends"><span>1 = {{ t('record.level.1') }}</span><span>5 = {{ t('record.level.5') }}</span></p>
  </section>
</template>

<style scoped>
.card {
  display: grid;
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
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line);
  font-size: 0.9375rem;
}

.scale {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  flex: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.step {
  min-width: 44px;
  min-height: 32px;
  padding: 6px 8px;
  border: 0;
  border-left: 1px solid var(--line);
  background: var(--surface);
  font: inherit;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.step:first-child {
  border-left: 0;
}

.step:hover {
  background: var(--surface-2);
}

.step[aria-checked='true'] {
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.step-1[aria-checked='true'],
.step-2[aria-checked='true'] {
  background: var(--warn);
  color: #fff;
}

.step-3[aria-checked='true'] {
  background: var(--ink-soft);
  color: var(--bg);
}

.step-num {
  display: none;
}

/* Narrow screens: numbers only, with the two ends labelled below the list. */
@media (max-width: 640px) {
  .step-label {
    display: none;
  }

  .step-num {
    display: inline;
  }

  .step {
    min-width: 36px;
    min-height: 36px;
  }
}
.scale-ends {
  display: none;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

@media (max-width: 640px) {
  .scale-ends {
    display: flex;
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
</style>
