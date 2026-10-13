<script setup lang="ts">
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { MY_STEPS } from './nav'

/** The three personal steps under "Me": where you are, and the next one a tap away. */
const { view } = useView()
const { t } = useI18n()
</script>

<template>
  <nav class="steps" :aria-label="t('nav.record')">
    <a
      v-for="(s, i) in MY_STEPS"
      :key="s.view"
      class="step"
      :href="link(s.view)"
      :aria-current="view === s.view ? 'page' : undefined"
    >
      <span class="step-n" aria-hidden="true">{{ i + 1 }}</span>
      <component :is="s.icon" :size="16" aria-hidden="true" />
      <span>{{ t(s.key) }}</span>
    </a>
  </nav>
</template>

<style scoped>
.steps {
  display: flex;
  gap: 2px;
  width: fit-content;
  justify-self: start;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  border-radius: 12px;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 14px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
  white-space: nowrap;
  text-decoration: none;
  border-radius: 9px;
}

.step:hover {
  color: var(--ink);
}

.step[aria-current='page'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

.step-n {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--paper, #fff);
  background: var(--ink-soft);
  border-radius: 999px;
}

.step[aria-current='page'] .step-n {
  background: var(--overprint);
}

@media (max-width: 420px) {
  .step {
    padding: 6px 10px;
  }
}
</style>
