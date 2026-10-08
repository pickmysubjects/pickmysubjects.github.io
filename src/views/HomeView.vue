<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, BookOpen, Route, Sparkles, Star } from 'lucide-vue-next'
import SubjectSearch from '@/components/SubjectSearch.vue'
import DataNotice from '@/components/DataNotice.vue'
import RouteLine from '@/components/home/RouteLine.vue'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { exampleSubjects } from '@/utils/showcase'

const { t } = useI18n()
const { subjectList } = useDataset()

const examples = computed(() => exampleSubjects(subjectList.value, 3).map((s) => s.code))

// What a student does, in the order they usually do it.
const steps = [
  { icon: BookOpen, title: 'home.cardSubject', text: 'home.cardSubjectText', href: '#/subject/COMP10001' },
  { icon: Route, title: 'home.cardPlan', text: 'home.cardPlanText', href: '#/plan' },
  { icon: Sparkles, title: 'home.cardForYou', text: 'home.cardForYouText', href: '#/recommend' },
  { icon: Star, title: 'about.f.rate', text: 'about.f.rateText', href: '#/record' },
] as const
</script>

<template>
  <div class="home">
    <div class="stage">
    <section class="hero">
      <p class="eyebrow">{{ t('home.eyebrow') }}</p>
      <h1 class="hero-title">{{ t('home.title') }}</h1>
      <p class="hero-lede">{{ t('home.lede') }}</p>
      <SubjectSearch class="hero-search" />
      <p v-if="examples.length" class="hero-try">
        {{ t('home.tryLabel') }}
        <a v-for="c in examples" :key="c" class="code" :href="`#/subject/${c}`">{{ c }}</a>
      </p>
    </section>

    <section class="hero-route surface">
      <RouteLine />
    </section>
    </div>

    <section class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title" class="steps-title">{{ t('home.stepsTitle') }}</h2>
      <ol class="steps-list">
        <li v-for="s in steps" :key="s.title">
          <a class="step surface" :href="s.href">
            <span class="step-icon"><component :is="s.icon" :size="20" aria-hidden="true" /></span>
            <span class="step-name">{{ t(s.title) }}</span>
            <span class="step-text">{{ t(s.text) }}</span>
            <ArrowRight :size="18" aria-hidden="true" class="step-go" />
          </a>
        </li>
      </ol>
    </section>

    <DataNotice />
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 40px;
  padding-top: 24px;
}

/* A rounded "stage" with a soft gradient mesh: headline, search and the example route. */
.stage {
  display: grid;
  gap: 36px;
  padding: 64px 56px 48px;
  border-radius: 36px;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(60% 80% at 0% 0%, #ffd6e8 0%, transparent 60%),
    radial-gradient(55% 70% at 100% 10%, #dcd8ff 0%, transparent 60%),
    radial-gradient(60% 80% at 80% 100%, #ffe6d2 0%, transparent 60%),
    linear-gradient(180deg, #fff7fb, #f6f4ff);
  border: 1px solid rgb(255 255 255 / 80%);
  box-shadow: 0 40px 80px -40px rgb(90 30 90 / 30%);
}

@media (prefers-color-scheme: dark) {
  .stage {
    background:
      radial-gradient(60% 80% at 0% 0%, #4a1a3a 0%, transparent 60%),
      radial-gradient(55% 70% at 100% 10%, #24255a 0%, transparent 60%),
      radial-gradient(60% 80% at 80% 100%, #3d2617 0%, transparent 60%),
      linear-gradient(180deg, #17121a, #121320);
    border-color: rgb(255 255 255 / 8%);
  }
}

.hero {
  display: grid;
  gap: 18px;
  max-width: 820px;
}

.hero .eyebrow {
  color: var(--accent);
}

.hero-title {
  font-size: clamp(2.6rem, 7vw, 5rem);
  line-height: 0.98;
}

.hero-lede {
  max-width: 54ch;
  font-size: clamp(1.05rem, 1.6vw, 1.18rem);
  color: var(--ink-soft);
}

.hero-search {
  max-width: 620px;
  margin-top: 6px;
}

.hero-try {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--ink-faint);
}

.hero-try a {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 70%);
  font-size: 0.82rem;
  color: var(--ink);
  text-decoration: none;
}

.hero-try a:hover {
  color: var(--accent);
}

.hero-route {
  padding: 26px 28px 20px;
}

.steps-title {
  margin-bottom: 18px;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  height: 100%;
  padding: 22px 22px 52px;
  color: var(--ink);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.step:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-2);
}

/* Gradient icon tiles, one hue each. */
.step-icon {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, #f472b6, #c2227a);
  box-shadow: 0 8px 18px -8px rgb(194 34 122 / 60%);
}

li:nth-child(2) .step-icon {
  background: linear-gradient(135deg, #fb923c, #e0457b);
}

li:nth-child(3) .step-icon {
  background: linear-gradient(135deg, #a78bfa, #6d5dfc);
  box-shadow: 0 8px 18px -8px rgb(109 93 252 / 60%);
}

li:nth-child(4) .step-icon {
  background: linear-gradient(135deg, #fbbf24, #f97316);
  box-shadow: 0 8px 18px -8px rgb(249 115 22 / 60%);
}

.step-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.step-text {
  font-size: 0.92rem;
  color: var(--ink-soft);
}

.step-go {
  position: absolute;
  left: 22px;
  bottom: 20px;
  color: var(--accent);
  transition: transform 0.15s;
}

.step:hover .step-go {
  transform: translateX(4px);
}

@media (max-width: 900px) {
  .steps-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stage {
    padding: 44px 28px 32px;
  }
}

@media (max-width: 560px) {
  .steps-list {
    grid-template-columns: 1fr;
  }

  .stage {
    padding: 32px 18px 20px;
    border-radius: 26px;
  }

  .hero-route {
    padding: 20px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .step,
  .step-go {
    transition: none;
  }
}
</style>
