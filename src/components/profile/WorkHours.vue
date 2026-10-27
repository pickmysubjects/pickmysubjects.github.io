<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { Check, Circle } from 'lucide-vue-next'

/**
 * Hours of paid work or other fixed commitments a week, as a bucket. Optional; tap again to clear.
 * The same chips with a tick as the goal question above it: one way to pick one thing in this card.
 */
const { profile, setWorkHours } = useProfile()
const { t } = useI18n()
const BUCKETS = [0, 5, 15, 25] as const
</script>

<template>
  <fieldset class="work">
    <legend class="work-label">{{ t('record.workTitle') }}</legend>
    <div class="seg">
      <button
        v-for="h in BUCKETS"
        :key="h"
        type="button"
        class="toggle-chip"
        :aria-pressed="profile.workHours === h"
        @click="setWorkHours(profile.workHours === h ? undefined : h)"
      >
        <component :is="profile.workHours === h ? Check : Circle" :size="15" :stroke-width="2.5" class="toggle-icon" aria-hidden="true" />
        {{ t(`record.work.${h}`) }}
      </button>
    </div>
    <p class="work-hint">{{ t('record.workHintShort') }}<InfoTip :text="t('record.workHint')" /></p>
  </fieldset>
</template>

<style scoped>
.work {
  display: grid;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.work-label {
  margin-bottom: 6px;
  padding: 0;
  font-size: 1.05rem;
  font-weight: 650;
  color: var(--ink);
}

.seg {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.work-hint {
  max-width: 60ch;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

@media (max-width: 480px) {
  /* Each choice stays on one line; they share the row, wrapping to a second when needed. */
  .seg button {
    flex: 1 1 auto;
    padding: 6px 10px;
    font-size: 0.875rem;
    white-space: nowrap;
  }
}
</style>
