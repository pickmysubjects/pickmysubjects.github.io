<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()
const sections = ['local', 'ratings', 'feedback', 'noTracking', 'google', 'removal', 'contact'] as const
</script>

<template>
  <article class="privacy">
    <h1 class="privacy-title">{{ t('privacy.title') }}</h1>
    <p class="privacy-updated">{{ t('privacy.updated') }}</p>
    <p v-for="s in sections" :key="s" class="privacy-text">{{ t(`privacy.${s}`) }}</p>
  </article>
</template>

<style scoped>
.privacy {
  padding-top: 32px;
  display: grid;
  gap: 12px;
  max-width: 72ch;
}


.privacy-updated {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.privacy-text {
  margin: 0;
  line-height: 1.6;
}
</style>
