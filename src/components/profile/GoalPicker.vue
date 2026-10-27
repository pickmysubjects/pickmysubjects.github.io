<script setup lang="ts">
import { Check, Circle } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { computed } from 'vue'
import type { Goal } from '@/engine'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * What the student wants most: the open plan's goal, which the plan builder and "sort for me"
 * both follow. A page can instead pass its own `goal`, and gets updates back. `compact` leaves
 * out the hint line under the choices.
 */
const props = defineProps<{ note?: string; goal?: Goal; compact?: boolean }>()
const emit = defineEmits<{ 'update:goal': [goal: Goal] }>()
const { profile, setGoal } = useProfile()
const own = computed<Goal>(() => props.goal ?? profile.value.goal)
function choose(g: Goal): void {
  if (props.goal !== undefined) emit('update:goal', g)
  else setGoal(g)
}
const { t } = useI18n()
const goals: Goal[] = ['wam', 'balanced', 'challenge']
// "Marks only" is no longer offered; one saved before reads as protecting a WAM.
const current = computed<Goal>(() => (own.value === 'easy' ? 'wam' : own.value))
</script>

<template>
  <fieldset class="goal" :class="{ 'goal-compact': compact }">
    <legend class="goal-label">{{ t('suggest.goal') }}</legend>
    <div class="seg">
      <button
        v-for="g in goals"
        :key="g"
        type="button"
        class="toggle-chip"
        :aria-pressed="current === g"
        :title="t(`suggest.goals.${g}Hint`)"
        @click="choose(g)"
      >
        <component :is="current === g ? Check : Circle" :size="15" :stroke-width="2.5" class="toggle-icon" aria-hidden="true" />
        {{ t(`suggest.goals.${g}`) }}
      </button>
    </div>
    <p v-if="!compact" class="goal-hint">
      {{ t(`suggest.goals.${current}Hint`) }}<InfoTip v-if="note" :text="note" />
    </p>
  </fieldset>
</template>

<style scoped>
.goal {
  display: grid;
  gap: var(--space-2);
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
  gap: 8px;
}

/* The one helper-text style for form sections. */
.goal-hint {
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
