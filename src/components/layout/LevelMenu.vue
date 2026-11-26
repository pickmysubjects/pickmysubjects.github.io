<script setup lang="ts">
import { useStudyLevel, type StudyLevel } from '@/composables/useStudyLevel'
import { useI18n } from '@/i18n'
import { trackEvent } from '@/utils/analytics'

/**
 * Bachelor's or master's: which side of the site the lists, search and plans show (see
 * useStudyLevel). Both sides are always visible as two segments, the current one filled, so
 * students can see where they are and switch in one tap.
 */
const { t } = useI18n()
const { level } = useStudyLevel()
const LEVELS: StudyLevel[] = ['bachelor', 'master']

function choose(l: StudyLevel): void {
  if (level.value === l) return
  level.value = l
  trackEvent(`level-${l}`)
}
</script>

<template>
  <div class="level" role="group" :aria-label="t('level.label')">
    <button
      v-for="l in LEVELS"
      :key="l"
      type="button"
      class="seg"
      :class="{ on: level === l }"
      :aria-pressed="level === l"
      @click="choose(l)"
    >
      {{ t(`level.${l}`) }}
    </button>
  </div>
</template>

<style scoped>
.level {
  display: inline-flex;
  flex: none;
  gap: 2px;
  height: 36px;
  padding: 3px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}

.seg {
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-soft);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.seg:hover:not(.on) {
  color: var(--ink);
  background: var(--glass-fill-hover);
}

/* The current side is filled in its accent: pink on the bachelor's side, purple on the master's. */
.seg.on {
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
}

.seg:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .level {
    height: 34px;
    padding: 2px;
  }

  .seg {
    padding: 0 7px;
    font-size: 0.6875rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seg {
    transition: none;
  }
}
</style>
