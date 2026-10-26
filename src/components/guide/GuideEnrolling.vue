<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import InfoTip from '@/components/InfoTip.vue'
import { URLS } from '@/utils/guideLinks'
import { link } from '@/composables/useView'

// The "enrolling" category of the basics guide (see utils/guideSections).
const { t } = useI18n()

</script>

<template>
  <div class="list surface">
    <GuideItem id="enrol" :title="t('guide.enrolTitle')" :short="t('guide.enrolShort')">
      <ol class="steps">
        <li>{{ t('guide.enrolStep1') }}</li>
        <li>{{ t('guide.enrolStep2') }}</li>
        <li>{{ t('guide.enrolStep3') }}</li>
        <li>{{ t('guide.enrolStep4') }}</li>
      </ol>
      <p class="note">{{ t('guide.enrolDraft') }}</p>
      <p class="note">{{ t('guide.enrolWhen') }}</p>
      <p class="note">{{ t('guide.newHandbook') }}</p>
      <p class="note">
        {{ t('guide.reenrolShort') }}<InfoTip>{{ t('guide.reenrolMore') }} <a :href="URLS.REENROL" target="_blank" rel="noopener">{{ t('guide.reenrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
      <ul class="links">
        <li><a :href="URLS.ENROLLING" target="_blank" rel="noopener">{{ t('guide.enrolLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.PLANNER" target="_blank" rel="noopener">{{ t('guide.plannerLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.KEY_DATES" target="_blank" rel="noopener">{{ t('guide.datesLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="load" :title="t('guide.loadTitle')" :short="t('guide.loadShort')">
      <div class="who">
        <div class="who-card">
          <h3>{{ t('guide.localTitle') }}</h3>
          <p>{{ t('guide.loadLocal') }}</p>
        </div>
        <div class="who-card">
          <h3>{{ t('guide.intlTitle') }}</h3>
          <p>{{ t('guide.loadIntl') }}</p>
        </div>
      </div>
      <p>{{ t('guide.loadText') }}</p>
      <ul class="plain">
        <li>{{ t('guide.overloadWam') }}</li>
        <li>{{ t('guide.overloadLast') }}</li>
        <li>{{ t('guide.overloadFails') }}</li>
      </ul>
      <p class="note">{{ t('guide.overloadFinal') }}</p>
      <p class="note">{{ t('guide.loadPartTime') }}</p>
      <p class="aside">
        {{ t('guide.loadSummer') }}
        <a :href="link('subjects/summer-winter/')">{{ t('guide.loadSummerLink') }}</a>
      </p>
      <p>
        <a class="ext" :href="URLS.ENROL_POLICY" target="_blank" rel="noopener">{{ t('guide.enrolPolicyLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="check" :title="t('guide.checkTitle')" :short="t('guide.checkShort')">
      <p>{{ t('guide.checkText') }}</p>
      <ul class="plain">
        <li>{{ t('guide.checkLanguage') }}</li>
        <li>{{ t('guide.checkPermission') }}</li>
        <li>{{ t('guide.checkVce') }}</li>
        <li>{{ t('guide.checkAverage') }}</li>
      </ul>
    </GuideItem>

    <GuideItem id="waiver" :title="t('guide.waiverTitle')" :short="t('guide.waiverShort')">
      <p>{{ t('guide.waiverWhat') }}</p>
      <ol class="steps">
        <li>{{ t('guide.waiverStep1') }}</li>
        <li>{{ t('guide.waiverStep2') }}</li>
        <li>{{ t('guide.waiverStep3') }}</li>
      </ol>
      <p class="note">{{ t('guide.waiverTime') }}</p>
      <p class="note">{{ t('guide.waiverNot') }}</p>
      <p class="aside">{{ t('guide.quotaText') }}</p>
      <ul class="links">
        <li><a :href="URLS.WAIVER" target="_blank" rel="noopener">{{ t('guide.waiverLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.WAIVER_LIMITS" target="_blank" rel="noopener">{{ t('guide.waiverLimitsLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.QUOTA" target="_blank" rel="noopener">{{ t('guide.quotaLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="timetable" :title="t('guide.ttTitle')" :short="t('guide.ttShort')">
      <ol class="steps">
        <li>{{ t('guide.ttStep1') }}</li>
        <li>{{ t('guide.ttStep2') }}</li>
        <li>{{ t('guide.ttStep3') }}</li>
        <li>{{ t('guide.ttStep4') }}</li>
      </ol>
      <ul class="plain">
        <li>{{ t('guide.ttRegister') }}</li>
        <li>{{ t('guide.ttMissed') }}</li>
        <li>{{ t('guide.ttTaf') }}</li>
      </ul>
      <div class="aside">
        <h3 class="aside-title">{{ t('guide.clashTitle') }}</h3>
        <ul class="plain">
          <li>{{ t('guide.clashBackToBack') }}</li>
          <li>{{ t('guide.clashSwap') }}</li>
          <li>{{ t('guide.clashTaf') }}</li>
          <li>{{ t('guide.clashAccept') }}</li>
        </ul>
      </div>
      <p class="note">{{ t('guide.ttOther') }}</p>
      <ul class="links">
        <li><a :href="URLS.TT_HOW" target="_blank" rel="noopener">{{ t('guide.ttLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.TT_CLASH" target="_blank" rel="noopener">{{ t('guide.clashLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="late-enrol" :title="t('guide.lateEnrolTitle')" :short="t('guide.lateEnrolShort')">
      <p class="note">
        {{ t('guide.lateEnrolLine') }}<InfoTip>{{ t('guide.lateEnrolMore') }} <a :href="URLS.CENSUS" target="_blank" rel="noopener">{{ t('guide.lateEnrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
    </GuideItem>

    <GuideItem id="cross-institutional" :title="t('guide.crossTitle')" :short="t('guide.crossShort')">
      <p class="note">
        {{ t('guide.crossLine') }}<InfoTip>{{ t('guide.crossMore') }} <a :href="URLS.CROSS_INST" target="_blank" rel="noopener">{{ t('guide.crossLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
    </GuideItem>

    <GuideItem id="exchange" :title="t('guide.exchangeTitle')" :short="t('guide.exchangeShort')">
      <p class="note">
        {{ t('guide.exchangeLine') }}<InfoTip>{{ t('guide.exchangeMore') }} <a :href="URLS.EXCHANGE" target="_blank" rel="noopener">{{ t('guide.exchangeLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
    </GuideItem>

    <GuideItem id="fees" :title="t('guide.feesTitle')" :short="t('guide.feesShort')">
      <ul class="plain">
        <li>{{ t('guide.feesCsp') }}</li>
        <li>{{ t('guide.feesHelp') }}</li>
        <li>{{ t('guide.feesFull') }}</li>
        <li>{{ t('guide.feesCensus') }}</li>
      </ul>
      <p class="note">{{ t('guide.feesSee') }}</p>
      <ul class="links">
        <li><a :href="URLS.FEES" target="_blank" rel="noopener">{{ t('guide.feesLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.CENSUS" target="_blank" rel="noopener">{{ t('guide.censusLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>
  </div>
</template>
