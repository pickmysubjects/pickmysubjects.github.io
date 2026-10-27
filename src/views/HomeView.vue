<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { ArrowRight, Check, CircleCheck } from 'lucide-vue-next'
import CanDoList from '@/components/home/CanDoList.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import DemoPlan from '@/components/home/DemoPlan.vue'
import DemoSubject from '@/components/home/DemoSubject.vue'
import demo from '@/generated/home-demo.json'
import type { HomeDemo } from '@/utils/homeDemo'
import { summariseAssessment } from '@/utils/assessment'

const { t, locale } = useI18n()

// The title is split into phrases that never break inside; languages written with spaces keep one between them.
// "|" marks where the title may break; "*…*" marks the words to emphasise.
const titleParts = computed(() =>
  t.value('home.title')
    .split('|')
    .map((part) => part.split('*').map((text, i) => ({ text, em: i % 2 === 1 })).filter((x) => x.text)),
)
const spaced = computed(() => !['zh-CN', 'zh-TW', 'ja'].includes(locale.value))
// Two real examples worked out at build time (scripts/homeDemo.ts): shown, not described.
const { subject: demoSubject, plan: demoPlan, stats } = demo as unknown as HomeDemo
// The final exam's share, for the small subject chip floating over the plan.
const examChip = computed(() => {
  const exam = summariseAssessment(demoSubject.assessment)?.parts.find((p) => p.kind === 'exam')
  return exam ? t.value('gist.exam', { n: exam.weight }) : ''
})
// A quiet row of plain facts under the hero, counted from the data at build time.
const proof = computed(() => {
  const n = (x: number) => x.toLocaleString(locale.value)
  return [
    t.value('home.proofSubjects', { n: n(stats.subjects) }),
    t.value('home.proofDegrees', { n: n(stats.degrees) }),
    t.value('home.proofLanguages'),
    t.value('home.proofFree'),
  ]
})

// Three steps for a new student. Each shows a tick and what's done once it is.
const { profile } = useProfile()
const plan = usePlan()
const steps = computed(() => {
  const p = profile.value
  const filled = p.results.length + Object.keys(p.skills).length + p.interests.length
  return [
    {
      title: 'home.step1',
      text: 'home.step1Text',
      href: link('record'),
      done: filled > 0,
      status: filled > 0 ? t.value('home.step1Done', { results: p.results.length, interests: p.interests.length }) : t.value('home.optional'),
    },
    {
      title: 'home.step2',
      text: 'home.step2Text',
      href: link('plan'),
      done: !plan.isEmpty.value,
      status: plan.isEmpty.value ? '' : t.value('home.step2Done', { n: plan.plannedCodes.value.length }),
    },
    { title: 'home.step3', text: 'home.step3Text', href: link('subjects/?mine=1'), done: false, status: '' },
  ]
})
// The one button that says where to go next: the first step not done yet.
const next = computed(() => {
  const i = steps.value.findIndex((s) => !s.done)
  return { n: i + 1, href: steps.value[i]?.href ?? link('subjects/?mine=1') }
})
</script>

<template>
  <div class="home">
    <!-- The hero: headline, one line, search; a real planned degree beside it. -->
    <section class="stage hero">
      <div class="hero-text">
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
        <!-- "|" marks where the title may break, so a phrase is never split mid-word. -->
        <h1 class="hero-title">
          <template v-for="(part, i) in titleParts" :key="i">
            <span class="hero-part"><template v-for="(seg, j) in part" :key="j"><em v-if="seg.em" class="hero-em">{{ seg.text }}</em><template v-else>{{ seg.text }}</template></template></span>
            <!-- A real space between phrases where the language uses spaces: it vanishes at a line break. -->
            <template v-if="spaced && i < titleParts.length - 1">{{ ' ' }}</template>
          </template>
        </h1>
        <p class="hero-sub">{{ t('home.sub') }}</p>
        <SubjectSearch class="hero-search" />
        <p class="hero-more">
          <a class="hero-link" :href="link('subjects')">{{ t('browse.title') }} <ArrowRight :size="16" aria-hidden="true" /></a>
          <span class="hero-scope">{{ t('home.scope') }}</span>
        </p>
      </div>
      <div class="hero-visual fade">
        <DemoPlan :plan="demoPlan" :aria-label="t('home.demoPlan')" hide-rules />
        <!-- Two small pieces of the real product floating over it: one subject's exam share, the plan's verdict. -->
        <a v-if="examChip" class="float float-subject glass" :href="link(`subject/${demoSubject.code}`)">
          <span class="float-code">{{ demoSubject.code }}</span> · {{ examChip }}
        </a>
        <span v-if="demoPlan.met === demoPlan.total" class="float float-ready glass">
          <CircleCheck :size="16" aria-hidden="true" /> {{ t('rules.progress', { met: demoPlan.met, total: demoPlan.total }) }}
        </span>
      </div>
    </section>

    <ul class="proof" :aria-label="t('home.eyebrow')">
      <li v-for="p in proof" :key="p">{{ p }}</li>
    </ul>

    <!-- One tidy grid: the subject example, the three steps, and the easy-to-miss features. -->
    <div class="bento">
      <DemoSubject class="tile-subject fade" :subject="demoSubject" :caption="t('home.demoSubject')" />
      <section class="tile-steps glass" aria-labelledby="steps-title">
        <div class="tile-head">
          <h2 id="steps-title" class="tile-title">{{ t('home.stepsTitle') }}</h2>
          <a class="button button-accent steps-start" :href="next.href">
            {{ t('home.startStep', { n: next.n }) }} <ArrowRight :size="18" aria-hidden="true" />
          </a>
        </div>
        <ol class="steps-list">
          <li v-for="(s, i) in steps" :key="s.title">
            <a class="step" :class="{ 'step-done': s.done }" :href="s.href">
              <span class="step-num">
                <Check v-if="s.done" :size="16" :stroke-width="3" :aria-label="t('home.done')" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="step-name">{{ t(s.title) }}</span>
              <span class="step-text">{{ t(s.text) }}</span>
              <span v-if="s.status" class="step-status">{{ s.status }}</span>
            </a>
          </li>
        </ol>
      </section>
      <CanDoList class="tile-can" />
    </div>
  </div>
