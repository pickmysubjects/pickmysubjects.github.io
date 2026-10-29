<script setup lang="ts">
import InfoPage from '@/components/about/InfoPage.vue'
import GuideItem from '@/components/guide/GuideItem.vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/** /privacy/: one short section per thing that could be about you, then the date it was last changed. */
const { t } = useI18n()
const sections = ['local', 'shareLink', 'ratings', 'grades', 'feedback', 'noTracking', 'google', 'removal'] as const
</script>

<template>
  <InfoPage page="privacy" :title="t('privacy.title')">
    <GuideItem v-for="s in sections" :id="s" :key="s" :title="t(`privacy.h.${s}`)">
      <p class="text">{{ t(`privacy.${s}`) }}</p>
    </GuideItem>
    <p class="foot"><a :href="link('feedback')">{{ t('privacy.contact') }}</a> · {{ t('privacy.updated') }}</p>
  </InfoPage>
</template>

<style scoped>
.text {
  line-height: var(--lh-body);
}
</style>
