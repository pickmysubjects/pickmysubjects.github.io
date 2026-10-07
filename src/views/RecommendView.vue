<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { recommend, type Goal } from '@/engine'
import Interp from '@/components/Interp.vue'
import { useI18n } from '@/i18n'
import { categoryLabel, termLabel } from '@/i18n/format'
import RecommendationCard from '@/components/recommend/RecommendationCard.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'

const { name, data } = useDataset()
const { profile, setGoal } = useProfile()
const plan = usePlan()

const category = shallowRef('')
const termIndex = shallowRef(-1)

const { t } = useI18n()
const goals: Goal[] = ['wam', 'balanced', 'challenge']

const categories = computed(() => plan.course.value?.categories ?? [])
const selectedTerm = computed(() => plan.terms.value[termIndex.value])
const hasProfile = computed(
  () => profile.value.results.length > 0 || Object.keys(profile.value.skills).length > 0 || profile.value.interests.length > 0,
)

const recs = computed(() =>
  recommend(data.value, profile.value, {
    planned: plan.plannedCodes.value,
    course: plan.setup.value.course,
    category: category.value || undefined,
    term: selectedTerm.value ? { year: selectedTerm.value.year, period: selectedTerm.value.period } : undefined,
    limit: 30,
  }),
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
      <p v-if="!hasProfile" class="suggest-empty">
        <Interp :text="t('suggest.emptyProfile')">
          <template #link>
            <a href="#/record">{{ t('suggest.emptyProfileLink') }}</a>
          </template>
        </Interp>
      </p>
    </section>

    <form class="filters" @submit.prevent>
      <fieldset class="goal">
        <legend class="field">{{ t('suggest.goal') }}</legend>
        <label v-for="g in goals" :key="g" class="goal-option" :title="t(`suggest.goals.${g}Hint`)">
          <input type="radio" name="goal" :value="g" :checked="profile.goal === g" @change="setGoal(g)" />
          {{ t(`suggest.goals.${g}`) }}
        </label>
      </fieldset>
      <label class="field">
        {{ t('suggest.kind') }}
        <select class="select" :value="category" @change="category = value($event)">
          <option value="">{{ t('suggest.any') }}</option>
          <option v-for="c in categories" :key="c" :value="c">{{ categoryLabel(t, c) }}</option>
        </select>
      </label>
      <label class="field">
        {{ t('suggest.when') }}
        <select class="select" :value="termIndex" @change="termIndex = Number(value($event))">
          <option :value="-1">{{ t('suggest.anyTime') }}</option>
          <option v-for="(term, i) in plan.terms.value" :key="i" :value="i">{{ termLabel(t, term) }}</option>
        </select>
      </label>
    </form>

    <p v-if="recs.length === 0" class="suggest-empty">{{ t('suggest.nothing') }}</p>
    <div class="rec-list">
      <RecommendationCard
        v-for="r in recs"
        :key="r.code"
        :rec="r"
        :subject="data.subjects[r.code]"
        :show-links="name === 'real'"
        :add-label="selectedTerm ? termLabel(t, selectedTerm) : null"
        @add="plan.addSubject(termIndex, r.code)"
      />
    </div>
  </div>
</template>

<style scoped>
.suggest {
  display: grid;
  gap: 18px;
  max-width: 900px;
}

.suggest-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.suggest-lede {
  margin: 8px 0 0;
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
  gap: 12px;
}
</style>
