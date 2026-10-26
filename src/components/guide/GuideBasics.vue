<script setup lang="ts">
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import { link } from '@/composables/useView'
import GradeScale from './GradeScale.vue'
import { useProfile } from '@/composables/useProfile'

// The "basics" category of the basics guide (see utils/guideSections).
const { t } = useI18n()
const { wam } = useProfile()
</script>

<template>
  <div class="list surface">
    <GuideItem id="first" :title="t('guide.firstTitle')" :short="t('guide.firstShort')" open>
      <ol class="steps">
        <li>{{ t('guide.firstStep1') }}</li>
        <li>{{ t('guide.firstStep2') }}</li>
        <li>{{ t('guide.firstStep3') }}</li>
        <li>{{ t('guide.firstStep4') }}</li>
      </ol>
      <p class="aside">{{ t('guide.breadthText') }}</p>
      <p class="aside">
        {{ t('guide.easyHardText') }}
        <a :href="link('subjects/easy/')">{{ t('browse.rankList.easy') }}</a> ·
        <a :href="link('subjects/hard/')">{{ t('browse.rankList.hard') }}</a>
      </p>
      <p class="actions">
        <a class="button button-accent" :href="link('subjects?preset=firstSemester')">{{ t('guide.firstFind') }}</a>
        <a class="button button-quiet" :href="link('majors')">{{ t('guide.firstMajors') }}</a>
        <a class="button button-quiet" :href="link('plan')">{{ t('guide.firstPlan') }}</a>
      </p>
    </GuideItem>

    <GuideItem id="points" :title="t('guide.pointsTitle')" :short="t('guide.pointsShort')">
      <p>{{ t('guide.pointsText') }}</p>
      <p>{{ t('guide.pointsYearLong') }}</p>
    </GuideItem>

    <GuideItem id="majors" :title="t('guide.majorsTitle')" :short="t('guide.majorsShort')">
      <ul class="plain">
        <li>{{ t('guide.majorsOne') }}</li>
        <li>{{ t('guide.majorsSecond') }}</li>
        <li>{{ t('guide.majorsMinor') }}</li>
        <li>{{ t('guide.majorsOnce') }}</li>
      </ul>
      <p class="note">{{ t('guide.majorsRulesYear') }}</p>
      <p class="note">{{ t('guide.majorsPairs') }}</p>
      <p class="note">{{ t('guide.majorsDiploma') }}</p>
      <p class="note">{{ t('guide.majorsDouble') }}</p>
      <p class="note">{{ t('guide.majorsScope') }}</p>
      <p class="note">{{ t('guide.majorsRelated') }}</p>
      <p class="aside">{{ t('guide.majorsPlans') }}</p>
      <p class="note">{{ t('guide.majorsPlansImage') }}</p>
      <p class="note">{{ t('guide.plansAssumed') }}</p>
      <p class="note">{{ t('guide.plansCampus') }}</p>
      <p class="actions">
        <a class="button button-quiet" :href="link('plan')">{{ t('guide.majorsPlansLink') }}</a>
      </p>
    </GuideItem>

    <GuideItem id="caps" :title="t('guide.capsTitle')" :short="t('guide.capsShort')">
      <ul class="plain">
        <li>{{ t('guide.capsDiscipline') }}</li>
        <li>{{ t('guide.capsDesignBreadth') }}</li>
        <li>{{ t('guide.capsDesignInformal') }}</li>
      </ul>
    </GuideItem>

    <GuideItem id="rules" :title="t('guide.rulesTitle')" :short="t('guide.rulesShort')">
      <dl class="terms">
        <div>
          <dt>{{ t('guide.prereqTerm') }}</dt>
          <dd>{{ t('guide.prereqText') }}</dd>
        </div>
        <div>
          <dt>{{ t('guide.coreqTerm') }}</dt>
          <dd>{{ t('guide.coreqText') }}</dd>
        </div>
        <div>
          <dt>{{ t('guide.nonTerm') }}</dt>
          <dd>{{ t('guide.nonText') }}</dd>
        </div>
      </dl>
      <p class="note">{{ t('guide.waiverText') }}</p>
    </GuideItem>

    <GuideItem id="grades" :title="t('guide.gradesTitle')" :short="t('guide.gradesShort')">
      <GradeScale />
    </GuideItem>

    <GuideItem id="wam" :title="t('guide.wamTitle')" :short="t('guide.wamShort')">
      <p>{{ t('guide.wamText') }}</p>
      <p class="formula">{{ t('guide.wamFormula') }}</p>
      <p>{{ t('guide.wamExample') }}</p>
      <ul class="plain">
        <li>{{ t('guide.wamIn') }}</li>
        <li>{{ t('guide.wamOut') }}</li>
      </ul>
      <p class="yours">
        <span>{{ wam !== null ? t('guide.wamYours', { wam }) : t('guide.wamNone') }}</span>
        <a class="button button-quiet" :href="link('record')">{{ t('guide.wamGo') }}</a>
      </p>
    </GuideItem>
  </div>
</template>
