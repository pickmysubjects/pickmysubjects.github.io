<script setup lang="ts">
import { computed } from 'vue'
import { CalendarPlus } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { termFullLabel } from '@/i18n/format'
import { buildIcs, datesForTerms, downloadIcs, KEY_DATES, melbourneToday, type KeyDate } from '@/utils/keyDates'

/**
 * "Add key dates to my calendar": census, exam and results dates for the terms in the plan and
 * the record that haven't passed, as an .ics made on the device. Nothing is sent anywhere.
 */
const { t } = useI18n()
const plan = usePlan()
const { profile } = useProfile()

const items = computed(() => {
  const today = melbourneToday()
  const terms = [
    ...plan.terms.value.filter((x) => x.subjects.length),
    ...profile.value.results.flatMap((r) => (r.year && r.period ? [{ year: r.year, period: r.period }] : [])),
  ]
  return datesForTerms(KEY_DATES, terms).filter((d) => d.end >= today)
})
const label = (d: KeyDate) => t.value(`cal.event.${d.kind}`, { term: termFullLabel(t.value, { year: d.year, period: d.term }) })

function save(): void {
  downloadIcs(buildIcs(items.value, label), 'my-unimelb-dates.ics')
}
</script>

<template>
  <!-- Always there, so a link to #calendar lands here even before any dates are out. -->
  <div class="plan-cal-wrap">
    <p v-if="items.length" class="plan-cal">
      <button type="button" class="button button-quiet" @click="save"><CalendarPlus :size="16" aria-hidden="true" />{{ t('cal.add') }}</button>
      <InfoTip :text="t('cal.info', { n: items.length })" />
    </p>
    <p v-else class="plan-cal-none">{{ t('menu.miss.noDates') }}</p>
  </div>
</template>

<style scoped>
.plan-cal-none {
  color: var(--ink-soft);
}

.plan-cal {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-cal .button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
