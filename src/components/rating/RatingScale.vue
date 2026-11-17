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

/* Phones: the five buttons and both ends stay on one line. */
@media (max-width: 420px) {
  .scale-row {
    gap: 4px;
  }

  .scale-btn {
    min-width: 40px;
    min-height: 40px;
  }
}
</style>
