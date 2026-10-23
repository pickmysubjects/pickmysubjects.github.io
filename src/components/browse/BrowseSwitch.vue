<script setup lang="ts">
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/** Subjects, majors or careers: the ways in to "what can I study", one tap apart. */
defineProps<{ current: 'subjects' | 'majors' | 'careers' }>()
const { t } = useI18n()
</script>

<template>
  <nav class="switch" :aria-label="t('browse.switchLabel')">
    <a class="switch-item" :href="link('subjects/')" :aria-current="current === 'subjects' ? 'page' : undefined">{{ t('browse.switchSubjects') }}</a>
    <a class="switch-item" :href="link('majors/')" :aria-current="current === 'majors' ? 'page' : undefined">{{ t('browse.switchMajors') }}</a>
    <a class="switch-item" :href="link('careers/')" :aria-current="current === 'careers' ? 'page' : undefined">{{ t('browse.switchCareers') }}</a>
  </nav>
</template>

<style scoped>
.switch {
  display: inline-flex;
  gap: 2px;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}

.switch-item {
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
}

.switch-item:hover {
  color: var(--ink);
}

.switch-item[aria-current='page'] {
  background: var(--glass-shine), color-mix(in srgb, var(--ink) 88%, transparent);
  color: var(--bg);
}
</style>