</template>

<style scoped>
/* One rhythm between the hero, the proof row and the grid. */
.home {
  display: grid;
  gap: var(--space-6);
  padding-top: var(--space-5);
}

/* A rounded "stage" with a soft gradient mesh. */
.stage {
  padding: 64px 56px;
  border-radius: 36px;
  isolation: isolate;
  /* Glass over the page's colour field, tinted toward the brand at one corner. */
  background:
    radial-gradient(60% 80% at 0% 0%, rgb(194 34 122 / 12%), transparent 60%),
    var(--glass-shine),
    var(--card-fill);
  -webkit-backdrop-filter: var(--card-blur);
  backdrop-filter: var(--card-blur);
  border: 1px solid var(--card-edge);
  box-shadow: var(--card-shadow), 0 40px 80px -40px rgb(90 30 90 / 30%);
}

@media (prefers-color-scheme: dark) {
  .stage {
    background:
      radial-gradient(60% 80% at 0% 0%, rgb(240 107 176 / 14%), transparent 60%),
      var(--glass-shine),
      var(--card-fill);
  }
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 48px;
}

.hero-text {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.hero .eyebrow {
  margin: 0;
  color: var(--accent);
}

.hero-part {
  display: inline-block;
}

.hero-em {
  font-style: normal;
  background: linear-gradient(100deg, var(--accent), #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-title {
  font-size: clamp(2.2rem, 3.9vw, 3.4rem);
  line-height: 1.02;
}

/* Characters are wider than Latin letters: a size down reads the same weight. */
:lang(zh-CN) .hero-title,
:lang(zh-TW) .hero-title,
:lang(ja) .hero-title,
:lang(ko) .hero-title {
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1.2;
}

/* Longer words (Hindi, Vietnamese, Malay, Indonesian): a step smaller so the title stays short. */
:lang(hi) .hero-title,
:lang(vi) .hero-title,
:lang(ms) .hero-title,
:lang(id) .hero-title {
  font-size: clamp(2.1rem, 3.8vw, 3.2rem);
}

.hero-sub {
  margin: 0;
  max-width: 34em;
  font-size: 1.125rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.hero-search {
  margin-top: var(--space-3);
}

.hero-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-5);
  margin: 0;
}

.hero-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.hero-link:hover {
  text-decoration: underline;
}

.hero-scope {
  font-size: 0.875rem;
  color: var(--ink-faint);
}

/* The product visual: the plan card with two chips layered over its corners. */
.hero-visual {
  position: relative;
  min-width: 0;
  padding: 32px 0 32px 24px;
}

.float {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 14px 32px -12px rgb(80 40 90 / 35%);
}

.float-subject {
  top: 6px;
  right: -12px;
}

.float-code {
  color: var(--accent);
}

.float-ready {
  bottom: 4px;
  left: 0;
  color: var(--good);
}

/* Plain facts, quiet: one line, dots between. */
.proof {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2) var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.proof li + li::before {
  content: '·';
  margin-right: var(--space-5);
  color: var(--ink-faint);
}

/* Bento: subject card on the left, steps on the right, features across the bottom. */
.bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-5);
}

.tile-subject {
  grid-column: span 5;
}

.tile-steps {
  grid-column: span 7;
  display: grid;
  align-content: start;
  gap: var(--space-5);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
}

.tile-can {
  grid-column: 1 / -1;
}

.tile-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3) var(--space-4);
}

/* The single heading style below the hero (CanDoList uses the same). */
.tile-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A step: number, title, one line. The whole step is the link. */
.step {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  height: 100%;
  padding: var(--space-4);
  border: 1px solid var(--card-edge);
  border-radius: var(--radius);
  background: var(--glass-shine), var(--tile-fill);
  box-shadow: var(--card-shadow);
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s;
}

.step:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.step:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.step-num {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
  background: var(--accent);
  border-radius: 999px;
}

.step-done .step-num {
  background: var(--good);
}

.step-name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.step-text {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.step-status {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--good);
}

.steps-start {
  min-height: 44px;
  padding: 0 20px;
}

/* A short fade on load, nothing more. */
.fade {
  animation: fade-in 0.4s ease-out both;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }

  .tile-subject,
  .tile-steps {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .stage {
    padding: 40px 28px 28px;
  }
}

@media (max-width: 640px) {
  .home {
    gap: var(--space-5);
    padding-top: var(--space-3);
  }

  .stage {
    padding: 28px 16px 20px;
    border-radius: 26px;
  }

  .hero-sub {
    font-size: 1rem;
  }

  /* No room to float on a phone: the two chips sit in a row under the card instead of covering it. */
  .hero-visual {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
  }

  .hero-visual > :first-child {
    flex: 1 1 100%;
  }

  .float {
    position: static;
    white-space: normal;
  }

  .proof {
    justify-content: flex-start;
    gap: var(--space-2) var(--space-4);
    font-size: 0.875rem;
  }

  .proof li + li::before {
    display: none;
  }

  .proof li {
    padding: 4px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
  }

  .steps-list {
    grid-template-columns: 1fr;
  }

  .tile-steps {
    padding: var(--space-4);
  }

  .steps-start {
    flex: 1 1 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade {
    animation: none;
  }

  .step {
    transition: none;
  }
}
</style>
