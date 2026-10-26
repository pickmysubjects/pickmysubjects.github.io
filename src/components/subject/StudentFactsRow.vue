<script setup lang="ts">
import { computed } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'
import { factsRow, type FactsSource } from '@/utils/studentFactsHtml'

/**
 * "Handbook: Closed-book exam · Python  From students: Lectures recorded (N students) ⓘ".
 * Student facts show only for items the Handbook doesn't answer. Hidden when empty.
 */
const props = defineProps<{ subject: FactsSource }>()
const { t } = useI18n()
const row = computed(() => factsRow(t.value, props.subject))
</script>

<template>
  <p v-if="row.handbook.length || row.students.length" class="facts">
    <template v-if="row.handbook.length">
      <span class="facts-title">{{ t('studentFacts.handbook') }}</span>
      <span class="facts-list">{{ row.handbook.join(' · ') }}</span>
    </template>
    <template v-if="row.students.length">
      <span class="facts-title">{{ t('studentFacts.title') }}</span>
      <span class="facts-list">{{ row.students.join(' · ') }}</span>
      <span class="facts-n">{{ t('studentFacts.count', { n: row.n }) }}</span>
    </template>
    <InfoTip :text="t('studentFacts.info')" />
  </p>
</template>

<style scoped>
.facts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px var(--space-2);
  margin: 0;
  font-size: var(--fs-body);
}

.facts-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.facts-list {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--ink);
}

.facts-n {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}
</style>
