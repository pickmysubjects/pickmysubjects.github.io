<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const sections = ['local', 'ratings', 'grades', 'feedback', 'noTracking', 'google', 'removal', 'contact'] as const
</script>

<template>
  <article class="privacy">
    <h1 class="privacy-title">{{ t('privacy.title') }}</h1>
    <p class="privacy-updated">{{ t('privacy.updated') }}</p>
    <ul class="privacy-pills">
      <li v-for="k in ['account', 'local', 'anon']" :key="k" class="chip">
        <ShieldCheck :size="15" aria-hidden="true" /> {{ t(`privacy.pills.${k}`) }}
      </li>
    </ul>
    <p v-for="s in sections" :key="s" class="privacy-text">{{ t(`privacy.${s}`) }}</p>
  </article>
</template>

<style scoped>
.privacy {
  padding-top: var(--page-top);
  display: grid;
  gap: 12px;
  max-width: 72ch;
}


.privacy-updated {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.privacy-text {
  margin: 0;
  line-height: 1.6;
}
.privacy-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 8px;
  padding: 0;
  list-style: none;
}

.privacy-pills .chip {
  color: var(--good);
}
</style>
