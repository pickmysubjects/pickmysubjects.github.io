<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Pencil } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import type { PlanSetup } from '@/composables/usePlan'
import { usePlan } from '@/composables/usePlan'
import { useDataset } from '@/composables/useDataset'
import { termLabel } from '@/i18n/format'
import { informalPicks } from '@/engine'
import { useI18n } from '@/i18n'
import { diplomaTitle } from '@/composables/usePlanCompare'
import { useProfile } from '@/composables/useProfile'
import { creditPoints } from '@/engine/credit'

/**
 * Your degree, major and start, on My page: the same three questions as the plan page and the
 * same saved setup, so suggestions and the plan both follow it.
 */
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const editing = shallowRef(false)

// Until the questions have been answered once, the setup is only the default.
const chosen = plan.setupChosen
const title = (id: string) => data.value.components.find((c) => c.id === id)?.title
const course = computed(() => data.value.courses.find((c) => c.code === plan.setup.value.course)?.title ?? plan.setup.value.course)
const major = computed(
  () =>
    title(plan.setup.value.major) ??
    (plan.setup.value.field ? t.value('wizard.fieldUndecided', { field: t.value(`majorGroup.${plan.setup.value.field}`) }) : t.value('wizard.notSure')),
)
const major2 = computed(() => (plan.plan.value.major2 ? title(plan.plan.value.major2) : undefined))
const spec = computed(() => title(plan.setup.value.specialisation))
const minorKey = computed(() => (informalPicks(data.value, plan.setup.value.minors) ? 'plans.informalLine' : 'plans.minorLine'))
const minor = computed(() => (plan.setup.value.minors ?? []).map(title).filter(Boolean).join(' + '))
const diploma = computed(() => diplomaTitle(data.value, plan.setup.value))
const start = computed(() => termLabel(t.value, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }))

// Points so far: passed (or not yet marked) subjects plus credit, against the degree's total.
const { profile } = useProfile()
const totalPoints = computed(() => data.value.courses.find((c) => c.code === plan.setup.value.course)?.totalPoints ?? 0)
const pointsDone = computed(
  () =>
    profile.value.results.filter((r) => r.mark === undefined || r.mark === null || r.mark >= 50).reduce((n, r) => n + (data.value.subjects[r.code]?.points ?? 0), 0) +
    creditPoints(profile.value.credit),
)
const pct = computed(() => (totalPoints.value ? Math.min(100, (pointsDone.value / totalPoints.value) * 100) : 0))
// The picks beyond the degree itself, each as its own chip.
const picks = computed(() =>
  [
    major.value,
    major2.value,
    spec.value,
    minor.value ? t.value(minorKey.value, { title: minor.value }) : undefined,
    diploma.value ? t.value('plans.diplomaLine', { title: diploma.value }) : undefined,
    t.value('record.degreeStart', { term: start.value }),
    plan.setup.value.load ? t.value('record.degreeLoad', { n: plan.setup.value.load }) : undefined,
  ].filter((x): x is string => Boolean(x)),
)

function done(setup: PlanSetup): void {
  if (!plan.updateSetup(setup)) plan.generate()
  editing.value = false
}
</script>

<template>
  <div class="degree">
    <header class="degree-head">
      <div class="degree-text">
        <template v-if="chosen">
          <p class="degree-course">{{ course }}</p>
          <ul class="degree-picks">
            <li v-for="(x, i) in picks" :key="i" :class="{ main: i === 0 }">{{ x }}</li>
          </ul>
        </template>
        <p v-else class="degree-line">{{ t('record.degreeNone') }}</p>
      </div>
      <button v-if="!editing" type="button" class="button degree-edit" :class="chosen ? 'button-quiet' : 'button-accent'" @click="editing = true">
        <Pencil v-if="chosen" :size="15" aria-hidden="true" />
        {{ chosen ? t('record.degreeEdit') : t('record.degreeChoose') }}
      </button>
    </header>
    <div v-if="chosen && totalPoints && !editing" class="degree-progress">
      <div class="bar" aria-hidden="true"><span :style="{ width: `${pct}%` }" /></div>
      <span class="bar-text">{{ t('ruleDetail.pointsMin', { have: pointsDone, need: totalPoints }) }}</span>
    </div>
    <p v-if="editing && !plan.isEmpty.value" class="degree-warn">{{ t('record.degreeRebuild') }}</p>
    <PlanWizard
      v-if="editing"
      class="degree-wizard"
      :setup="plan.setup.value"
      :courses="data.courses.filter((c) => c.listed)"
      :components="data.components"
      @done="done"
      @cancel="editing = false"
    />
  </div>
</template>

<style scoped>
.degree {
  display: grid;
  gap: 12px;
}

.degree-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}


.degree-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  /* Grows beside the button, but drops the button to its own line rather than
     squeezing the text into a narrow column (any language, any width). */
  flex: 1 1 14em;
}


.degree-course {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.degree-picks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.degree-picks li {
  padding: 4px 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), color-mix(in srgb, var(--glass-fill) 60%, transparent);
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.degree-picks li.main {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: var(--accent-soft);
  font-weight: 600;
  color: var(--ink);
}

.degree-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 9%, transparent);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
}

.bar-text {
  flex: none;
  font-family: var(--font-code);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}

.degree-line {
  margin: 0;
  color: var(--ink);
}

.degree-why,
.degree-warn {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.degree-warn {
  color: var(--warn);
}

.degree-edit {
  flex: none;
  min-height: 44px;
  padding: 0 16px;
  font-size: 0.875rem;
}

/* The wizard brings its own card; inside this one it sits flat. */
.degree .degree-wizard,
.degree .degree-wizard::before {
  box-shadow: none;
  border: 0;
  padding: 0;
  background: none;
  max-width: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
</style>
