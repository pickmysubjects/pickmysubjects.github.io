<script setup lang="ts">
import { link, missedAnchor, useView } from '@/composables/useView'
import { usePlan } from '@/composables/usePlan'
import { useShortlist } from '@/composables/useShortlist'
import { missedHint } from './missedHint'
import { useI18n } from '@/i18n'
import { X } from 'lucide-vue-next'
import { computed } from 'vue'

/**
 * A menu link into part of a page that isn't there yet (no plan, no grades, nothing saved):
 * one line saying how to get it, instead of silently showing the top of the page.
 */
const { t } = useI18n()
const { view } = useView()
const dismiss = () => (missedAnchor.value = null)
const plan = usePlan()
const shortlist = useShortlist()
const hint = computed(() => missedHint(missedAnchor.value, { plan: !plan.isEmpty.value, saved: shortlist.codes.value.length }))
</script>

<template>
  <p v-if="hint" class="missed glass" role="status">
    <span>{{ t(hint.key) }}</span>
    <a v-if="hint.to.split('/')[0] !== view" :href="link(hint.to)" @click="dismiss">{{ t(hint.go) }}</a>
    <button type="button" class="missed-x" :aria-label="t('menu.close')" @click="dismiss"><X :size="14" aria-hidden="true" /></button>
  </p>
</template>

<style scoped>
.missed {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: var(--space-3) 0 0;
  padding: 8px 8px 8px 14px;
  border-radius: 999px;
  font-size: var(--fs-small);
  font-weight: var(--fw-medium);
}

.missed a {
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.missed-x {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -8px -4px -8px auto;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}
</style>
