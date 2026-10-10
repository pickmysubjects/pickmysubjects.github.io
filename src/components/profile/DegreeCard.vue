<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { GraduationCap, Pencil } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import type { PlanSetup } from '@/composables/usePlan'
import { usePlan } from '@/composables/usePlan'
import { useDataset } from '@/composables/useDataset'
import { termLabel } from '@/i18n/format'
import { useI18n } from '@/i18n'

/**
 * Your degree, major and start, on My page: the same three questions as the plan page and the
 * same saved setup, so suggestions and the plan both follow it.
 */
const { data } = useDataset()
const plan = usePlan()
const { t } = useI18n()
const editing = shallowRef(false)

// Until the questions have been answered once, the setup is only the default.
const chosen = computed(() => !plan.isEmpty.value || plan.notes.value.length > 0)
const title = (id: string) => data.value.components.find((c) => c.id === id)?.title
const course = computed(() => data.value.courses.find((c) => c.code === plan.setup.value.course)?.title ?? plan.setup.value.course)
const major = computed(
  () =>
    title(plan.setup.value.major) ??
    (plan.setup.value.field ? t.value('wizard.fieldUndecided', { field: t.value(`majorGroup.${plan.setup.value.field}`) }) : t.value('wizard.notSure')),
)
const spec = computed(() => title(plan.setup.value.specialisation))
const start = computed(() => termLabel(t.value, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }))

function done(setup: PlanSetup): void {
  plan.updateSetup(setup)
  plan.generate()
  editing.value = false
}
</script>

<template>
  <section class="degree surface" aria-labelledby="degree-title">
    <header class="degree-head">
      <GraduationCap :size="20" aria-hidden="true" class="degree-icon" />
      <div class="degree-text">
        <h2 id="degree-title" class="degree-title">{{ t('record.degreeTitle') }}</h2>
        <p v-if="chosen" class="degree-line">
          <strong>{{ course }}</strong> · {{ major }}<template v-if="spec"> + {{ spec }}</template> · {{ t('record.degreeStart', { term: start }) }}
        </p>
        <p v-else class="degree-line">{{ t('record.degreeNone') }}</p>
      </div>
      <button v-if="!editing" type="button" class="button button-quiet degree-edit" @click="editing = true">
        <Pencil v-if="chosen" :size="15" aria-hidden="true" />
        {{ chosen ? t('record.degreeEdit') : t('record.degreeChoose') }}
      </button>
    </header>
    <p v-if="editing && !plan.isEmpty.value" class="degree-warn">{{ t('record.degreeRebuild') }}</p>
    <PlanWizard
      v-if="editing"
      class="degree-wizard"
      :setup="plan.setup.value"
      :courses="data.courses"
      :components="data.components"
      @done="done"
      @cancel="editing = false"
    />
  </section>
</template>

<style scoped>
.degree {
  display: grid;
  gap: 12px;
  padding: 18px 22px;
}

.degree-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.degree-icon {
  flex: none;
  margin-top: 2px;
  color: var(--accent);
}

.degree-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.degree-title {
  font-size: 1rem;
  font-weight: 650;
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
  min-height: 36px;
  padding: 0 14px;
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

@media (max-width: 520px) {
  .degree-head {
    flex-wrap: wrap;
  }
}
</style>
