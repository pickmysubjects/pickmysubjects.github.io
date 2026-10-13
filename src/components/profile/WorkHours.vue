<script setup lang="ts">
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** Hours of paid work or other fixed commitments a week, as a bucket. Optional; tap again to clear. */
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
        :aria-pressed="profile.workHours === h"
        @click="setWorkHours(profile.workHours === h ? undefined : h)"
      >
        {{ t(`record.work.${h}`) }}
      </button>
    </div>
    <p class="work-hint">{{ t('record.workHint') }}</p>
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
  gap: 2px;
  max-width: 520px;
  padding: 3px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  border-radius: 12px;
}

.seg button {
  flex: 1 0 auto;
  min-height: 38px;
  padding: 6px 12px;
  font: inherit;
  font-size: 0.9375rem;
  color: var(--ink-soft);
  white-space: nowrap;
  background: none;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

.seg button:focus-visible {
  outline: 2px solid var(--overprint);
  outline-offset: 1px;
}

.work-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

/* Narrow screens: the choices share the width instead of pushing it wider. */
@media (max-width: 480px) {
  .seg button {
    flex: 1 1 0;
    min-width: 0;
    padding: 6px 4px;
    font-size: 0.875rem;
    white-space: normal;
  }
}
</style>
