<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { ArrowRight, BookOpen, Check, GraduationCap, ListFilter, Route, Sparkles, User } from 'lucide-vue-next'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { exampleSubjects } from '@/utils/showcase'

const { t, locale } = useI18n()
const { subjectList } = useDataset()

// The title is split into phrases that never break inside; languages written with spaces keep one between them.
const titleParts = computed(() => t.value('home.title').split('|'))
const spaced = computed(() => !['zh-CN', 'zh-TW', 'ja'].includes(locale.value))
const examples = computed(() => exampleSubjects(subjectList.value, 3).map((s) => s.code))

// Three steps for a new student. Each shows a tick and what's done once it is.
const { profile } = useProfile()
const plan = usePlan()
const steps = computed(() => {
  const p = profile.value
  const filled = p.results.length + Object.keys(p.skills).length + p.interests.length
  return [
    {
      icon: User,
      title: 'home.step1',
      text: 'home.step1Text',
      href: link('record'),
      done: filled > 0,
      status: filled > 0 ? t.value('home.step1Done', { results: p.results.length, interests: p.interests.length }) : t.value('home.optional'),
    },
    {
      icon: Route,
      title: 'home.step2',
      text: 'home.step2Text',
      href: link('plan'),
      done: !plan.isEmpty.value,
      status: plan.isEmpty.value ? '' : t.value('home.step2Done', { n: plan.plannedCodes.value.length }),
    },
    { icon: Sparkles, title: 'home.step3', text: 'home.step3Text', href: link('recommend'), done: false, status: '' },
  ]
})
// The one button that says where to go next: the first step not done yet.
const next = computed(() => {
  const i = steps.value.findIndex((s) => !s.done)
  return { n: i + 1, href: steps.value[i]?.href ?? link('recommend') }
})
</script>

<template>
  <div class="home">
    <div class="stage">
    <section class="hero">
      <p class="eyebrow">{{ t('home.eyebrow') }}</p>
      <!-- "|" marks where the title may break, so a phrase is never split mid-word. -->
      <h1 class="hero-title">
        <template v-for="(part, i) in titleParts" :key="i">
          <span class="hero-part">{{ part }}</span>
          <!-- A real space between phrases where the language uses spaces: it vanishes at a line break. -->
          <template v-if="spaced && i < titleParts.length - 1">{{ ' ' }}</template>
        </template>
      </h1>
      <p class="hero-lede">{{ t('home.lede') }}</p>
      <a class="button button-accent hero-start" :href="next.href">
        {{ t('home.startStep', { n: next.n }) }} <ArrowRight :size="18" aria-hidden="true" />
      </a>
      <SubjectSearch class="hero-search" />
      <p v-if="examples.length" class="hero-try">
        {{ t('home.tryLabel') }}
        <a v-for="c in examples" :key="c" class="code" :href="link(`subject/${c}`)">{{ c }}</a>
      </p>
    </section>


    <section class="steps" aria-labelledby="steps-title">
      <h2 id="steps-title" class="steps-title">{{ t('home.stepsTitle') }}</h2>
      <ol class="steps-list">
        <li v-for="(s, i) in steps" :key="s.title">
          <a class="step surface" :class="{ 'step-done': s.done }" :href="s.href">
            <span class="step-top">
              <span class="step-icon"><component :is="s.icon" :size="20" aria-hidden="true" /></span>
              <span class="step-num">{{ i + 1 }}</span>
              <Check v-if="s.done" :size="18" class="step-tick" :aria-label="t('home.done')" />
            </span>
            <span class="step-name">{{ t(s.title) }}</span>
            <span class="step-text">{{ t(s.text) }}</span>
            <span v-if="s.status" class="step-status">{{ s.status }}</span>
            <ArrowRight :size="18" aria-hidden="true" class="step-go" />
          </a>
        </li>
      </ol>
    </section>
    </div>


    <section class="tools" aria-labelledby="tools-title">
      <h2 id="tools-title" class="steps-title">{{ t('home.toolsTitle') }}</h2>
      <div class="tools-list">
        <a class="tool surface" :href="link('subjects')">
          <span class="tool-icon"><ListFilter :size="20" aria-hidden="true" /></span>
          <span class="tool-body">
            <span class="step-name">{{ t('browse.title') }}</span>
            <span class="step-text">{{ t('browse.lede') }}</span>
          </span>
          <ArrowRight :size="18" aria-hidden="true" class="tool-go" />
        </a>
        <a class="tool surface" :href="link('majors')">
          <span class="tool-icon"><GraduationCap :size="20" aria-hidden="true" /></span>
          <span class="tool-body">
            <span class="step-name">{{ t('majors.title') }}</span>
            <span class="step-text">{{ t('majors.cardText') }}</span>
          </span>
          <ArrowRight :size="18" aria-hidden="true" class="tool-go" />
        </a>
        <a class="tool surface" :href="link('guide')">
          <span class="tool-icon"><BookOpen :size="20" aria-hidden="true" /></span>
          <span class="tool-body">
            <span class="step-name">{{ t('guide.title') }}</span>
            <span class="step-text">{{ t('guide.lede') }}</span>
          </span>
          <ArrowRight :size="18" aria-hidden="true" class="tool-go" />
        </a>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 56px;
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

