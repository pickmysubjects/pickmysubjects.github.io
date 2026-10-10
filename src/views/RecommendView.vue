<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { recommend, yearLevel, type Goal, passedCodes } from '@/engine'
import { useI18n } from '@/i18n'
import { categoryLabel, termLabel } from '@/i18n/format'
import RecommendationCard from '@/components/recommend/RecommendationCard.vue'
import QuickInterests from '@/components/recommend/QuickInterests.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'

const { data } = useDataset()
const { profile, setGoal } = useProfile()
const plan = usePlan()

const category = shallowRef('')
// Ten at a time: a long wall of cards is hard to compare.
const PAGE = 10
const shown = shallowRef(PAGE)
const termIndex = shallowRef(-1)

const { t } = useI18n()
const goals: Goal[] = ['wam', 'balanced', 'challenge']

const categories = computed(() => plan.course.value?.categories ?? [])
const selectedTerm = computed(() => plan.terms.value[termIndex.value])
const hasProfile = computed(
  () => profile.value.results.length > 0 || Object.keys(profile.value.skills).length > 0 || profile.value.interests.length > 0,
)

// Nothing to go on yet (or only interests): offer the interest chips right here.
const showQuick = computed(() => profile.value.results.length === 0 && Object.keys(profile.value.skills).length === 0)

// For a chosen semester, what's done by then counts: passed subjects plus everything planned
// in earlier semesters, both for prerequisites and for the year level (100 points a year).
const before = computed(() =>
  termIndex.value < 0 ? null : [...passedCodes(profile.value.results), ...plan.terms.value.slice(0, termIndex.value).flatMap((t) => t.subjects)],
)
const maxLevel = computed(() => {
  if (!before.value) return yearLevel(profile.value.results, data.value)
  const points = before.value.reduce((sum, c) => sum + (data.value.subjects[c]?.points ?? 12.5), 0)
  return Math.min(3, Math.floor(points / 100) + 1)
})

const recs = computed(() =>
  recommend(data.value, profile.value, {
    planned: plan.plannedCodes.value,
    course: plan.setup.value.course,
    category: category.value || undefined,
    term: selectedTerm.value ? { year: selectedTerm.value.year, period: selectedTerm.value.period } : undefined,
    maxLevel: maxLevel.value,
    eligibleWith: before.value ?? undefined,
    termSubjects: selectedTerm.value?.subjects,
    programme: {
      courseYear: plan.setup.value.courseYear,
      components: [plan.setup.value.major, plan.setup.value.specialisation].filter(Boolean),
    },
  })
    .slice(0, 30),
)

function value(event: Event): string {
  return (event.target as HTMLSelectElement).value
}
</script>

<template>
  <div class="suggest">
    <section class="suggest-intro">
      <h1 class="suggest-title">{{ t('suggest.title') }}</h1>
      <p class="suggest-lede">{{ t('suggest.lede') }}</p>
    </section>

    <QuickInterests v-if="showQuick" :count="recs.length" />

    <template v-if="hasProfile">
      <form class="filters" @submit.prevent>
        <fieldset class="goal">
          <legend class="field">{{ t('suggest.goal') }}</legend>
          <label v-for="g in goals" :key="g" class="goal-option" :title="t(`suggest.goals.${g}Hint`)">
            <input type="radio" name="goal" :value="g" :checked="profile.goal === g" @change="setGoal(g)" />
            {{ t(`suggest.goals.${g}`) }}
          </label>
          <p class="goal-hint">{{ t(`suggest.goals.${profile.goal}Hint`) }}</p>
        </fieldset>
        <label class="field">
          {{ t('suggest.kind') }}
          <select class="select-glass" :value="category" @change="category = value($event)">
            <option value="">{{ t('suggest.any') }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ categoryLabel(t, c) }}</option>
          </select>
        </label>
        <label class="field">
          {{ t('suggest.when') }}
          <select class="select-glass" :value="termIndex" @change="termIndex = Number(value($event))">
            <option :value="-1">{{ t('suggest.anyTime') }}</option>
            <option v-for="(term, i) in plan.terms.value" :key="i" :value="i">{{ termLabel(t, term) }}</option>
          </select>
        </label>
      </form>

      <p v-if="recs.length === 0" class="suggest-empty">{{ t('suggest.nothing') }}</p>
      <div id="suggestions" class="rec-list">
        <RecommendationCard
          v-for="r in recs.slice(0, shown)"
          :key="r.code"
          :rec="r"
          :subject="data.subjects[r.code]"
          :add-label="selectedTerm ? termLabel(t, selectedTerm) : null"
          :year="selectedTerm?.year ?? plan.terms.value[0]?.year ?? new Date().getFullYear()"
          @add="plan.addSubject(termIndex, r.code)"
        />
      </div>
      <button v-if="recs.length > shown" class="button button-quiet more" type="button" @click="shown += PAGE">
        {{ t('suggest.showMore', { n: Math.min(PAGE, recs.length - shown) }) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.suggest {
  padding-top: 32px;
  display: grid;
  gap: 18px;
  max-width: 1100px;
}


.suggest-lede {
  max-width: 62ch;
  margin: 12px 0 0;
  color: var(--ink-soft);
}

.suggest-empty {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-left: 3px solid var(--overprint);
  background: var(--overprint-tint);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px 20px;
}

.filters > .field {
  flex: 0 1 200px;
}

.goal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.goal legend {
  margin-bottom: 4px;
}

.goal-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--contour);
  border-radius: var(--radius);
  background: var(--paper-raised);
  font-weight: 600;
  cursor: pointer;
}

.goal-option:has(input:checked) {
  border-color: var(--overprint);
  box-shadow: inset 0 0 0 1px var(--overprint);
}

.goal-option input {
  accent-color: var(--overprint);
}

.rec-list {
  display: grid;
  gap: 16px;
}

/* Two cards a row once there's room: easier to compare side by side. */
@media (min-width: 1000px) {
  .rec-list {
    grid-template-columns: 1fr 1fr;
  }
}
.goal-hint {
  flex-basis: 100%;
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}
.more {
  justify-self: center;
}
</style>
