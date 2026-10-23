<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import { URLS } from '@/utils/guideLinks'

// The "semester" category of the basics guide (see utils/guideSections).
const { t } = useI18n()

</script>

<template>
  <div class="list surface">
    <GuideItem id="special-consideration" :title="t('guide.specTitle')" :short="t('guide.specShort')">
      <ul class="plain">
        <li>{{ t('guide.specWhen') }}</li>
        <li>{{ t('guide.specOne') }}</li>
        <li>{{ t('guide.specDocs') }}</li>
        <li>{{ t('guide.specOutcomes') }}</li>
      </ul>
      <p class="note">{{ t('guide.specNot') }}</p>
      <ul class="links">
        <li><a :href="URLS.SPEC_APPLY" target="_blank" rel="noopener">{{ t('guide.specLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.SPEC_OUT" target="_blank" rel="noopener">{{ t('guide.specOutLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.SPEC_DOCS" target="_blank" rel="noopener">{{ t('guide.specDocLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="hurdles" :title="t('guide.hurdleTitle')" :short="t('guide.hurdleShort')">
      <p>{{ t('guide.hurdleText') }}</p>
      <p class="note">{{ t('guide.hurdleTip') }}</p>
      <p>
        <a class="ext" :href="URLS.ASSESS_POLICY" target="_blank" rel="noopener">{{ t('guide.policyLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="late" :title="t('guide.lateTitle')" :short="t('guide.lateShort')">
      <p>{{ t('guide.lateText') }}</p>
      <p>
        <a class="ext" :href="URLS.ASSESS_POLICY" target="_blank" rel="noopener">{{ t('guide.policyLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="integrity" :title="t('guide.integrityTitle')" :short="t('guide.integrityShort')">
      <ul class="plain">
        <li>{{ t('guide.integrityAi') }}</li>
        <li>{{ t('guide.integrityPlag') }}</li>
        <li>{{ t('guide.integrityOther') }}</li>
        <li>{{ t('guide.integrityContract') }}</li>
      </ul>
      <p class="note">{{ t('guide.integrityScam') }}</p>
      <p class="note">{{ t('guide.integrityProcess') }}</p>
      <ul class="links">
        <li><a :href="URLS.INTEGRITY" target="_blank" rel="noopener">{{ t('guide.integrityLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.INTEGRITY_BREACHES" target="_blank" rel="noopener">{{ t('guide.integrityBreachLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="exams" :title="t('guide.examsTitle')" :short="t('guide.examsShort')">
      <ul class="plain">
        <li>{{ t('guide.examsTimetable') }}</li>
        <li>{{ t('guide.examsMelbourne') }}</li>
        <li>{{ t('guide.examsResults') }}</li>
        <li>{{ t('guide.examsReview') }}</li>
      </ul>
      <ul class="links">
        <li><a :href="URLS.EXAM_DATES" target="_blank" rel="noopener">{{ t('guide.examDatesLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.EXAM_TT" target="_blank" rel="noopener">{{ t('guide.examTtLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.RESULTS" target="_blank" rel="noopener">{{ t('guide.resultsLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.ASSESS_POLICY" target="_blank" rel="noopener">{{ t('guide.policyLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="drop" :title="t('guide.dropTitle')" :short="t('guide.dropShort')">
      <ol class="timeline">
        <li class="tl-good">{{ t('guide.dropBefore') }}</li>
        <li class="tl-warn">{{ t('guide.dropWd') }}</li>
        <li class="tl-bad">{{ t('guide.dropFail') }}</li>
      </ol>
      <p class="note">{{ t('guide.dropLate') }}</p>
      <div class="who">
        <p class="who-card">{{ t('guide.dropLocal') }}</p>
        <p class="who-card">{{ t('guide.dropIntl') }}</p>
      </div>
      <p class="note">{{ t('guide.dropWhere') }}</p>
      <p>
        <a class="ext" :href="URLS.ENROL_POLICY" target="_blank" rel="noopener">{{ t('guide.enrolPolicyLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="fail" :title="t('guide.failTitle')" :short="t('guide.failShort')">
      <ul class="plain">
        <li>{{ t('guide.failPoints') }}</li>
        <li>{{ t('guide.failRepeat') }}</li>
        <li>{{ t('guide.failProgress') }}</li>
        <li>{{ t('guide.failSupp') }}</li>
        <li>{{ t('guide.failSpecial') }}</li>
        <li>{{ t('guide.failIntl') }}</li>
      </ul>
      <p>
        <a class="ext" :href="URLS.FAILING" target="_blank" rel="noopener">{{ t('guide.failLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>
  </div>
</template>