.hero-part {
  display: inline-block;
}


.hero-title {
  max-width: 16em;
  font-size: clamp(2.3rem, 5.6vw, 4.2rem);
  line-height: 1.05;
}

/* Characters are wider than Latin letters: a size down reads the same weight. */
:lang(zh-CN) .hero-title,
:lang(zh-TW) .hero-title,
:lang(ja) .hero-title,
:lang(ko) .hero-title {
  max-width: 12em;
  font-size: clamp(1.9rem, 4.6vw, 3.5rem);
  line-height: 1.2;
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
  font-size: 0.875rem;
  color: var(--ink-faint);
}

.hero-try a {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 70%);
  font-size: 0.8125rem;
  color: var(--ink);
  text-decoration: none;
}

.hero-try a:hover {
  color: var(--accent);
}

.hero-start {
  justify-self: start;
  min-height: 48px;
  padding: 0 22px;
  font-size: 1rem;
}

.steps-title {
  margin-bottom: 18px;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.step-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-num {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ink-faint);
}

.step-tick {
  margin-left: auto;
  color: var(--good);
}

.step-done {
  border-color: var(--good-soft);
}

.step-status {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}

.tools-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.tool {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;
}

.tool:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.tool-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 42px;
  height: 42px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 12px;
}

.tool-body {
  display: grid;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.tool-go {
  flex: none;
  color: var(--accent);
}

@media (max-width: 1000px) {
  .tools-list {
    grid-template-columns: 1fr;
  }
}

.steps-search {
  margin-top: 14px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.step-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.step-text {
  font-size: 0.9375rem;
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
    grid-template-columns: 1fr;
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

}

@media (prefers-reduced-motion: reduce) {
  .step,
  .step-go {
    transition: none;
  }
}
</style>

<style scoped>
/* The three steps sit beside the headline: what to do first is the first thing you see. */
.stage .steps-list {
  grid-template-columns: 1fr;
  gap: 10px;
}

.stage .steps-title {
  margin-bottom: 12px;
  font-size: 1.15rem;
}

.stage .step {
  gap: 4px;
  padding: 14px 44px 14px 18px;
}

.stage .step-top {
  gap: 8px;
}

.stage .step-name {
  font-size: 1rem;
}

.stage .step-text {
  font-size: 0.875rem;
}

.stage .step-go {
  left: auto;
  right: 16px;
  bottom: auto;
  top: 50%;
  translate: 0 -50%;
}

@media (min-width: 1000px) {
  .stage {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: center;
    column-gap: 48px;
  }
}
</style>
