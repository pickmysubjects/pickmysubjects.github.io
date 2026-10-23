<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
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
</script>

<template>
  <div class="list surface">
    <GuideItem id="rsl" :title="t('guide.rslTitle')" :short="t('guide.rslShort')">
      <ul class="plain">
        <li>{{ t('guide.rsl8202') }}</li>
        <li>{{ t('guide.rslUnder') }}</li>
        <li>{{ t('guide.rslGrounds') }}</li>
        <li>{{ t('guide.rslNot') }}</li>
      </ul>
      <p class="note">{{ t('guide.rslStay') }}</p>
      <p>
        <a class="ext" :href="URLS.RSL" target="_blank" rel="noopener">{{ t('guide.officialPage') }}: {{ t('guide.rslLink') }}<ExternalLink :size="14" aria-hidden="true" /></a>
      </p>
    </GuideItem>

    <GuideItem id="abroad" :title="t('guide.abroadTitle')" :short="t('guide.abroadShort')">
      <p>{{ t('guide.abroadText') }}</p>
      <ul class="links">
        <li v-for="l in ABROAD" :key="l.key">
          <a :href="l.href" target="_blank" rel="noopener">{{ t(l.key) }}<ExternalLink :size="14" aria-hidden="true" /></a>
        </li>
      </ul>
    </GuideItem>
  </div>
</template>
