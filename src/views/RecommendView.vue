<script setup lang="ts">
import MySteps from '@/components/layout/MySteps.vue'
import { computed, shallowRef } from 'vue'
import { recommend, yearLevel, passedCodes, type Goal } from '@/engine'
import { useI18n } from '@/i18n'
import { categoryLabel, termLabel } from '@/i18n/format'
import RecommendationCard from '@/components/recommend/RecommendationCard.vue'
import QuickInterests from '@/components/recommend/QuickInterests.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import { usePersisted } from '@/composables/usePersisted'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'

const { data } = useDataset()
const { profile } = useProfile()
const plan = usePlan()
// Its own goal, apart from the one on My page that the plan follows: a student planning a balanced
// degree may still want to look for easy marks here. Starts from My page's until changed.
const GOALS: Goal[] = ['wam', 'balanced', 'challenge', 'easy']
const lookGoal = usePersisted<Goal | null>('sc:suggestGoal', null, (x) => (GOALS.includes(x as Goal) ? (x as Goal) : null))
const goal = computed<Goal>(() => lookGoal.value ?? profile.value.goal)

const category = shallowRef('')
// Ten at a time: a long wall of cards is hard to compare.
const PAGE = 10
const shown = shallowRef(PAGE)
const termIndex = shallowRef(-1)

const { t } = useI18n()

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
  recommend(data.value, { ...profile.value, goal: goal.value }, {
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
    <MySteps />
    <section class="suggest-intro">
      <h1 class="suggest-title">{{ t('suggest.title') }}</h1>
      <p class="suggest-lede">{{ t('suggest.lede') }}</p>
    </section>

    <QuickInterests v-if="showQuick" :count="recs.length" />

    <template v-if="hasProfile">
      <form class="filters" @submit.prevent>
        <GoalPicker with-easy :goal="goal" :note="t('suggest.goalLocal')" @update:goal="lookGoal = $event" />
        <label class="field">
          <span class="field-label">{{ t('suggest.kind') }}</span>
          <select class="select-glass" :value="category" @change="category = value($event)">
            <option value="">{{ t('suggest.any') }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ categoryLabel(t, c) }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">{{ t('suggest.when') }}</span>
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

/* One row on a laptop: what matters most (with its one-line hint under it), then the two
   selects. Labels sit on the same line so the row reads as one. */
.filters {
  display: grid;
  grid-template-columns: auto minmax(150px, 200px) minmax(150px, 220px);
  justify-content: start;
  align-items: start;
  gap: 12px 20px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-label {
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}







.select-glass {
  width: 100%;
}

/* Narrower: the goal on its own line, the two selects side by side under it. */
@media (max-width: 820px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }

  .goal {
    grid-column: 1 / -1;
  }
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
.more {
  justify-self: center;
}
</style>
