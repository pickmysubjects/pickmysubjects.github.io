<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import BottomNav from './components/layout/BottomNav.vue'
import Interp from './components/Interp.vue'
import AppLogo from './components/AppLogo.vue'
import MySteps from './components/layout/MySteps.vue'
import { MY_STEPS } from './components/layout/nav'
import { VIEW_LOADERS } from './views/loaders'
import { defineAsyncComponent, watchEffect } from 'vue'
import { useView, link } from './composables/useView'
import { useDataset } from './composables/useDataset'
import { useI18n } from './i18n'
import { localTitle, withLocalTitle } from './i18n/localized'
import { PRESET_TITLE_KEYS, subjectTitleKey } from '@/utils/seo'
import { presetFromSlug, rankFromSlug } from '@/engine'

const lazy = (v: keyof typeof VIEW_LOADERS) => defineAsyncComponent(VIEW_LOADERS[v])
const HomeView = lazy('home')
const SubjectView = lazy('subject')
const PlannerView = lazy('plan')
const RecordView = lazy('record')
const ContributeView = lazy('contribute')
const FeedbackView = lazy('feedback')
const PrivacyView = lazy('privacy')
const AboutView = lazy('about')
const GuideView = lazy('guide')
const BrowseView = lazy('subjects')
const MajorsView = lazy('majors')

const { view, param } = useView()
const { t, locale } = useI18n()
const { data, course } = useDataset()

// The tab title follows the page and the language (the built page only has the first one).
const TITLES: Partial<Record<string, string>> = {
  plan: 'plan.title',
  record: 'record.title',
  contribute: 'contribute.title',
  feedback: 'feedback.title',
  privacy: 'privacy.title',
  about: 'about.title',
  guide: 'guide.title',
  subjects: 'browse.title',
  majors: 'majors.title',
}
watchEffect(() => {
  const s = view.value === 'subject' ? data.value.subjects[param.value.toUpperCase()] : undefined
  const key = TITLES[view.value]
  const major = view.value === 'majors' && param.value ? data.value.components.find((c) => c.id === param.value) : undefined
  // A quick pick's own page keeps the title its static page has, so search engines that run
  // the app see the same one.
  const preset = view.value === 'subjects' ? presetFromSlug(param.value) : undefined
  const ranking = view.value === 'subjects' ? rankFromSlug(param.value) : undefined
  const year = Math.max(...Object.values(data.value.subjects).map((x) => x.sourceYear))
  // Breadth depends on the degree: the static page names the Bachelor of Science, but a student
  // planning another degree sees that degree's breadth list, so the title names it instead.
  const breadthElsewhere = preset === 'breadth' && course.value !== 'B-SCI' ? data.value.courses.find((c) => c.code === course.value)?.title : undefined
  document.title = s
    ? `${t.value(subjectTitleKey(s), { code: s.code, title: withLocalTitle(s.title, localTitle(s, locale.value)) })} | PickMySubjects`
    : major
      ? `${t.value(major.informal ? 'seo.informalTitle' : major.kind === 'minor' ? 'seo.minorTitle' : major.kind === 'specialisation' ? 'seo.specTitle' : 'seo.majorTitle', { title: major.title })} | PickMySubjects`
      : ranking
        ? `${t.value(ranking === 'easy' ? 'seo.rankEasy' : 'seo.rankHard', { year })} | PickMySubjects`
      : preset
        ? `${breadthElsewhere ? t.value('seo.presetBreadthFor', { course: breadthElsewhere, year }) : t.value(PRESET_TITLE_KEYS[preset], { year })} | PickMySubjects`
      : key
      ? `${t.value(key)} | PickMySubjects`
      : t.value('seo.homeTitle')
})
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <span class="blob blob-1" />
    <span class="blob blob-2" />
    <span class="blob blob-3" />
    <AppLogo class="backdrop-mark" />
  </div>
  <AppHeader :view="view" />
  <main class="app-main shell" :class="{ 'shell-wide': view === 'plan' }">
    <!-- Narrow screens: Me's two steps as a slim switch in the page (wide screens: in the bar). -->
    <MySteps v-if="MY_STEPS.some((x) => x.view === view)" class="page-steps" />
    <HomeView v-if="view === 'home'" />
    <SubjectView v-else-if="view === 'subject'" :key="param" :code="param" />
    <PlannerView v-else-if="view === 'plan'" />
    <RecordView v-else-if="view === 'record'" />
    <ContributeView v-else-if="view === 'contribute'" />
    <FeedbackView v-else-if="view === 'feedback'" />
    <AboutView v-else-if="view === 'about'" />
    <GuideView v-else-if="view === 'guide'" />
    <BrowseView v-else-if="view === 'subjects'" />
    <MajorsView v-else-if="view === 'majors'" :id="param" />
    <PrivacyView v-else />
  </main>
  <footer class="footer">
    <div class="footer-inner shell">
      <nav class="footer-links" :aria-label="t('nav.more')">
        <a :href="link('subjects')">{{ t('browse.title') }}</a>
        <a :href="link('majors')">{{ t('majors.title') }}</a>
        <a :href="link('guide')">{{ t('guide.title') }}</a>
        <a :href="link('about')">{{ t('app.about') }}</a>
        <a :href="link('contribute')">{{ t('nav.contribute') }}</a>
        <a :href="link('feedback')">{{ t('nav.feedback') }}</a>
        <a :href="link('privacy')">{{ t('app.privacy') }}</a>
        <a href="https://github.com/pickmysubjects/pickmysubjects.github.io" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <p class="footer-note">
        <Interp :text="t('app.footer')">
          <template #handbook>
            <a href="https://handbook.unimelb.edu.au/" target="_blank" rel="noopener">{{ t('app.handbook') }}</a>
          </template>
        </Interp>
      </p>
    </div>
  </footer>
  <BottomNav :view="view" />
</template>

<style scoped>
.app-main {
  min-height: 70vh;
  padding-bottom: 72px;
}

.footer {
  border-top: 1px solid var(--line);
  padding: 28px 0 40px;
}

.footer-inner {
  display: grid;
  gap: 12px;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  font-size: 0.9375rem;
  font-weight: 500;
}

.footer-links a {
  color: var(--ink);
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--accent);
}

.footer-note {
  max-width: 90ch;
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  /* Clear the fixed bottom tabs, including the home-indicator inset. */
  .footer {
    padding-bottom: calc(104px + env(safe-area-inset-bottom));
  }

  .footer-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }

  .footer-links a {
    display: flex;
    align-items: center;
    min-height: 40px;
  }
}

.app-main > .page-steps {
  display: none;
}

@media (max-width: 1100px) {
  .app-main > .page-steps {
    display: flex;
    margin-top: 12px;
  }

  .app-main > .page-steps :deep(.step) {
    min-height: 34px;
    font-size: 0.875rem;
  }

  .app-main > .page-steps :deep(svg) {
    display: none;
  }
}

/* The plan board uses the whole width; its page keeps text at the usual width (PlannerView). */
.shell-wide {
  max-width: none;
}
</style>
