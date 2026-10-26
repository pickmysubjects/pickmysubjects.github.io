<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import GuideServiceList from './GuideServiceList.vue'
import { URLS } from '@/utils/guideLinks'
import { ACCREDITATION as ACC } from '@/utils/accreditation'
import { link } from '@/composables/useView'

// The "help" category of the basics guide (see utils/guideSections).
const { t } = useI18n()
const RANKINGS = [
  { key: 'guide.qs', href: 'https://www.topuniversities.com/world-university-rankings' },
  { key: 'guide.the', href: 'https://www.timeshighereducation.com/world-university-rankings' },
  { key: 'guide.arwu', href: 'https://www.shanghairanking.com/rankings/arwu/2025' },
] as const
</script>

<template>
  <div class="list surface">
    <GuideItem id="dates" :title="t('guide.datesTitle')" :short="t('guide.datesShort')">
      <ul class="plain">
        <li>{{ t('guide.datesStart') }}</li>
        <li>{{ t('guide.datesS1') }}</li>
        <li>{{ t('guide.datesS2') }}</li>
        <li>{{ t('guide.datesOther') }}</li>
      </ul>
      <p>
        <a class="button button-quiet" :href="link('guide/key-dates/')">{{ t('guide.kd.title') }}</a>
      </p>
      <p>
        <a class="ext" :href="URLS.KEY_DATES" target="_blank" rel="noopener">{{ t('guide.datesLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="study-help" :title="t('guide.helpTitle')" :short="t('guide.helpShort')">
      <ul class="plain">
        <li>{{ t('guide.helpSkills') }}</li>
        <li>{{ t('guide.helpPass') }}</li>
        <li>{{ t('guide.helpExams') }}</li>
      </ul>
      <ul class="links">
        <li><a :href="URLS.SKILLS" target="_blank" rel="noopener">{{ t('guide.helpSkillsLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
        <li><a :href="URLS.EXAMS" target="_blank" rel="noopener">{{ t('guide.helpExamsLink') }}<ExternalLink :size="14" aria-hidden="true" /></a></li>
      </ul>
    </GuideItem>

    <GuideItem id="careers" :title="t('guide.careersTitle')" :short="t('guide.careersShort')">
      <p>{{ t('guide.careersText') }}</p>
      <p>{{ t('guide.careersPlan') }}</p>
      <p>
        <a class="button button-quiet" :href="link('careers/')">{{ t('guide.careersLink') }}</a>
      </p>
    </GuideItem>

    <GuideItem id="uni-careers" :title="t('guide.svcTopic.uni-careers.title')" :short="t('guide.svcTopic.uni-careers.short')">
      <GuideServiceList topic="uni-careers" />
    </GuideItem>

    <GuideItem id="accreditation" :title="t('guide.accTitle')" :short="t('guide.accShort')">
      <ul class="acc">
        <li v-for="a in ACC" :key="a.href">
          <p class="acc-head"><strong>{{ a.degree }}</strong> · {{ a.major ?? t('guide.accWhole') }}</p>
          <p class="acc-body">{{ a.body }}</p>
          <p>{{ t(`guide.${a.cond}`) }}</p>
          <a :href="a.href" target="_blank" rel="noopener" class="ext">{{ t('guide.accLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
        </li>
      </ul>
    </GuideItem>

    <GuideItem id="rankings" :title="t('guide.rankTitle')" :short="t('guide.rankShort')">
      <p>{{ t('guide.rankText') }}</p>
      <ul class="links">
        <li v-for="l in RANKINGS" :key="l.key">
          <a :href="l.href" target="_blank" rel="noopener">{{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" /></a>
        </li>
      </ul>
    </GuideItem>
  </div>
</template>
