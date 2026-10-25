<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'

/** One line under a subject's facts: they come from an older Handbook year than the one looked at. */
defineProps<{ year: number }>()
const { t } = useI18n()
</script>

<template>
  <p class="facts-year">
    {{ t('dataYear.from', { year }) }}
    <InfoTip :text="t('dataYear.tip', { year })" />
  </p>
</template>

<style scoped>
.facts-year {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}
</style>
