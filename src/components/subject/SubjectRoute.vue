<script setup lang="ts">
import { computed } from 'vue'
import { isFail, prerequisiteRoute, referencedSubjects, simplifyFor, type Subject } from '@/engine'
import SubjectLinks from '@/components/majors/SubjectLinks.vue'
import SubjectTimeline from '@/components/planner/SubjectTimeline.vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { usePhone } from '@/composables/usePhone'
import { describeReq, requirementList, termLabel } from '@/i18n/format'
import type { Edge } from '@/utils/planBoard'

/**
 * Where the subject sits in a degree: what it needs (and when the student has those), the
 * subject, and what it unlocks, as the planner's chain; then the exact rule and the rest.
 */
const props = defineProps<{ subject: Subject; year: number; unlocks: string[] }>()
const plan = usePlan()
const { data } = useDataset()
const { profile } = useProfile()
const { t } = useI18n()
// On phones the chain above already shows the subjects; the full lists fold under it.
const phone = usePhone()

const course = computed(() => plan.setup.value.course)
const code = computed(() => props.subject.code)
const needs = computed(() => simplifyFor(props.subject.prerequisites, course.value))
const needCodes = computed(() => referencedSubjects(needs.value))
const needsList = computed(() => requirementList(t.value, needs.value))
const have = computed(() => new Set([...plan.plannedCodes.value, ...plan.plan.value.completed]))
const route = computed(() => prerequisiteRoute(code.value, data.value.subjects, course.value, have.value))
const routeMissing = computed(() => route.value.filter((c) => !have.value.has(c)).length)
const coreq = computed(() => {
  const co = props.subject.corequisites
  return co && co !== 'none' && co !== 'unknown' ? describeReq(t.value, co, course.value) : ''
})
const blocks = computed(() => (props.subject.nonAllowed !== 'unknown' ? props.subject.nonAllowed : []))

// The chain shows the first few it unlocks (the student's own first); the full list sits below.
const CHAIN_UNLOCKS = 6
const chainUnlocks = computed(() => props.unlocks.slice(0, CHAIN_UNLOCKS))
const edges = computed<Edge[]>(() => [
  ...needCodes.value.map((c) => ({ from: c, to: code.value })),
  ...chainUnlocks.value.map((c) => ({ from: code.value, to: c })),
])
// "2027 S1" when it's in the plan, "Done" when it's on the record.
const whereOf = computed(() => {
  const out: Record<string, string> = {}
  for (const term of plan.terms.value) for (const c of term.subjects) out[c] = termLabel(t.value, term)
  for (const r of profile.value.results) if (!isFail(r)) out[r.code] = t.value('plan.doneIt')
  return out
})
function go(c: string): void {
  location.assign(link(`subject/${c}`))
}
</script>

<template>
  <div class="route">
    <SubjectTimeline :code="code" :edges="edges" :where-of="whereOf" @select="go" @open="go" />

    <component :is="phone ? 'details' : 'div'" class="cols-wrap" :class="{ 'cols-fold': phone }">
    <summary v-if="phone" class="cols-summary">{{ t('subject.fullRoute') }}</summary>
    <div class="cols">
      <section class="col">
        <h3 class="sub">{{ t('subject.needs') }}</h3>
        <p v-if="needs === 'none'" class="text">{{ t('subject.needsNone') }}</p>
        <p v-else-if="needs === 'unknown'" class="text muted">{{ t('subject.notRecorded') }}</p>
        <template v-else-if="needsList">
          <p v-if="needsList.items.length > 1 || needsList.manual.length" class="text">
            {{ needsList.kind === 'any' ? t('expr.anyOf') : t('expr.allOf') }}
          </p>
          <ol v-if="needsList.items.length > 1" class="list">
            <li v-for="(x, i) in needsList.items" :key="i">{{ x }}</li>
          </ol>
          <p v-else-if="needsList.items.length === 1" class="text">{{ needsList.items[0] }}</p>
          <details v-if="needsList.manual.length" class="more">
            <summary>{{ t('expr.manualTitle', { n: needsList.manual.length }) }}</summary>
            <p v-for="(m, i) in needsList.manual" :key="i" class="text">“{{ m }}”</p>
          </details>
        </template>
        <details v-if="route.length > needCodes.length" class="more">
          <summary>{{ t('subject.routeTitle', { n: route.length, missing: routeMissing }) }}</summary>
          <SubjectLinks :codes="route" :year="year" />
        </details>
        <template v-if="coreq">
          <h3 class="sub">{{ t('subject.coreqTitle') }}</h3>
          <p class="text">{{ coreq }}</p>
        </template>
        <template v-if="subject.recommended.length">
          <h3 class="sub">{{ t('subject.recommendedFirst') }}</h3>
          <SubjectLinks :codes="subject.recommended" :year="year" :limit="3" />
        </template>
      </section>

      <section class="col">
        <h3 class="sub">{{ t('subject.unlocks') }}</h3>
        <p v-if="unlocks.length === 0" class="text muted">{{ t('subject.unlocksNone') }}</p>
        <SubjectLinks v-else :codes="unlocks" :year="year" :limit="4" />
        <template v-if="blocks.length">
          <h3 class="sub">{{ t('subject.blocks') }}</h3>
          <SubjectLinks :codes="blocks" :year="year" />
        </template>
      </section>
    </div>
    </component>
  </div>
</template>

<style scoped>
.cols-summary {
  padding: 10px 0;
  font-size: var(--fs-body);
  font-weight: 650;
  color: var(--accent);
  cursor: pointer;
}

.cols-fold[open] .cols-summary {
  margin-bottom: 8px;
}

.route {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: var(--space-5) var(--space-6);
}

.col {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
}

.sub {
  margin: 0;
  font-size: var(--fs-body);
  font-weight: 650;
}

.sub:not(:first-child) {
  margin-top: var(--space-4);
}

.text {
  margin: 0;
}

.muted {
  color: var(--ink-soft);
}

.list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
}

.more summary {
  font-weight: 600;
  cursor: pointer;
}

.more > :not(summary) {
  margin-top: var(--space-2);
}
</style>
