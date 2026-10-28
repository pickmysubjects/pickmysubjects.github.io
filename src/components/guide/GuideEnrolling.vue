<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import GuideCallout from './GuideCallout.vue'
import GuideLinks from './GuideLinks.vue'
import GuideSee from './GuideSee.vue'
import InfoTip from '@/components/InfoTip.vue'
import { URLS } from '@/utils/guideLinks'
import { link } from '@/composables/useView'

// The "enrolling" category of the basics guide (see utils/guideSections).
const { t } = useI18n()
</script>

<template>
  <GuideItem id="enrol" :title="t('guide.enrolTitle')" :short="t('guide.enrolShort')">
    <ol class="steps">
      <li>{{ t('guide.enrolStep1') }}</li>
      <li>{{ t('guide.enrolStep2') }}</li>
      <li>{{ t('guide.enrolStep3') }}</li>
      <li>{{ t('guide.enrolStep4') }}</li>
    </ol>
    <GuideCallout kind="pull">{{ t('guide.enrolDraft') }}</GuideCallout>
    <ul class="plain">
      <li>{{ t('guide.enrolWhen') }}</li>
      <li>{{ t('guide.newHandbook') }}</li>
    </ul>
    <GuideCallout kind="warn">
      <p>
        {{ t('guide.reenrolShort') }}<InfoTip>{{ t('guide.reenrolMore') }} <a :href="URLS.REENROL" target="_blank" rel="noopener">{{ t('guide.reenrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
    </GuideCallout>
    <GuideLinks
      :links="[
        { href: URLS.ENROLLING, label: t('guide.enrolLink') },
        { href: URLS.PLANNER, label: t('guide.plannerLink') },
        { href: URLS.KEY_DATES, label: t('guide.datesLink') },
      ]"
    />
  </GuideItem>

  <!-- Planning on this site: everything about plans A and B in one place (was spread over Majors). -->
  <GuideItem id="plans" :title="t('guide.plansTitle')" :short="t('guide.plansShort')">
    <p>{{ t('guide.majorsPlans') }}</p>
    <p>{{ t('guide.planProfile') }}</p>
    <ul class="plain">
      <li>{{ t('guide.findPlan') }}</li>
      <li>{{ t('guide.findAddFirst') }}</li>
      <li>{{ t('guide.findNotOffered') }}</li>
      <li>{{ t('guide.plansAssumed') }}</li>
      <li>{{ t('guide.plansCampus') }}</li>
    </ul>
    <GuideCallout>
      <p>{{ t('guide.majorsPlansImage') }}</p>
      <p>{{ t('guide.findSharePreview') }}</p>
    </GuideCallout>
    <p class="actions">
      <a class="button button-quiet" :href="link('plan/compare/')">{{ t('guide.majorsPlansLink') }}</a>
    </p>
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
        <GuideSee to="rsl" />
      </div>
    </div>
    <p>{{ t('guide.loadText') }}</p>
    <ul class="checks">
      <li>{{ t('guide.overloadWam') }}</li>
      <li>{{ t('guide.overloadLast') }}</li>
      <li>{{ t('guide.overloadFails') }}</li>
    </ul>
    <GuideCallout>{{ t('guide.overloadFinal') }}</GuideCallout>
    <p>{{ t('guide.loadPartTime') }}</p>
    <p>
      {{ t('guide.loadSummer') }}
      <a :href="link('subjects/summer-winter/')">{{ t('guide.loadSummerLink') }}</a>
    </p>
    <GuideLinks :links="[{ href: URLS.ENROL_POLICY, label: t('guide.enrolPolicyLink') }]" />
  </GuideItem>

  <GuideItem id="check" :title="t('guide.checkTitle')" :short="t('guide.checkShort')">
    <p>{{ t('guide.checkText') }}</p>
    <ul class="checks">
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
    <ul class="plain">
      <li>{{ t('guide.waiverTime') }}</li>
      <li>{{ t('guide.waiverNot') }}</li>
    </ul>
    <GuideCallout>{{ t('guide.quotaText') }}</GuideCallout>
    <GuideLinks
      :links="[
        { href: URLS.WAIVER, label: t('guide.waiverLink') },
        { href: URLS.WAIVER_LIMITS, label: t('guide.waiverLimitsLink') },
        { href: URLS.QUOTA, label: t('guide.quotaLink') },
      ]"
    />
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
    <div class="box">
      <h3 class="box-title">{{ t('guide.clashTitle') }}</h3>
      <ul class="plain">
        <li>{{ t('guide.clashBackToBack') }}</li>
        <li>{{ t('guide.clashSwap') }}</li>
        <li>{{ t('guide.clashTaf') }}</li>
        <li>{{ t('guide.clashAccept') }}</li>
      </ul>
    </div>
    <p class="note">{{ t('guide.ttOther') }}</p>
    <GuideLinks
      :links="[
        { href: URLS.TT_HOW, label: t('guide.ttLink') },
        { href: URLS.TT_CLASH, label: t('guide.clashLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="late-enrol" :title="t('guide.lateEnrolTitle')" :short="t('guide.lateEnrolShort')">
    <p>
      {{ t('guide.lateEnrolLine') }}<InfoTip>{{ t('guide.lateEnrolMore') }} <a :href="URLS.CENSUS" target="_blank" rel="noopener">{{ t('guide.lateEnrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="cross-institutional" :title="t('guide.crossTitle')" :short="t('guide.crossShort')">
    <p>
      {{ t('guide.crossLine') }}<InfoTip>{{ t('guide.crossMore') }} <a :href="URLS.CROSS_INST" target="_blank" rel="noopener">{{ t('guide.crossLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="exchange" :title="t('guide.exchangeTitle')" :short="t('guide.exchangeShort')">
    <p>
      {{ t('guide.exchangeLine') }}<InfoTip>{{ t('guide.exchangeMore') }} <a :href="URLS.EXCHANGE" target="_blank" rel="noopener">{{ t('guide.exchangeLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="fees" :title="t('guide.feesTitle')" :short="t('guide.feesShort')">
    <ul class="plain">
      <li>{{ t('guide.feesCsp') }}</li>
      <li>{{ t('guide.feesHelp') }}</li>
      <li>{{ t('guide.feesFull') }}</li>
    </ul>
    <GuideCallout kind="warn">{{ t('guide.feesCensus') }}</GuideCallout>
    <p>{{ t('guide.feesSee') }}</p>
    <GuideSee to="drop">{{ t('guide.feesSeeDrop') }}</GuideSee>
    <GuideLinks
      :links="[
        { href: URLS.FEES, label: t('guide.feesLink') },
        { href: URLS.CENSUS, label: t('guide.censusLink') },
      ]"
    />
  </GuideItem>
</template>
