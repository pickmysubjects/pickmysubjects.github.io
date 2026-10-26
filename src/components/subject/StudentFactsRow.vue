<script setup lang="ts">
import { computed } from 'vue'
import InfoTip from '@/components/InfoTip.vue'
import type { StudentFacts } from '@/engine/studentFacts'
import { useI18n } from '@/i18n'
import { factLabels } from '@/utils/studentFactsHtml'

/** "From students: Closed-book exam · Lectures recorded · Python (N students)". Hidden when empty. */
const props = defineProps<{ facts?: StudentFacts }>()
const { t } = useI18n()
const labels = computed(() => factLabels(t.value, props.facts))
</script>

<template>
  <p v-if="facts && labels.length" class="facts">
    <span class="facts-title">{{ t('studentFacts.title') }}</span>
    <span class="facts-list">{{ labels.join(' · ') }}</span>
    <span class="facts-n">{{ t('studentFacts.count', { n: facts.n }) }}<InfoTip :text="t('studentFacts.info')" /></span>
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
