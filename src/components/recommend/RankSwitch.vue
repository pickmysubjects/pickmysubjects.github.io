<script setup lang="ts">
import { link } from '@/composables/useView'
import { RANK_SLUGS } from '@/engine'
import { useI18n } from '@/i18n'

/** Suggestions, the easy list and the hard list: three pages that read as one section. */
defineProps<{ current: 'recommend' | 'easy' | 'hard' }>()
const { t } = useI18n()
const items = [
  { id: 'recommend', path: 'recommend/' },
  { id: 'easy', path: `subjects/${RANK_SLUGS.easy}/` },
  { id: 'hard', path: `subjects/${RANK_SLUGS.hard}/` },
] as const
</script>

<template>
  <nav class="rank-switch" :aria-label="t('rank.switch.label')">
    <a
      v-for="i in items"
      :key="i.id"
      class="rank-switch-item"
      :href="link(i.path)"
      :aria-current="current === i.id ? 'page' : undefined"
    >{{ t(`rank.switch.${i.id}`) }}</a>
  </nav>
</template>

<style scoped>
.rank-switch {
  display: inline-flex;
  max-width: 100%;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
  justify-self: start;
}

.rank-switch-item {
  flex: 0 1 auto;
  min-width: 0;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
}

.rank-switch-item:hover {
  color: var(--ink);
}

.rank-switch-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.rank-switch-item[aria-current='page'] {
  background: var(--glass-shine), color-mix(in srgb, var(--ink) 88%, transparent);
  color: var(--bg);
}

/* Phones: the three share the width evenly, and a long label may wrap inside its own pill. */
@media (max-width: 480px) {
  .rank-switch {
    display: flex;
    width: 100%;
    border-radius: 20px;
  }

  .rank-switch-item {
    flex: 1 1 0;
    padding: 6px 8px;
    border-radius: 16px;
    white-space: normal;
  }
}
</style>
