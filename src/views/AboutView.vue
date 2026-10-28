<script setup lang="ts">
import { link } from '@/composables/useView'
import { ArrowRight, BookOpen, Calculator, Compass, GitCompare, GraduationCap, Route, Sparkles, Star } from 'lucide-vue-next'
import InfoPage from '@/components/about/InfoPage.vue'
import GuideItem from '@/components/guide/GuideItem.vue'
import { useI18n } from '@/i18n'
import { latestDataYear, lastVerified } from '@/engine/dataYear'
import { useDataset } from '@/composables/useDataset'

/**
 * /about/: why the site exists, what it does, where its information comes from, what it promises
 * and how to help. The update log lives on /changes/ (linked from "Where the information comes
 * from"); privacy details on /privacy/.
 */
const { t, locale } = useI18n()
const { all } = useDataset()
const dataYear = latestDataYear(all.subjects)
const checked = lastVerified(all.subjects)
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
// Every main part of the site. Majors and the guide go by their menu names, with their page's lede.
const features = [
  { key: 'lookup', icon: BookOpen, href: link(''), name: 'about.f.lookup', text: 'about.f.lookupText' },
  { key: 'plan', icon: Route, href: link('plan'), name: 'about.f.plan', text: 'about.f.planText' },
  { key: 'plans', icon: GitCompare, href: link('plan'), name: 'about.f.plans', text: 'about.f.plansText' },
  { key: 'suggest', icon: Sparkles, href: link('subjects/?mine=1'), name: 'about.f.suggest', text: 'about.f.suggestText' },
  { key: 'majors', icon: GraduationCap, href: link('majors'), name: 'browse.switchMajors', text: 'majors.cardText' },
  { key: 'record', icon: Calculator, href: link('record'), name: 'about.f.record', text: 'about.f.recordText' },
  { key: 'guide', icon: Compass, href: link('guide'), name: 'guide.nav', text: 'guide.lede' },
  { key: 'rate', icon: Star, href: link('record'), name: 'about.f.rate', text: 'about.f.rateText' },
] as const
</script>

<template>
  <InfoPage page="about" :title="t('menu.aboutSite')">
    <GuideItem id="why" :title="t('about.title')" :short="t('about.me')">
      <p>{{ t('about.why') }}</p>
      <p>{{ t('about.aim') }}</p>
    </GuideItem>

    <GuideItem id="features" :title="t('about.whatTitle')">
      <ul class="features">
        <li v-for="f in features" :key="f.key">
          <a class="feature tile" :href="f.href">
            <component :is="f.icon" :size="18" aria-hidden="true" class="feature-icon" />
            <span>
              <strong class="feature-name">{{ t(f.name) }}</strong>
              <span class="feature-text">{{ t(f.text) }}</span>
            </span>
          </a>
        </li>
      </ul>
    </GuideItem>

    <GuideItem id="data" :title="t('about.dataTitle')">
      <ul class="plain">
        <li>{{ t('about.dataFacts') }}</li>
        <li>{{ t('about.dataRatings') }}</li>
        <li>{{ t('about.dataDiscuss') }}</li>
        <li>{{ t('about.dataSuggest') }}</li>
      </ul>
      <p v-if="checked" class="note">{{ t('about.dataYear', { year: dataYear, date: day(checked) }) }}</p>
      <a class="ext" :href="link('changes/#changes-site')">{{ t('about.updatesTitle') }}<ArrowRight :size="16" aria-hidden="true" /></a>
    </GuideItem>

    <GuideItem id="promises" :title="t('about.promisesTitle')">
      <ul class="plain">
        <li>{{ t('about.p.free') }}</li>
        <li>{{ t('about.p.private') }} <a :href="link('privacy')">{{ t('privacy.title') }}</a></li>
        <li>{{ t('about.p.unofficial') }}</li>
      </ul>
    </GuideItem>

    <GuideItem id="help" :title="t('about.helpTitle')" :short="t('about.help')">
      <p class="actions">
        <a class="button button-accent" :href="link('record')">{{ t('about.helpRate') }}</a>
        <a class="button button-quiet" :href="link('contribute')">{{ t('nav.contribute') }}</a>
        <a class="button button-quiet" :href="link('feedback')">{{ t('nav.feedback') }}</a>
      </p>
    </GuideItem>
  </InfoPage>
</template>

<style scoped>
.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feature {
  display: flex;
  gap: 12px;
  height: 100%;
  padding: 16px 18px;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  transition: border-color 0.15s;
}

.feature:hover {
  border-color: var(--accent);
}

.feature-icon {
  flex: none;
  margin-top: 2px;
  color: var(--accent);
}

.feature-name {
  display: block;
  font-weight: var(--fw-semibold);
}

.feature-text {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-soft);
}
</style>
