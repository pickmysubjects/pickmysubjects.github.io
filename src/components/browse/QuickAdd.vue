<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, Plus } from 'lucide-vue-next'
import { isFail, type Period, type Subject } from '@/engine'
import { link } from '@/composables/useView'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'
import { addTermChoices, defaultAddTerm } from '@/utils/pastTerms'

/**
 * "+ Add" on a result: into the plan's next semester it runs in (the subject page has the
 * semester picker); with no plan yet, to the planner with it ready to place. Already passed or
 * already in the plan: says so instead.
 */
// `text`: a plain text button saying where it goes ("Add to plan"), for tables with no room for icons.
const props = defineProps<{ subject: Subject; text?: boolean }>()
const plan = usePlan()
const { profile } = useProfile()
const { t } = useI18n()

const code = computed(() => props.subject.code)
const passed = computed(() => profile.value.results.some((r) => r.code === code.value && !isFail(r)))
const plannedAt = computed(() => plan.terms.value.find((x) => x.subjects.includes(code.value)))
const added = shallowRef<{ year: number; period: Period } | null>(null)
// Only a semester it runs in: anything else needs the subject page's picker and its warning.
const target = computed(() => {
  if (!plan.setupChosen.value) return null
  const choices = addTermChoices(props.subject, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }, plan.terms.value)
  const best = defaultAddTerm(choices, plan.terms.value[0])
  return best?.offered ? best : null
})
function add(): void {
  const where = target.value
  if (!where) return
  plan.addSubjectAt(where.year, where.period, code.value)
  added.value = { year: where.year, period: where.period }
}
</script>

<template>
  <span v-if="passed" class="qa qa-done"><Check v-if="!text" :size="15" aria-hidden="true" />{{ t('subject.passed') }}</span>
  <a v-else-if="plannedAt" class="qa qa-done" :href="link('plan')" role="status">
    <Check v-if="!text" :size="15" aria-hidden="true" />{{ added ? t('subject.added', { term: termLabel(t, plannedAt) }) : t('subject.inPlanAt', { term: termLabel(t, plannedAt) }) }}
  </a>
  <a v-else-if="!plan.setupChosen.value" class="qa" :href="link(`plan?add=${code}`)" :aria-label="t('browse.addLabel', { code })">
    <Plus v-if="!text" :size="15" aria-hidden="true" />{{ text ? t('shortlist.addToPlan') : t('browse.add') }}
  </a>
  <button v-else-if="target" type="button" class="qa" :aria-label="t('browse.addLabel', { code })" :title="termLabel(t, target)" @click="add">
    <Plus v-if="!text" :size="15" aria-hidden="true" />{{ text ? t('shortlist.addToPlan') : t('browse.add') }}
  </button>
</template>

<style scoped>
/* Above the card's stretched title link, so it stays its own button. */
.qa {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 12px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  white-space: nowrap;
  text-decoration: none;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.qa:hover {
  border-color: var(--accent);
}

.qa:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.qa-done {
  color: color-mix(in srgb, var(--good) 80%, var(--ink));
  background: var(--good-soft);
  border-color: transparent;
}

@media (pointer: coarse) {
  .qa {
    min-height: 44px;
  }
}
</style>
