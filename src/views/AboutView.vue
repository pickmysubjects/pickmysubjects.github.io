<script setup lang="ts">
import { BookOpen, Route, Sparkles, Star } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const features = [
  { key: 'lookup', icon: BookOpen, href: '#/' },
  { key: 'plan', icon: Route, href: '#/plan' },
  { key: 'suggest', icon: Sparkles, href: '#/recommend' },
  { key: 'rate', icon: Star, href: '#/record' },
] as const
</script>

<template>
  <article class="about">
    <header>
      <p class="about-eyebrow">{{ t('about.eyebrow') }}</p>
      <h1 class="about-title">{{ t('about.title') }}</h1>
    </header>

    <section class="about-story">
      <p>{{ t('about.me') }}</p>
      <p>{{ t('about.why') }}</p>
      <p>{{ t('about.aim') }}</p>
    </section>

    <section>
      <h2 class="about-h2">{{ t('about.whatTitle') }}</h2>
      <ul class="about-features">
        <li v-for="f in features" :key="f.key">
          <a class="feature surface" :href="f.href">
            <component :is="f.icon" :size="18" aria-hidden="true" class="feature-icon" />
            <span>
              <strong class="feature-name">{{ t(`about.f.${f.key}`) }}</strong>
              <span class="feature-text">{{ t(`about.f.${f.key}Text`) }}</span>
            </span>
          </a>
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

    <section>
      <h2 class="about-h2">{{ t('about.helpTitle') }}</h2>
      <p class="about-help">{{ t('about.help') }}</p>
      <p class="about-actions">
        <a class="button button-accent" href="#/record">{{ t('about.helpRate') }}</a>
        <a class="button button-quiet" href="#/contribute">{{ t('nav.contribute') }}</a>
        <a class="button button-quiet" href="#/feedback">{{ t('nav.feedback') }}</a>
      </p>
    </section>
  </article>
</template>

<style scoped>
.about {
  padding-top: 32px;
  display: grid;
  gap: 32px;
  max-width: 760px;
}

.about-eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}


.about-story {
  display: grid;
  gap: 14px;
  font-size: 1.05rem;
  line-height: 1.7;
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
  font-size: 0.92rem;
  color: var(--ink-soft);
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
</style>
