<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Target } from 'lucide-vue-next'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { usePlan } from '@/composables/usePlan'
import { gradeOf, neededAverage, pointsLeft, projectedWam } from '@/utils/wamGoal'

/** "What do I need on the rest to reach my target WAM?", from the marks on this page. */
const { data } = useDataset()
const { profile, wam } = useProfile()
const { course } = usePlan()
// The planned degree's points (B-SCIEXTD: 350); 300, the usual bachelor's, before one is chosen.
const degreePoints = computed(() => course.value?.totalPoints ?? 300)
// Points the WAM is worked out over: every marked attempt, fails included.
const { t } = useI18n()

const donePoints = computed(() =>
  profile.value.results.filter((r) => r.mark !== undefined && !data.value.subjects[r.code]?.passFail).reduce((sum, r) => sum + (data.value.subjects[r.code]?.points ?? 12.5), 0),
)

// Start from the student's own numbers; they can change any of them.
const current = shallowRef(wam.value ?? 70)
const done = shallowRef(donePoints.value)
const remaining = computed(() => pointsLeft(profile.value.results, data.value, degreePoints.value))
const left = shallowRef(remaining.value)
const target = shallowRef(Math.min(100, Math.ceil((wam.value ?? 70) + 3)))
const average = shallowRef(75)
watch([wam, donePoints, remaining], ([w, d, r]) => {
  if (w !== null) current.value = w
  done.value = d
  left.value = r
})

const need = computed(() => neededAverage(current.value, done.value, target.value, left.value))
const projected = computed(() => projectedWam(current.value, done.value, average.value, left.value))
const verdict = computed(() => {
  const n = need.value
  if (n === null) return t.value('wamGoal.nothingLeft')
  if (n > 100) return t.value('wamGoal.outOfReach')
  if (n <= 50) return t.value('wamGoal.justPass')
  return t.value('wamGoal.need', { mark: n, grade: gradeOf(n), n: left.value / 12.5 })
})
const num = (e: Event) => Number((e.target as HTMLInputElement).value)
</script>

<template>
  <section class="goal surface" aria-labelledby="goal-title">
    <h2 id="goal-title" class="goal-title"><Target :size="18" aria-hidden="true" /> {{ t('wamGoal.title') }}</h2>
    <!-- With no marks yet there's nothing to work out: the WAM will simply be whatever the rest averages. -->
    <p v-if="donePoints === 0" class="goal-hint">{{ t('wamGoal.noMarks') }}</p>
    <template v-else>
    <p class="goal-hint">{{ t('wamGoal.fromMarks') }}</p>

    <div class="fields">
      <label class="field">
        {{ t('wamGoal.current') }}
        <input class="input" type="number" min="0" max="100" step="0.1" :value="current" @input="current = num($event)" />
      </label>
      <label class="field">
        {{ t('wamGoal.done') }}
        <input class="input" type="number" min="0" max="600" step="12.5" :value="done" @input="done = num($event)" />
      </label>
      <label class="field">
        {{ t('wamGoal.left') }}
        <input class="input" type="number" min="0" max="600" step="12.5" :value="left" @input="left = num($event)" />
      </label>
      <label class="field">
        {{ t('wamGoal.target') }}
        <input class="input" type="number" min="0" max="100" step="1" :value="target" @input="target = num($event)" />
      </label>
    </div>

    <p class="answer" role="status">{{ verdict }}</p>

    <p class="whatif">
      <label>
        {{ t('wamGoal.ifAverage') }}
        <input class="input small" type="number" min="0" max="100" step="1" :value="average" @input="average = num($event)" />
      </label>
      <span v-if="projected !== null">{{ t('wamGoal.becomes', { wam: projected }) }}</span>
    </p>
    <p class="note">{{ t('wamGoal.note') }}</p>
    </template>
  </section>
</template>

<style scoped>
.goal {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
}

.goal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 650;
}

.goal-title svg {
  color: var(--accent);
}

.goal-hint,
.note {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.answer {
  padding: 12px 14px;
  font-weight: 600;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.whatif {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 0.9375rem;
}

.whatif label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.small {
  width: 84px;
  padding: 6px 10px;
}
</style>
