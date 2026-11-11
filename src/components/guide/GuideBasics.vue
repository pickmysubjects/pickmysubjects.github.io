<script setup lang="ts">
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import TermText from './TermText.vue'
import GuideCallout from './GuideCallout.vue'
import GuideSee from './GuideSee.vue'
import DegreeGlance from './DegreeGlance.vue'
import { link } from '@/composables/useView'
import GradeScale from './GradeScale.vue'
import { useProfile } from '@/composables/useProfile'

// The "basics" category of the basics guide (see utils/guideSections).
const { t } = useI18n()
const { wam } = useProfile()
</script>

<template>
  <DegreeGlance />

  <GuideItem id="first" :title="t('guide.firstTitle')" :short="t('guide.firstShort')">
    <ol class="steps">
      <li><TermText :text="t('guide.firstStep1')" /></li>
      <li><TermText :text="t('guide.firstStep2')" /></li>
      <li><TermText :text="t('guide.firstStep3')" /></li>
      <li><TermText :text="t('guide.firstStep4')" /></li>
    </ol>
    <GuideSee to="enrol" />
    <p><TermText :text="t('guide.breadthText')" /></p>
    <GuideCallout>
      <p><TermText :text="t('guide.findShortlist')" /></p>
      <p>
        <TermText :text="t('guide.easyHardText')" />
        <a :href="link('subjects/easy/')">{{ t('browse.rankList.easy') }}</a> ·
        <a :href="link('subjects/hard/')">{{ t('browse.rankList.hard') }}</a>
      </p>
    </GuideCallout>
    <p class="actions">
      <a class="button button-accent" :href="link('subjects?preset=firstSemester')">{{ t('guide.firstFind') }}</a>
      <a class="button button-quiet" :href="link('majors')">{{ t('guide.firstMajors') }}</a>
      <a class="button button-quiet" :href="link('plan')">{{ t('guide.firstPlan') }}</a>
    </p>
  </GuideItem>

  <GuideItem id="points" :title="t('guide.pointsTitle')" :short="t('guide.pointsShort')">
    <p><TermText :text="t('guide.pointsText')" /></p>
    <p><TermText :text="t('guide.pointsYearLong')" /></p>
    <p><TermText :text="t('guide.pointsCredit')" /></p>
    <GuideCallout><TermText :text="t('guide.findCredit')" /></GuideCallout>
  </GuideItem>

  <GuideItem id="majors" :title="t('guide.majorsTitle')" :short="t('guide.majorsShort')">
    <ul class="plain">
      <li><TermText :text="t('guide.majorsOne')" /></li>
      <li><TermText :text="t('guide.majorsSecond')" /></li>
      <li><TermText :text="t('guide.majorsMinor')" /></li>
      <li><TermText :text="t('guide.majorsOnce')" /></li>
    </ul>
    <GuideCallout kind="pull"><TermText :text="t('guide.majorsRulesYear')" /></GuideCallout>
    <ul class="plain">
      <li><TermText :text="t('guide.majorsPairs')" /></li>
      <li><TermText :text="t('guide.majorsDiploma')" /></li>
      <li><TermText :text="t('guide.majorsDouble')" /></li>
      <li><TermText :text="t('guide.majorsScope')" /></li>
    </ul>
    <GuideCallout>
      <p><TermText :text="t('guide.majorsRoute')" /></p>
      <p><TermText :text="t('guide.majorsRelated')" /></p>
    </GuideCallout>
    <GuideSee to="plans" />
  </GuideItem>

  <GuideItem id="caps" :title="t('guide.capsTitle')" :short="t('guide.capsShort')">
    <ul class="plain">
      <li><TermText :text="t('guide.capsDiscipline')" /></li>
      <li><TermText :text="t('guide.capsDesignBreadth')" /></li>
      <li><TermText :text="t('guide.capsDesignInformal')" /></li>
    </ul>
  </GuideItem>

  <GuideItem id="rules" :title="t('guide.rulesTitle')" :short="t('guide.rulesShort')">
    <dl class="terms">
      <div>
        <dt><TermText :text="t('guide.prereqTerm')" /></dt>
        <dd><TermText :text="t('guide.prereqText')" /></dd>
      </div>
      <div>
        <dt><TermText :text="t('guide.coreqTerm')" /></dt>
        <dd><TermText :text="t('guide.coreqText')" /></dd>
      </div>
      <div>
        <dt><TermText :text="t('guide.nonTerm')" /></dt>
        <dd><TermText :text="t('guide.nonText')" /></dd>
      </div>
    </dl>
    <GuideSee to="waiver"><TermText :text="t('guide.waiverText')" /></GuideSee>
  </GuideItem>

  <GuideItem id="grades" :title="t('guide.gradesTitle')" :short="t('guide.gradesShort')">
    <GradeScale />
  </GuideItem>

  <GuideItem id="wam" :title="t('guide.wamTitle')" :short="t('guide.wamShort')">
    <p><TermText :text="t('guide.wamText')" /></p>
    <p class="formula"><TermText :text="t('guide.wamFormula')" /></p>
    <p><TermText :text="t('guide.wamExample')" /></p>
    <ul class="plain">
      <li><TermText :text="t('guide.wamIn')" /></li>
      <li><TermText :text="t('guide.wamOut')" /></li>
    </ul>
    <GuideCallout>
      <p><TermText :text="t('guide.findMarks')" /></p>
      <p><a :href="link('tools/wam/')">{{ t('guide.wamTool') }}</a></p>
      <p><TermText :text="t('guide.wamSync')" /></p>
      <p><TermText :text="t('guide.planDoneSync')" /></p>
    </GuideCallout>
    <p class="yours">
      <span>{{ wam !== null ? t('guide.wamYours', { wam }) : t('guide.wamNone') }}</span>
      <a class="button button-quiet" :href="link('record')">{{ t('guide.wamGo') }}</a>
    </p>
  </GuideItem>
</template>
