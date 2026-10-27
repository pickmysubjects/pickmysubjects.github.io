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
    <!-- One readable panel over the colour field, a hairline between topics. -->
    <div class="privacy-body surface">
      <p v-for="s in sections" :key="s" class="privacy-text">{{ t(`privacy.${s}`) }}</p>
    </div>
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

.privacy-body {
  display: grid;
  padding: 8px 24px;
}

.privacy-text {
  margin: 0;
  padding: 14px 0;
  line-height: 1.65;
}

.privacy-text + .privacy-text {
  border-top: 1px solid var(--line);
}

@media (max-width: 640px) {
  .privacy-body {
    padding: 4px 16px;
  }
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

/* Phones: the title a size down, like the guide's, so long languages keep it to two lines. */
@media (max-width: 640px) {
  .privacy-title {
    font-size: 1.9rem;
  }
}
</style>
