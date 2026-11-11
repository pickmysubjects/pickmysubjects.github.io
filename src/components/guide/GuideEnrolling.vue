<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import TermText from './TermText.vue'
import NextDate from './NextDate.vue'
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
      <li><TermText :text="t('guide.enrolStep1')" /></li>
      <li><TermText :text="t('guide.enrolStep2')" /></li>
      <li><TermText :text="t('guide.enrolStep3')" /></li>
      <li><TermText :text="t('guide.enrolStep4')" /></li>
    </ol>
    <GuideCallout kind="pull"><TermText :text="t('guide.enrolDraft')" /></GuideCallout>
    <ul class="plain">
      <li><TermText :text="t('guide.enrolWhen')" /></li>
      <li><TermText :text="t('guide.newHandbook')" /></li>
    </ul>
    <GuideCallout kind="warn">
      <p>
        <TermText :text="t('guide.reenrolShort')" /><InfoTip><TermText :text="t('guide.reenrolMore')" /> <a :href="URLS.REENROL" target="_blank" rel="noopener">{{ t('guide.reenrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
      </p>
    </GuideCallout>
    <NextDate :kinds="['reenrol', 'selfEnrol']" />
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
    <p><TermText :text="t('guide.majorsPlans')" /></p>
    <p><TermText :text="t('guide.plansSwitch', { new: t('plans.new'), item: t('plans.switchMajor') })" /></p>
    <p><TermText :text="t('guide.planProfile')" /></p>
    <ul class="plain">
      <li><TermText :text="t('guide.findPlan')" /></li>
      <li><TermText :text="t('guide.findAddFirst')" /></li>
      <li><TermText :text="t('guide.pickBetween')" /></li>
      <li><TermText :text="t('guide.findNotOffered')" /></li>
      <li><TermText :text="t('guide.plansAssumed')" /></li>
      <li><TermText :text="t('guide.plansCampus')" /></li>
    </ul>
    <GuideCallout>
      <p><TermText :text="t('guide.majorsPlansImage')" /></p>
      <p><TermText :text="t('guide.findSharePreview')" /></p>
    </GuideCallout>
    <p class="actions">
      <a class="button button-quiet" :href="link('plan/compare/')">{{ t('guide.majorsPlansLink') }}</a>
    </p>
  </GuideItem>

  <GuideItem id="load" :title="t('guide.loadTitle')" :short="t('guide.loadShort')">
    <div class="who">
      <div class="who-card">
        <h3><TermText :text="t('guide.localTitle')" /></h3>
        <p><TermText :text="t('guide.loadLocal')" /></p>
      </div>
      <div class="who-card">
        <h3><TermText :text="t('guide.intlTitle')" /></h3>
        <p><TermText :text="t('guide.loadIntl')" /></p>
        <GuideSee to="rsl" />
      </div>
    </div>
    <p><TermText :text="t('guide.loadText')" /></p>
    <ul class="checks">
      <li><TermText :text="t('guide.overloadWam')" /></li>
      <li><TermText :text="t('guide.overloadLast')" /></li>
      <li><TermText :text="t('guide.overloadFails')" /></li>
    </ul>
    <GuideCallout><TermText :text="t('guide.overloadFinal')" /></GuideCallout>
    <p><TermText :text="t('guide.loadPartTime')" /></p>
    <p>
      <TermText :text="t('guide.loadSummer')" />
      <a :href="link('subjects/summer-winter/')">{{ t('guide.loadSummerLink') }}</a>
    </p>
    <GuideLinks :links="[{ href: URLS.ENROL_POLICY, label: t('guide.enrolPolicyLink') }]" />
  </GuideItem>

  <GuideItem id="check" :title="t('guide.checkTitle')" :short="t('guide.checkShort')">
    <p><TermText :text="t('guide.checkText')" /></p>
    <ul class="checks">
      <li><TermText :text="t('guide.checkLanguage')" /></li>
      <li><TermText :text="t('guide.checkPermission')" /></li>
      <li><TermText :text="t('guide.checkVce')" /></li>
      <li><TermText :text="t('guide.checkAverage')" /></li>
    </ul>
  </GuideItem>

  <GuideItem id="waiver" :title="t('guide.waiverTitle')" :short="t('guide.waiverShort')">
    <p><TermText :text="t('guide.waiverWhat')" /></p>
    <ol class="steps">
      <li><TermText :text="t('guide.waiverStep1')" /></li>
      <li><TermText :text="t('guide.waiverStep2')" /></li>
      <li><TermText :text="t('guide.waiverStep3')" /></li>
    </ol>
    <ul class="plain">
      <li><TermText :text="t('guide.waiverTime')" /></li>
      <li><TermText :text="t('guide.waiverNot')" /></li>
    </ul>
    <GuideCallout><TermText :text="t('guide.quotaText')" /></GuideCallout>
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
      <li><TermText :text="t('guide.ttStep1')" /></li>
      <li><TermText :text="t('guide.ttStep2')" /></li>
      <li><TermText :text="t('guide.ttStep3')" /></li>
      <li><TermText :text="t('guide.ttStep4')" /></li>
    </ol>
    <ul class="plain">
      <li><TermText :text="t('guide.ttRegister')" /></li>
      <li><TermText :text="t('guide.ttMissed')" /></li>
      <li><TermText :text="t('guide.ttTaf')" /></li>
    </ul>
    <div class="box">
      <h3 class="box-title"><TermText :text="t('guide.clashTitle')" /></h3>
      <ul class="plain">
        <li><TermText :text="t('guide.clashBackToBack')" /></li>
        <li><TermText :text="t('guide.clashSwap')" /></li>
        <li><TermText :text="t('guide.clashTaf')" /></li>
        <li><TermText :text="t('guide.clashAccept')" /></li>
      </ul>
    </div>
    <p class="note"><TermText :text="t('guide.ttOther')" /></p>
    <GuideLinks
      :links="[
        { href: URLS.TT_HOW, label: t('guide.ttLink') },
        { href: URLS.TT_CLASH, label: t('guide.clashLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="late-enrol" :title="t('guide.lateEnrolTitle')" :short="t('guide.lateEnrolShort')">
    <p>
      <TermText :text="t('guide.lateEnrolLine')" /><InfoTip><TermText :text="t('guide.lateEnrolMore')" /> <a :href="URLS.CENSUS" target="_blank" rel="noopener">{{ t('guide.lateEnrolLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
    <NextDate :kinds="['selfEnrol', 'census']" />
  </GuideItem>

  <GuideItem id="cross-institutional" :title="t('guide.crossTitle')" :short="t('guide.crossShort')">
    <p>
      <TermText :text="t('guide.crossLine')" /><InfoTip><TermText :text="t('guide.crossMore')" /> <a :href="URLS.CROSS_INST" target="_blank" rel="noopener">{{ t('guide.crossLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="exchange" :title="t('guide.exchangeTitle')" :short="t('guide.exchangeShort')">
    <p>
      <TermText :text="t('guide.exchangeLine')" /><InfoTip><TermText :text="t('guide.exchangeMore')" /> <a :href="URLS.EXCHANGE" target="_blank" rel="noopener">{{ t('guide.exchangeLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="fees" :title="t('guide.feesTitle')" :short="t('guide.feesShort')">
    <ul class="plain">
      <li><TermText :text="t('guide.feesCsp')" /></li>
      <li><TermText :text="t('guide.feesHelp')" /></li>
      <li><TermText :text="t('guide.feesFull')" /></li>
    </ul>
    <GuideCallout kind="warn"><TermText :text="t('guide.feesCensus')" /></GuideCallout>
    <p><TermText :text="t('guide.feesSee')" /></p>
    <GuideSee to="drop"><TermText :text="t('guide.feesSeeDrop')" /></GuideSee>
    <NextDate :kinds="['census']" />
    <GuideLinks
      :links="[
        { href: URLS.FEES, label: t('guide.feesLink') },
        { href: URLS.CENSUS, label: t('guide.censusLink') },
      ]"
    />
  </GuideItem>
</template>
