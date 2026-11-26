<script setup lang="ts">
import { GraduationCap } from 'lucide-vue-next'
import { useStudyLevel, type StudyLevel } from '@/composables/useStudyLevel'
import { useI18n } from '@/i18n'
import { trackEvent } from '@/utils/analytics'

/** Bachelor's or master's: which side of the site the lists and search show (see useStudyLevel). */
const { t } = useI18n()
const { level } = useStudyLevel()
const LEVELS: StudyLevel[] = ['bachelor', 'master']

function onChange(event: Event): void {
  level.value = (event.target as HTMLSelectElement).value as StudyLevel
  trackEvent(`level-${level.value}`)
}
</script>

<template>
  <label class="level" :class="{ master: level === 'master' }" :title="t('level.label')">
    <GraduationCap class="level-icon" :size="17" aria-hidden="true" />
    <span class="level-name">{{ t(`level.${level}`) }}</span>
    <!-- A real <select> over the button, like the language menu: native and accessible. -->
    <select class="level-select" :value="level" :aria-label="t('level.label')" @change="onChange">
      <option v-for="l in LEVELS" :key="l" :value="l">{{ t(`level.${l}`) }}</option>
    </select>
  </label>
</template>

<style scoped>
.level {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  flex: none;
  white-space: nowrap;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink-soft);
  cursor: pointer;
}

/* On the master's side the button wears the accent, so it's clear which side this is. */
.level.master {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: var(--accent-soft);
}

.level:hover {
  color: var(--ink);
  background: var(--glass-fill-hover);
}

.level.master:hover {
  color: var(--accent);
}

.level:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.level-select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}

@media (max-width: 1180px) {
  .level-name {
    display: none;
  }

  .level {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
}
</style>
