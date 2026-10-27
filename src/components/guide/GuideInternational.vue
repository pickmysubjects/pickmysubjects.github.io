<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import GuideCallout from './GuideCallout.vue'
import GuideLinks from './GuideLinks.vue'
import GuideSee from './GuideSee.vue'
import InfoTip from '@/components/InfoTip.vue'
import { URLS } from '@/utils/guideLinks'

// The "international" category of the basics guide (see utils/guideSections).
const { t, locale } = useI18n()
// Official bodies (checked 2026-10-09). `home`: the site language whose readers most likely
// need it, listed first for them. India moved from AIU to the UGC in April 2025.
const ABROAD_ALL: { key: string; href: string; home?: string }[] = [
  { key: 'guide.wes', href: 'https://www.wes.org/' },
  { key: 'guide.enic', href: 'https://www.enic.org.uk/' },
  { key: 'guide.cscse', href: 'https://zwfw.cscse.edu.cn/', home: 'zh-CN' },
  { key: 'guide.abroadJp', href: 'https://www.nicjp.niad.ac.jp/en/', home: 'ja' },
  { key: 'guide.abroadKr', href: 'https://www.karic.kr', home: 'ko' },
  { key: 'guide.abroadVn', href: 'https://naric.edu.vn', home: 'vi' },
  { key: 'guide.abroadMy', href: 'https://www.mqa.gov.my', home: 'ms' },
  { key: 'guide.abroadId', href: 'https://piln.kemdiktisaintek.go.id', home: 'id' },
  { key: 'guide.abroadIn', href: 'https://equivalence.ugc.ac.in', home: 'hi' },
  { key: 'guide.abroadTw', href: 'https://www.fsedu.moe.gov.tw', home: 'zh-TW' },
  { key: 'guide.abroadHk', href: 'https://www.hkcaavq.edu.hk/en/services/qualifications-assessment/', home: 'zh-TW' },
  { key: 'guide.umCalc', href: 'https://study.unimelb.edu.au/how-to-apply/graduate-coursework-study/grade-conversion-eligibility-calculator' },
]
// The reader's own country first, the rest in the usual order.
const ABROAD = computed(() => [...ABROAD_ALL].sort((a, b) => Number(b.home === locale.value) - Number(a.home === locale.value)))
// What international students need from other pages: linked, not repeated here.
const ELSEWHERE = ['load', 'drop', 'exams', 'fail'] as const
</script>

<template>
  <GuideItem id="rsl" :title="t('guide.rslTitle')" :short="t('guide.rslShort')">
    <ul class="plain">
      <li>{{ t('guide.rsl8202') }}</li>
      <li>{{ t('guide.rslUnder') }}</li>
    </ul>
    <div class="who">
      <p class="who-card who-yes">{{ t('guide.rslGrounds') }}</p>
      <p class="who-card who-no">{{ t('guide.rslNot') }}</p>
    </div>
    <GuideCallout kind="pull">{{ t('guide.rslStay') }}</GuideCallout>
    <GuideLinks :links="[{ href: URLS.RSL, label: t('guide.rslLink') }]" />
  </GuideItem>

  <GuideItem id="online" :title="t('guide.onlineTitle')" :short="t('guide.onlineShort')">
    <p>
      {{ t('guide.onlineLine') }}<InfoTip>{{ t('guide.onlineMore') }} <a :href="URLS.ONLINE_LIMIT" target="_blank" rel="noopener">{{ t('guide.onlineLink') }}<ExternalLink :size="13" aria-hidden="true" /></a></InfoTip>
    </p>
  </GuideItem>

  <GuideItem id="abroad" :title="t('guide.abroadTitle')" :short="t('guide.abroadShort')">
    <p>{{ t('guide.abroadText') }}</p>
    <GuideLinks :links="ABROAD.map((l) => ({ href: l.href, label: t(l.key) }))" />
  </GuideItem>

  <section id="elsewhere" class="elsewhere surface" aria-labelledby="intl-also" :data-toc="t('guide.intlAlso')">
    <h2 id="intl-also" class="elsewhere-title">{{ t('guide.intlAlso') }}</h2>
    <ul class="elsewhere-list">
      <li v-for="id in ELSEWHERE" :key="id"><GuideSee :to="id" /></li>
    </ul>
  </section>
</template>

<style scoped>
.elsewhere {
  display: grid;
  scroll-margin-top: 96px;
  gap: 12px;
  padding: 22px 28px 24px;
}

.elsewhere-title {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.elsewhere-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 640px) {
  .elsewhere {
    padding: 20px 18px;
    border-radius: 20px;
  }
}
</style>
