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

    <section class="hero-route">
      <RouteLine />
    </section>

    <section class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title" class="steps-title display">{{ t('home.stepsTitle') }}</h2>
      <ol class="steps-list">
        <li v-for="s in steps" :key="s.title">
          <a class="step" :href="s.href">
            <component :is="s.icon" :size="20" aria-hidden="true" class="step-icon" />
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
  gap: 56px;
  padding-top: 48px;
}

.hero {
  display: grid;
  gap: 18px;
  max-width: 900px;
}

.hero-title {
  font-size: clamp(2.8rem, 8vw, 6rem);
  line-height: 0.95;
}

.hero-lede {
  max-width: 54ch;
  font-size: clamp(1.05rem, 1.6vw, 1.2rem);
  color: var(--ink-soft);
}

.hero-search {
  max-width: 620px;
  margin-top: 6px;
}

.hero-try {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 0.88rem;
  color: var(--ink-faint);
}

.hero-try a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--line);
  text-underline-offset: 4px;
}

.hero-try a:hover {
  text-decoration-color: var(--accent);
}

.hero-route {
  padding: 28px 28px 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.steps-title {
  margin-bottom: 18px;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--line);
  list-style: none;
}

.step {
  position: relative;
  display: grid;
  align-content: start;
  gap: 8px;
  height: 100%;
  padding: 22px 22px 48px;
  background: var(--surface);
  color: var(--ink);
  text-decoration: none;
  transition: background 0.15s;
}

.step:hover {
  background: var(--accent-soft);
}

.step-icon {
  color: var(--accent);
}

.step-name {
  font-family: var(--font-display);
  font-size: 1.15rem;
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
  bottom: 18px;
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
}

@media (max-width: 560px) {
  .home {
    gap: 40px;
    padding-top: 28px;
  }

  .steps-list {
    grid-template-columns: 1fr;
  }

  .hero-route {
    padding: 22px 18px;
  }
}
</style>
