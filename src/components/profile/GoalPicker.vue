<script setup lang="ts">
import type { Goal } from '@/engine'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** What the student wants most right now. One setting, shared by suggestions and the plan builder. */
defineProps<{ note?: string }>()
const { profile, setGoal } = useProfile()
const { t } = useI18n()
const goals: Goal[] = ['wam', 'balanced', 'challenge']
</script>

<template>
  <fieldset class="goal">
    <legend class="goal-label">{{ t('suggest.goal') }}</legend>
    <div class="seg">
      <button
        v-for="g in goals"
        :key="g"
        type="button"
        :aria-pressed="profile.goal === g"
        :title="t(`suggest.goals.${g}Hint`)"
        @click="setGoal(g)"
      >
        {{ t(`suggest.goals.${g}`) }}
      </button>
    </div>
    <p class="goal-hint">{{ t(`suggest.goals.${profile.goal}Hint`) }}</p>
    <p v-if="note" class="goal-hint">{{ note }}</p>
  </fieldset>
</template>

<style scoped>
.goal {
  display: grid;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.goal-label {
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  border-radius: 12px;
}

.seg button {
  flex: 1 0 auto;
  min-height: 38px;
  padding: 6px 14px;
  font: inherit;
  font-size: 0.9375rem;
  color: var(--ink-soft);
  white-space: nowrap;
  background: none;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.seg button:hover {
  color: var(--ink);
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

.goal-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--ink-soft);
}
</style>
