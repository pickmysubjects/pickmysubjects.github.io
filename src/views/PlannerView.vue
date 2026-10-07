<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { CircleCheck, Pencil, RotateCcw, TriangleAlert } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import RuleLegend from '@/components/planner/RuleLegend.vue'
import PlanIssues from '@/components/planner/PlanIssues.vue'
import DataNotice from '@/components/DataNotice.vue'
import Interp from '@/components/Interp.vue'
import { planStart } from '@/engine'
import { useProfile } from '@/composables/useProfile'
import { useDataset } from '@/composables/useDataset'
import { usePlan, type PlanSetup } from '@/composables/usePlan'
import { useI18n } from '@/i18n'
import { noteText, termLabel } from '@/i18n/format'

// The wizard copies the setup once, so it restarts when the dataset is switched.
const { data, subjectList, name: dataName } = useDataset()
const plan = usePlan()
const { profile } = useProfile()
const { t } = useI18n()

const editing = shallowRef(false)
// Started before now but no record yet: the plan can't know what's done.
const startedWithoutRecord = computed(() => {
  const { startYear: year, startPeriod: period } = plan.setup.value
  const start = planStart({ year, period }, new Date())
  return (start.year !== year || start.period !== period) && profile.value.results.length === 0
})
const showWizard = computed(() => editing.value || (plan.isEmpty.value && plan.notes.value.length === 0))

const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
const rules = computed(() => plan.course.value?.rules ?? [])
const allIssues = computed(() => [...plan.termIssues.value, ...plan.courseCheck.value.issues])
const notes = computed(() => plan.notes.value.map((n) => noteText(t.value, n, rules.value)))

const problems = computed(() => allIssues.value.filter((i) => i.severity === 'error').length)
const unknowns = computed(
  () =>
    plan.courseCheck.value.statuses.filter((s) => s.status === 'unknown').length +
    plan.termIssues.value.filter((i) => i.severity === 'warning').length,
)
const majorTitle = computed(
  () => data.value.components.find((c) => c.id === plan.setup.value.major)?.title ?? t.value('wizard.notSure'),
)
const summary = computed(() =>
  t.value('wizard.summary', {
    course: plan.course.value?.title ?? plan.setup.value.course,
    term: termLabel(t.value, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }),
    major: majorTitle.value,
  }),
)

function finishWizard(setup: PlanSetup): void {
  plan.updateSetup(setup)
  plan.generate()
  editing.value = false
}
</script>

<template>
  <div class="planner">
    <section class="intro">
      <h1 class="page-title">{{ t('plan.title') }}</h1>
    </section>

    <DataNotice />

    <PlanWizard
      v-if="showWizard"
      :key="dataName"
      :setup="plan.setup.value"
      :courses="data.courses"
      :components="data.components"
      @done="finishWizard"
      @cancel="editing = false"
    />

    <template v-else>
      <section class="bar">
        <p class="bar-summary">{{ summary }}</p>
        <div class="bar-actions">
          <button class="button button-quiet" type="button" @click="editing = true">
            <Pencil :size="16" aria-hidden="true" /> {{ t('wizard.edit') }}
          </button>
          <button class="button button-quiet" type="button" @click="plan.generate()">
            <RotateCcw :size="16" aria-hidden="true" /> {{ t('plan.rebuild') }}
          </button>
        </div>
      </section>

      <p v-if="startedWithoutRecord" class="started">
        <Interp :text="t('plan.started')">
          <template #record>
            <a href="#/record">{{ t('nav.record') }}</a>
          </template>
        </Interp>
      </p>

      <section class="status" :class="problems ? 'status-bad' : unknowns ? 'status-warn' : 'status-good'" role="status">
        <component :is="problems || unknowns ? TriangleAlert : CircleCheck" :size="22" aria-hidden="true" />
        <div>
          <p class="status-title">
            <template v-if="problems">{{ t('plan.statusProblems', { n: problems }) }}</template>
            <template v-else-if="unknowns">{{ t('plan.statusUnknown', { n: unknowns }) }}</template>
            <template v-else>{{ t('plan.statusOk') }}</template>
          </p>
        </div>
      </section>

      <PlanMap
        class="map"
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

      <details class="details surface">
        <summary class="details-summary">{{ t('plan.details') }}</summary>
        <div class="details-body">
          <RuleLegend :statuses="plan.courseCheck.value.statuses" :rules="rules" :title="plan.course.value?.title ?? ''" />
          <PlanIssues :issues="allIssues" :rules="rules" :statuses="plan.courseCheck.value.statuses" />
          <div v-if="notes.length || plan.unplaced.value.length" class="how">
            <h2 class="how-title">{{ t('plan.howBuilt') }}</h2>
            <ul class="how-list">
              <li v-for="u in plan.unplaced.value" :key="u.code" class="how-unplaced">
                {{ t('plan.unplaced', { code: u.code, reason: u.reasonKey ? t(`unplacedReason.${u.reasonKey}`) : u.reason }) }}
              </li>
              <li v-for="(n, i) in notes" :key="i">{{ n }}</li>
            </ul>
          </div>
        </div>
      </details>
    </template>
  </div>
</template>

<style scoped>
.planner {
  display: grid;
  gap: 20px;
  padding-top: 32px;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.bar-summary {
  font-size: 1.05rem;
  font-weight: 600;
}

.bar-actions {
  display: flex;
  gap: 8px;
}

.started {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: var(--accent-soft);
  font-size: 0.95rem;
}

.status {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
}

.status-good {
  background: var(--good-soft);
  color: var(--good);
}

.status-warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.status-bad {
  background: var(--bad-soft);
  color: var(--bad);
}

.status-title {
  font-weight: 650;
}

.status-text {
  margin-top: 2px;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.details {
  padding: 4px 22px;
}

.details-summary {
  padding: 16px 0;
  font-weight: 600;
  cursor: pointer;
}

.details-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  padding: 4px 0 22px;
}

.how {
  grid-column: 1 / -1;
}

.how-title {
  font-size: 0.95rem;
  font-weight: 650;
}

.how-list {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.how-unplaced {
  color: var(--bad);
}

@media (max-width: 860px) {
  .details-body {
    grid-template-columns: 1fr;
  }
}
</style>
