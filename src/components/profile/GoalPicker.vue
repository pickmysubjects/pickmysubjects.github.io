<script setup lang="ts">
import { computed } from 'vue'
import type { Goal } from '@/engine'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** What the student wants most right now. One setting, shared by suggestions and the plan builder. */
const props = defineProps<{ note?: string; withEasy?: boolean }>()
const { profile, setGoal } = useProfile()
const { t } = useI18n()
// "Marks only" lives on the suggestions page; elsewhere it reads as protecting a WAM.
const goals = computed<Goal[]>(() => (props.withEasy ? ['wam', 'balanced', 'challenge', 'easy'] : ['wam', 'balanced', 'challenge']))
const current = computed<Goal>(() => (!props.withEasy && profile.value.goal === 'easy' ? 'wam' : profile.value.goal))
</script>

<template>
  <fieldset class="goal">
    <legend class="goal-label">{{ t('suggest.goal') }}</legend>
    <div class="seg">
      <button
        v-for="g in goals"
        :key="g"
        type="button"
        :aria-pressed="current === g"
        :title="t(`suggest.goals.${g}Hint`)"
        @click="setGoal(g)"
      >
        {{ t(`suggest.goals.${g}`) }}
      </button>
    </div>
    <p class="goal-hint">{{ t(`suggest.goals.${current}Hint`) }}</p>
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
  flex-wrap: wrap;
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
