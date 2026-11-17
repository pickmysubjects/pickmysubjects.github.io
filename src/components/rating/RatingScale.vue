<script setup lang="ts">
import { useI18n } from '@/i18n'

/** One 1–5 question as five round buttons between its two end labels (keys), as on the one-tap card. */
defineProps<{ value: number | null; low: string; high: string; label?: string; disabled?: boolean }>()
const emit = defineEmits<{ pick: [n: number] }>()
const { t } = useI18n()
</script>

<template>
  <fieldset class="scale">
    <legend v-if="label" class="scale-label">{{ label }}</legend>
    <div class="scale-row">
      <span class="scale-end">{{ t(low) }}</span>
      <button
        v-for="n in 5"
        :key="n"
        class="scale-btn"
        :class="{ 'scale-on': value === n }"
        type="button"
        :disabled="disabled"
        :aria-pressed="value === n"
        :aria-label="`${label ? `${label}: ` : ''}${n} / 5`"
        @click="emit('pick', n)"
      >
        {{ n }}
      </button>
      <span class="scale-end">{{ t(high) }}</span>
    </div>
  </fieldset>
</template>

<style scoped>
.scale {
  margin: 0;
  padding: 0;
  border: 0;
}

.scale-label {
  margin: 0 0 6px;
  padding: 0;
  font-weight: var(--fw-semibold);
}

.scale-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.scale-end {
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.scale-btn {
  min-width: 44px;
  min-height: 44px;
  color: var(--ink);
  font-weight: var(--fw-semibold);
  font-variant-numeric: tabular-nums;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.scale-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.scale-btn:disabled {
  cursor: default;
}

.scale-on,
.scale-on:hover:not(:disabled) {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

/* Phones: both end labels on one line above (low left, high right), then the five buttons
   sharing the full width in equal columns. Ten tracks, two per button, so each label gets half. */
@media (max-width: 480px) {
  .scale-row {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 6px;
  }

  .scale-end {
    grid-row: 1;
    grid-column: 1 / 6;
    min-width: 0;
  }

  .scale-end:last-child {
    grid-column: 6 / -1;
    text-align: right;
  }

  .scale-btn {
    grid-row: 2;
    grid-column: span 2;
    min-width: 0;
    min-height: 44px;
  }
}
</style>
