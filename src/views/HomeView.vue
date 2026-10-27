<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { ArrowRight, CalendarCheck, Gauge, Globe } from 'lucide-vue-next'
import ReleasePill from '@/components/home/ReleasePill.vue'
import WhatsNext from '@/components/home/WhatsNext.vue'
import HomeTools from '@/components/home/HomeTools.vue'
import StartSteps from '@/components/home/StartSteps.vue'
import HeroCampus from '@/components/home/HeroCampus.vue'
import Interp from '@/components/Interp.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const { data } = useDataset()

// The title is split into phrases that never break inside; languages written with spaces keep one between them.
// "|" marks where the title may break; "*…*" marks the words to emphasise.
const titleParts = computed(() =>
  t.value('home.title')
    .split('|')
    .map((part) => part.split('*').map((text, i) => ({ text, em: i % 2 === 1 })).filter((x) => x.text)),
)
const spaced = computed(() => !['zh-CN', 'zh-TW', 'ja'].includes(locale.value))
// How many subjects the site knows, counted from the data itself.
const subjectCount = computed(() => Object.keys(data.value.subjects).length.toLocaleString(locale.value))

const { profile, wam } = useProfile()
const plan = usePlan()
// Someone who has been here before (a degree, a record or a plan): the hero sends them back to it.
const returning = computed(() => plan.courseChosen.value || !plan.isEmpty.value || profile.value.results.length > 0)
</script>

<template>
  <div class="home">
    <!-- The hero: the promise, the search, one quiet second step and three facts; the campus beside it. -->
    <section class="hero">
      <div class="hero-panel">
        <ReleasePill />
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
        <!-- "|" marks where the title may break, so a phrase is never split mid-word. -->
        <h1 class="hero-title">
          <template v-for="(part, i) in titleParts" :key="i">
            <span class="hero-part"><template v-for="(seg, j) in part" :key="j"><em v-if="seg.em" class="hero-em">{{ seg.text }}</em><template v-else>{{ seg.text }}</template></template></span>
            <!-- A real space between phrases where the language uses spaces: it vanishes at a line break. -->
            <template v-if="spaced && i < titleParts.length - 1">{{ ' ' }}</template>
          </template>
        </h1>
        <SubjectSearch class="hero-search" hero :placeholder="t('home.searchHero')" />
        <!-- Second to the search: plan a degree, or, for someone who has, go back to it. -->
        <div class="hero-actions">
          <a class="hero-second" :href="link('plan')">
            {{ returning ? t('home.continuePlan') : t('home.cardPlan') }} <ArrowRight :size="17" aria-hidden="true" />
          </a>
          <a v-if="returning && wam !== null" class="hero-wam" :href="link('tools/wam/')">{{ t('record.sumWam', { wam }) }}</a>
        </div>
        <ul class="sig">
          <li>
            <Gauge :size="17" aria-hidden="true" />
            <span><Interp :text="t('home.sigSubjects')"><template #n><b>{{ subjectCount }}</b></template></Interp></span>
          </li>
          <li><CalendarCheck :size="17" aria-hidden="true" /><span>{{ t('home.sigPlan') }}</span></li>
          <li><Globe :size="17" aria-hidden="true" /><span>{{ t('home.proofLanguages') }}</span></li>
        </ul>
      </div>
      <HeroCampus class="hero-scene" />
    </section>

    <WhatsNext />

    <!-- The three steps for a new student. -->
    <StartSteps />

    <HomeTools />
  </div>
</template>

<style scoped>
/* One rhythm between the hero, the dates strip and the sections below. */
.home {
  display: grid;
  gap: var(--space-6);
  padding-top: var(--space-4);
}

/* The hero: a glass panel with the words, the campus scene beside it. */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 5.6fr);
  align-items: center;
  gap: clamp(16px, 3vw, 40px);
}

.hero-panel {
  position: relative;
  /* Above the illustration, so the search's list of matches isn't covered by it. */
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: start;
  min-width: 0;
  padding: 40px 44px 42px;
  border-radius: 40px;
  isolation: isolate;
  /* Glass over the page's colour field, tinted toward the brand at one corner. */
  background:
    radial-gradient(60% 80% at 0% 0%, rgb(194 34 122 / 12%), transparent 60%),
    var(--glass-shine),
    var(--card-fill);
  -webkit-backdrop-filter: var(--card-blur);
  backdrop-filter: var(--card-blur);
  border: 1px solid var(--card-edge);
  box-shadow: var(--card-shadow), 0 40px 80px -40px rgb(91 42 107 / 40%);
}

