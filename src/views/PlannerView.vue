<script setup lang="ts">
import { computed, onMounted } from 'vue'
import PlanSetup from '@/components/planner/PlanSetup.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import RuleLegend from '@/components/planner/RuleLegend.vue'
import PlanIssues from '@/components/planner/PlanIssues.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan, type PlanSetup as Setup } from '@/composables/usePlan'

const { data, subjectList } = useDataset()
const plan = usePlan()

const setup = computed({
  get: () => plan.setup.value,
  set: (value: Setup) => plan.updateSetup(value),
})
const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
const allIssues = computed(() => [...plan.termIssues.value, ...plan.courseCheck.value.issues])

// First visit: show a worked example rather than an empty board.
onMounted(() => {
  if (plan.isEmpty.value && plan.notes.value.length === 0) plan.generate()
})
</script>

<template>
  <div class="planner">
    <section class="planner-intro">
      <h1 class="planner-title">Your degree, as a route</h1>
      <p class="planner-lede">
        Each column is a semester and each card a subject. Magenta lines show which subjects unlock which — hover a
        card to trace its path. Drag cards between semesters; the checks update as you go.
      </p>
      <PlanSetup
        v-model="setup"
        :courses="data.courses"
        :components="data.components"
        @generate="plan.generate()"
        @start-empty="plan.startEmpty()"
      />
    </section>

    <div class="planner-body">
      <PlanMap
        class="planner-map"
        :terms="plan.terms.value"
        :subjects="data.subjects"
        :issues="plan.termIssues.value"
        :course="plan.setup.value.course"
        :load="plan.course.value?.standardLoad ?? 50"
        :options="options"
        @add="plan.addSubject"
        @remove="plan.removeSubject"
        @move="plan.moveSubject"
        @add-term="plan.addTerm()"
        @remove-last-term="plan.removeLastTerm()"
      />
      <aside class="planner-rail surface">
        <RuleLegend :statuses="plan.courseCheck.value.statuses" :title="plan.course.value?.title ?? 'Course rules'" />
        <PlanIssues :issues="allIssues" />
        <details v-if="plan.notes.value.length || plan.unplaced.value.length" class="how">
          <summary>How this plan was built</summary>
          <ul class="how-list">
            <li v-for="u in plan.unplaced.value" :key="u.code" class="how-unplaced">
              Couldn't place {{ u.code }}: {{ u.reason }}.
            </li>
            <li v-for="(n, i) in plan.notes.value" :key="i">{{ n }}</li>
          </ul>
        </details>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.planner {
  display: grid;
  gap: 20px;
}

.planner-intro {
  display: grid;
  gap: 12px;
}

.planner-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.planner-lede {
  max-width: 68ch;
  margin: 0;
  color: var(--ink-soft);
}

.planner-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.planner-rail {
  display: grid;
  gap: 22px;
  padding: 18px;
}

.how {
  font-size: 0.84rem;
}

.how summary {
  cursor: pointer;
  font-weight: 600;
}

.how-list {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--ink-soft);
}

.how-unplaced {
  color: var(--stop);
}

@media (max-width: 960px) {
  .planner-body {
    grid-template-columns: 1fr;
  }
}
</style>
