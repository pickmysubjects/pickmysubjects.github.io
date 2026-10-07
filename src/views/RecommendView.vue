<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { recommend, termLabel, type Goal } from '@/engine'
import RecommendationCard from '@/components/recommend/RecommendationCard.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'

const { name, data } = useDataset()
const { profile, setGoal } = useProfile()
const plan = usePlan()

const category = shallowRef('')
const termIndex = shallowRef(-1)

const goals: { value: Goal; label: string; hint: string }[] = [
  { value: 'wam', label: 'Protect my WAM', hint: 'Weights approachable, generously marked subjects you are likely to do well in.' },
  { value: 'balanced', label: 'Balanced', hint: 'Mixes interest, fit and difficulty.' },
  { value: 'challenge', label: 'Stretch me', hint: 'Favours what interests you and what it unlocks, even if it is hard.' },
]

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
      <h1 class="suggest-title">Subjects that suit you</h1>
      <p class="suggest-lede">
        Ranked from your record, skills and interests. Every score comes with its reasons, and subjects already in your
        plan or ruled out by prerequisites are left out.
      </p>
      <p v-if="!hasProfile" class="suggest-empty">
        These are generic until you <a href="#/record">add your results, skills and interests</a>.
      </p>
    </section>

    <form class="filters" @submit.prevent>
      <fieldset class="goal">
        <legend class="field">What matters most this time?</legend>
        <label v-for="g in goals" :key="g.value" class="goal-option" :title="g.hint">
          <input type="radio" name="goal" :value="g.value" :checked="profile.goal === g.value" @change="setGoal(g.value)" />
          {{ g.label }}
        </label>
      </fieldset>
      <label class="field">
        Kind of subject
        <select class="select" :value="category" @change="category = value($event)">
          <option value="">Any</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="field">
        For which semester
        <select class="select" :value="termIndex" @change="termIndex = Number(value($event))">
          <option :value="-1">Any time</option>
          <option v-for="(t, i) in plan.terms.value" :key="i" :value="i">{{ termLabel(t) }}</option>
        </select>
      </label>
    </form>

    <p v-if="recs.length === 0" class="suggest-empty">
      Nothing matches these filters. Try “Any” for the kind of subject or semester.
    </p>
    <div class="rec-list">
      <RecommendationCard
        v-for="r in recs"
        :key="r.code"
        :rec="r"
        :subject="data.subjects[r.code]"
        :show-links="name === 'real'"
        :add-label="selectedTerm ? termLabel(selectedTerm) : null"
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
