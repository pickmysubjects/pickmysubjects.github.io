<script setup lang="ts">
import { link } from '@/composables/useView'
import { BookOpen, Calculator, Compass, GitCompare, GraduationCap, Route, Sparkles, Star } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { latestDataYear, lastVerified } from '@/engine/dataYear'
import { useDataset } from '@/composables/useDataset'
import { SITE_UPDATES } from '@/content/updates'

const { t, locale } = useI18n()
// Which Handbook year the data is from and when it was last checked, then what changed lately.
const { all } = useDataset()
const dataYear = latestDataYear(all.subjects)
const checked = lastVerified(all.subjects)
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
// Every main part of the site. Majors and the guide reuse their own page's title and lede.
const features = [
  { key: 'lookup', icon: BookOpen, href: link(''), name: 'about.f.lookup', text: 'about.f.lookupText' },
  { key: 'plan', icon: Route, href: link('plan'), name: 'about.f.plan', text: 'about.f.planText' },
  { key: 'plans', icon: GitCompare, href: link('plan'), name: 'about.f.plans', text: 'about.f.plansText' },
  { key: 'suggest', icon: Sparkles, href: link('subjects/?mine=1'), name: 'about.f.suggest', text: 'about.f.suggestText' },
  { key: 'majors', icon: GraduationCap, href: link('majors'), name: 'majors.title', text: 'majors.cardText' },
  { key: 'record', icon: Calculator, href: link('record'), name: 'about.f.record', text: 'about.f.recordText' },
  { key: 'guide', icon: Compass, href: link('guide'), name: 'guide.title', text: 'guide.lede' },
  { key: 'rate', icon: Star, href: link('record'), name: 'about.f.rate', text: 'about.f.rateText' },
] as const
</script>

<template>
  <article class="about">
    <header>
      <p class="about-eyebrow">{{ t('about.eyebrow') }}</p>
      <h1 class="about-title">{{ t('about.title') }}</h1>
    </header>

    <!-- One-line lead first; the backstory folds away for whoever wants it. -->
    <p class="about-lead">{{ t('about.aim') }}</p>

    <section>
      <h2 class="about-h2">{{ t('about.whatTitle') }}</h2>
      <ul class="about-features">
        <li v-for="f in features" :key="f.key">
          <a class="feature surface tile" :href="f.href">
            <component :is="f.icon" :size="18" aria-hidden="true" class="feature-icon" />
            <span>
              <strong class="feature-name">{{ t(f.name) }}</strong>
              <span class="feature-text">{{ t(f.text) }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="about-h2">{{ t('about.dataTitle') }}</h2>
      <ul class="about-list">
        <li>{{ t('about.dataFacts') }}</li>
        <li>{{ t('about.dataRatings') }}</li>
        <li>{{ t('about.dataDiscuss') }}</li>
        <li>{{ t('about.dataSuggest') }}</li>
      </ul>
    </section>

    <section>
      <h2 class="about-h2">{{ t('about.updatesTitle') }}</h2>
      <p v-if="checked" class="about-data-year">{{ t('about.dataYear', { year: dataYear, date: day(checked) }) }}</p>
      <ul class="about-updates">
        <li v-for="(u, i) in SITE_UPDATES" :key="i">
          <time :datetime="u.date">{{ day(u.date) }}</time>
          <span>{{ u.text[locale] }}</span>
        </li>
      </ul>
    </section>

    <section class="about-promises surface">
      <h2 class="about-h2">{{ t('about.promisesTitle') }}</h2>
      <ul>
        <li>{{ t('about.p.free') }}</li>
        <li>{{ t('about.p.private') }}</li>
        <li>{{ t('about.p.unofficial') }}</li>
      </ul>
    </section>

    <details class="about-story surface">
      <summary class="about-h2">{{ t('about.storyTitle') }}</summary>
      <p>{{ t('about.me') }}</p>
      <p>{{ t('about.why') }}</p>
    </details>

    <section>
      <h2 class="about-h2">{{ t('about.helpTitle') }}</h2>
      <p class="about-help">{{ t('about.help') }}</p>
      <p class="about-actions">
        <a class="button button-accent" :href="link('record')">{{ t('about.helpRate') }}</a>
        <a class="button button-quiet" :href="link('contribute')">{{ t('nav.contribute') }}</a>
        <a class="button button-quiet" :href="link('feedback')">{{ t('nav.feedback') }}</a>
      </p>
    </section>
  </article>
</template>

<style scoped>
.about {
  padding-top: var(--page-top);
  display: grid;
  gap: 32px;
  max-width: 760px;
}

.about-eyebrow {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}


.about-h2 {
  margin-bottom: 12px;
  font-size: 1.15rem;
  font-weight: 650;
}

.about-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
  font-weight: 650;
}

.feature-text {
  display: block;
  margin-top: 4px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.about-data-year {
  margin: 0 0 var(--space-2);
  color: var(--ink-soft);
}

.about-updates {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.about-updates li {
  display: grid;
  grid-template-columns: 7.5em minmax(0, 1fr);
  gap: var(--space-2);
}

.about-updates time {
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.about-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.about-promises {
  padding: 20px 22px;
}

.about-promises ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.about-help {
  line-height: 1.7;
}

.about-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.about-lead {
  max-width: 62ch;
  font-size: 1.1rem;
  color: var(--ink-soft);
}

.about-story {
  padding: 4px 20px;
}

.about-story summary {
  margin: 0;
  display: flex;
  align-items: center;
  min-height: 48px;
  cursor: pointer;
}

.about-story p {
  margin: 0 0 14px;
  line-height: 1.7;
  color: var(--ink-soft);
}
</style>