@media (prefers-color-scheme: dark) {
  .hero-panel {
    background:
      radial-gradient(60% 80% at 0% 0%, rgb(240 107 176 / 14%), transparent 60%),
      var(--glass-shine),
      var(--card-fill);
  }
}

.hero .eyebrow {
  margin: 18px 0 10px;
  font-size: 0.9375rem;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.hero-part {
  display: inline-block;
  max-width: 100%;
}

.hero-em {
  font-style: normal;
  background: linear-gradient(100deg, var(--accent-fill) 10%, #8f7bf5 95%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@media (prefers-color-scheme: dark) {
  .hero-em {
    background-image: linear-gradient(100deg, #f06bb0 10%, #b3a6ff 95%);
  }
}

.hero-title {
  font-size: clamp(2.4rem, 3.4vw, 3rem);
  font-weight: 800;
  line-height: 1.06;
  letter-spacing: -0.03em;
}

/* Characters are wider than Latin letters, and the Chinese title is only two short lines. */
:lang(zh-CN) .hero-title,
:lang(zh-TW) .hero-title {
  font-size: clamp(2.6rem, 4.3vw, 3.875rem);
  line-height: 1.12;
}

:lang(ja) .hero-title,
:lang(ko) .hero-title {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  line-height: 1.18;
}

/* Longer words (Hindi, Vietnamese, Malay, Indonesian): a step smaller so the title stays short. */
:lang(hi) .hero-title,
:lang(vi) .hero-title,
:lang(ms) .hero-title,
:lang(id) .hero-title {
  font-size: clamp(2.1rem, 3.6vw, 3.1rem);
  line-height: 1.12;
}

:lang(hi) .hero-title {
  line-height: 1.3;
}

.hero-search {
  justify-self: stretch;
  margin-top: 30px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: 14px;
}

/* Quieter than the search: a glass pill with pink text. */
.hero-second,
.hero-wam {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 20px;
  font-size: 0.9375rem;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
  transition: background-color 0.15s;
}

.hero-wam {
  padding: 0 16px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.hero-second:hover,
.hero-wam:hover {
  background: var(--glass-shine), var(--glass-fill-hover);
}

.hero-second:focus-visible,
.hero-wam:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* The three things only this site does, as small glass chips. */
.sig {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 26px 0 0;
  padding: 0;
  list-style: none;
}

.sig li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px 6px 10px;
  font-size: 0.875rem;
  font-weight: var(--fw-medium);
  color: var(--ink-soft);
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
}

.sig svg {
  flex: none;
  color: var(--accent);
}

.sig b {
  font-weight: var(--fw-bold);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.hero-scene {
  min-width: 0;
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  }

  .hero-panel {
    padding: 32px 30px;
  }
}

/* Tablets and phones: words first, the scene under them, smaller. */
@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .hero-scene {
    justify-self: center;
    width: min(100%, 560px);
    margin-top: 4px;
  }
}

@media (max-width: 640px) {
  .home {
    gap: var(--space-5);
    padding-top: var(--space-2);
  }

  .hero-panel {
    padding: 20px 18px 22px;
    border-radius: 30px;
  }

  .hero .eyebrow {
    margin: 14px 0 8px;
    font-size: 0.875rem;
  }

  .hero-title,
  :lang(ja) .hero-title,
  :lang(ko) .hero-title {
    font-size: clamp(2rem, 9.4vw, 2.75rem);
  }

  :lang(zh-CN) .hero-title,
  :lang(zh-TW) .hero-title {
    font-size: clamp(2.25rem, 11.4vw, 3.25rem);
  }

  :lang(hi) .hero-title,
  :lang(vi) .hero-title,
  :lang(ms) .hero-title,
  :lang(id) .hero-title {
    font-size: clamp(1.75rem, 8.2vw, 2.4rem);
  }

  .hero-search {
    margin-top: 20px;
  }

  .hero-actions {
    margin-top: 10px;
  }

  .hero-second {
    padding: 0 16px;
    font-size: 0.875rem;
  }

  .sig {
    gap: 6px;
    margin-top: 14px;
  }

  .sig li {
    padding: 5px 10px 5px 8px;
    font-size: 0.8125rem;
    gap: 5px;
  }

  .hero-scene {
    width: 80%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-second,
  .hero-wam {
    transition: none;
  }
}
</style>
