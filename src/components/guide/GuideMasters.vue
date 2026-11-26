<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { URLS } from '@/utils/guideLinks'
import GuideItem from './GuideItem.vue'
import GuideCallout from './GuideCallout.vue'
import TermText from './TermText.vue'

/**
 * The master's side's own guide topics (2027 Handbook and the University's advanced standing and
 * Master of Data Science pages). `part` picks the page: the basics topics, or the new-students one.
 */
defineProps<{ part: 'basics' | 'new-students' }>()
const { t } = useI18n()
</script>

<template>
  <template v-if="part === 'basics'">
    <GuideItem id="master-entry" :title="t('guide.m.entryTitle')" :short="t('guide.m.entryShort')">
      <p><TermText :text="t('guide.m.entryPoints')" /></p>
      <p><TermText :text="t('guide.m.entryApply')" /></p>
      <p><TermText :text="t('guide.m.entryReview')" /></p>
      <p><TermText :text="t('guide.m.entryCredit')" /></p>
      <p><TermText :text="t('guide.m.entryVisa')" /></p>
      <GuideCallout>
        <p><TermText :text="t('guide.m.entrySite')" /></p>
        <p><a :href="URLS.ADVANCED_STANDING" target="_blank" rel="noopener">{{ t('guide.m.entryLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></p>
      </GuideCallout>
    </GuideItem>

    <GuideItem id="master-specs" :title="t('guide.m.specTitle')" :short="t('guide.m.specShort')">
      <p><TermText :text="t('guide.m.specOne')" /></p>
      <p><TermText :text="t('guide.m.specStream')" /></p>
      <p><TermText :text="t('guide.m.specExempt')" /></p>
      <p><TermText :text="t('guide.m.specChange')" /></p>
      <p><a :href="URLS.MDS_SPECS" target="_blank" rel="noopener">{{ t('guide.m.specLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></p>
    </GuideItem>

    <GuideItem id="master-capstone" :title="t('guide.m.capTitle')" :short="t('guide.m.capShort')">
      <ul class="plain">
        <li><TermText :text="t('guide.m.capEnd')" /></li>
        <li><TermText :text="t('guide.m.capResearch')" /></li>
        <li><TermText :text="t('guide.m.capHurdle')" /></li>
        <li><TermText :text="t('guide.m.capYear')" /></li>
      </ul>
    </GuideItem>
  </template>

  <GuideItem v-else id="master-from-bachelor" :title="t('guide.m.fromTitle')" :short="t('guide.m.fromShort')">
    <p><TermText :text="t('guide.m.fromApply')" /></p>
    <p><TermText :text="t('guide.m.fromCredit')" /></p>
    <p><TermText :text="t('guide.m.fromNotAllowed')" /></p>
    <GuideCallout><p><a :href="link('plan/')">{{ t('guide.m.fromSite') }}</a></p></GuideCallout>
  </GuideItem>
</template>
