<script setup lang="ts">
import { useI18n } from '@/i18n'
import { link } from '@/composables/useView'
import GuideItem from './GuideItem.vue'
import GuideCallout from './GuideCallout.vue'
import GuideLinks from './GuideLinks.vue'
import { URLS } from '@/utils/guideLinks'

// The "semester" category of the basics guide (see utils/guideSections).
const { t } = useI18n()
</script>

<template>
  <GuideItem id="special-consideration" :title="t('guide.specTitle')" :short="t('guide.specShort')">
    <GuideCallout kind="pull">{{ t('guide.specWhen') }}</GuideCallout>
    <ul class="plain">
      <li>{{ t('guide.specOne') }}</li>
      <li>{{ t('guide.specDocs') }}</li>
      <li>{{ t('guide.specOutcomes') }}</li>
    </ul>
    <p class="note">{{ t('guide.specNot') }}</p>
    <GuideLinks
      :links="[
        { href: URLS.SPEC_APPLY, label: t('guide.specLink') },
        { href: URLS.SPEC_OUT, label: t('guide.specOutLink') },
        { href: URLS.SPEC_DOCS, label: t('guide.specDocLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="hurdles" :title="t('guide.hurdleTitle')" :short="t('guide.hurdleShort')">
    <p>{{ t('guide.hurdleText') }}</p>
    <GuideCallout>
      <p>{{ t('guide.hurdleTip') }}</p>
      <p><a :href="link('tools/final/')">{{ t('guide.hurdleCalc') }}</a></p>
    </GuideCallout>
    <GuideLinks :links="[{ href: URLS.ASSESS_POLICY, label: t('guide.policyLink') }]" />
  </GuideItem>

  <GuideItem id="late" :title="t('guide.lateTitle')" :short="t('guide.lateShort')">
    <p>{{ t('guide.lateText') }}</p>
    <GuideLinks :links="[{ href: URLS.ASSESS_POLICY, label: t('guide.policyLink') }]" />
  </GuideItem>

  <GuideItem id="integrity" :title="t('guide.integrityTitle')" :short="t('guide.integrityShort')">
    <p>{{ t('guide.integrityAi') }}</p>
    <ul class="plain">
      <li>{{ t('guide.integrityPlag') }}</li>
      <li>{{ t('guide.integrityOther') }}</li>
      <li>{{ t('guide.integrityContract') }}</li>
    </ul>
    <GuideCallout kind="warn">{{ t('guide.integrityScam') }}</GuideCallout>
    <p>{{ t('guide.integrityProcess') }}</p>
    <GuideLinks
      :links="[
        { href: URLS.INTEGRITY, label: t('guide.integrityLink') },
        { href: URLS.INTEGRITY_BREACHES, label: t('guide.integrityBreachLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="exams" :title="t('guide.examsTitle')" :short="t('guide.examsShort')">
    <ul class="plain">
      <li>{{ t('guide.examsTimetable') }}</li>
      <li>{{ t('guide.examsResults') }}</li>
      <li>{{ t('guide.examsReview') }}</li>
    </ul>
    <GuideCallout kind="warn">{{ t('guide.examsMelbourne') }}</GuideCallout>
    <GuideLinks
      :links="[
        { href: URLS.EXAM_DATES, label: t('guide.examDatesLink') },
        { href: URLS.EXAM_TT, label: t('guide.examTtLink') },
        { href: URLS.RESULTS, label: t('guide.resultsLink') },
        { href: URLS.ASSESS_POLICY, label: t('guide.policyLink') },
      ]"
    />
  </GuideItem>

  <GuideItem id="drop" :title="t('guide.dropTitle')" :short="t('guide.dropShort')">
    <ol class="timeline">
      <li class="tl-good">{{ t('guide.dropBefore') }}</li>
      <li class="tl-warn">{{ t('guide.dropWd') }}</li>
      <li class="tl-bad">{{ t('guide.dropFail') }}</li>
    </ol>
    <p>{{ t('guide.dropLate') }}</p>
    <div class="who">
      <p class="who-card">{{ t('guide.dropLocal') }}</p>
      <p class="who-card">{{ t('guide.dropIntl') }}</p>
    </div>
    <p class="note">{{ t('guide.dropWhere') }}</p>
    <GuideLinks :links="[{ href: URLS.ENROL_POLICY, label: t('guide.enrolPolicyLink') }]" />
  </GuideItem>

  <GuideItem id="fail" :title="t('guide.failTitle')" :short="t('guide.failShort')">
    <ul class="plain">
      <li>{{ t('guide.failPoints') }}</li>
      <li>{{ t('guide.failRepeat') }}</li>
      <li>{{ t('guide.failProgress') }}</li>
      <li>{{ t('guide.failSupp') }}</li>
      <li>{{ t('guide.failSpecial') }}</li>
    </ul>
    <GuideCallout kind="warn">{{ t('guide.failIntl') }}</GuideCallout>
    <GuideLinks :links="[{ href: URLS.FAILING, label: t('guide.failLink') }]" />
  </GuideItem>
</template>
