<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { dataYears, publishedYear, shareUpdated } from '@/engine/dataYear'
import { useDataset } from '@/composables/useDataset'
import { usePersisted } from '@/composables/usePersisted'
import { useI18n } from '@/i18n'
import InfoTip from '@/components/InfoTip.vue'

/**
 * One line across the site while a new Handbook is out but most subjects still show the year
 * before (the data is entered subject by subject). Shows and hides by itself; a reader can hide it
 * for that year.
 */
const { t } = useI18n()
const { all } = useDataset()
const published = publishedYear(all.subjects)
const behind = shareUpdated(all.subjects, published) < 0.5
// The year the not-yet-updated subjects come from.
const old = Math.max(0, ...Object.values(all.subjects).flatMap((s) => dataYears(s).filter((y) => y < published)))
const dismissed = usePersisted<number>('sc:rollover-hidden', 0, (raw) => (typeof raw === 'number' ? raw : 0))
const show = computed(() => behind && old > 0 && dismissed.value !== published)
</script>

<template>
  <p v-if="show" class="rollover" role="status">
    <span>{{ t('rollover.text', { year: published, old }) }} <InfoTip :text="t('rollover.tip', { old })" /></span>
    <button class="rollover-x" type="button" :aria-label="t('rollover.dismiss')" :title="t('rollover.dismiss')" @click="dismissed = published">
      <X :size="16" aria-hidden="true" />
    </button>
  </p>
</template>

<style scoped>
.rollover {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  margin: var(--space-2) 0 var(--space-3);
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--overprint-tint);
  color: var(--ink);
  font-size: 0.875rem;
}

.rollover-x {
  flex: none;
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}
</style>
