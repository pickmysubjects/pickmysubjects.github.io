<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import BottomNav from './components/layout/BottomNav.vue'
import Interp from './components/Interp.vue'
import AppLogo from './components/AppLogo.vue'
import HomeView from './views/HomeView.vue'
import SubjectView from './views/SubjectView.vue'
import PlannerView from './views/PlannerView.vue'
import RecommendView from './views/RecommendView.vue'
import RecordView from './views/RecordView.vue'
import ContributeView from './views/ContributeView.vue'
import FeedbackView from './views/FeedbackView.vue'
import PrivacyView from './views/PrivacyView.vue'
import AboutView from './views/AboutView.vue'
import GuideView from './views/GuideView.vue'
import BrowseView from './views/BrowseView.vue'
import MajorsView from './views/MajorsView.vue'
import { watchEffect } from 'vue'
import { useView, link } from './composables/useView'
import { useDataset } from './composables/useDataset'
import { useI18n } from './i18n'

const { view, param } = useView()
const { t } = useI18n()
const { data } = useDataset()

// The tab title follows the page and the language (the built page only has the first one).
const TITLES: Partial<Record<string, string>> = {
  plan: 'plan.title',
  recommend: 'suggest.title',
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
  document.title = s
    ? `${t.value('seo.subjectTitle', { code: s.code, title: s.title })} | PickMySubjects`
    : major
      ? `${t.value('majors.majorTitle', { title: major.title })} | PickMySubjects`
      : key
      ? `${t.value(key)} | PickMySubjects`
      : t.value('seo.homeTitle')
})
const plannerUrl =
  'https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner'
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
    <HomeView v-if="view === 'home'" />
    <SubjectView v-else-if="view === 'subject'" :key="param" :code="param" />
    <PlannerView v-else-if="view === 'plan'" />
    <RecommendView v-else-if="view === 'recommend'" />
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
          <template #planner>
            <a :href="plannerUrl" target="_blank" rel="noopener">{{ t('app.planner') }}</a>
          </template>
          <template #feedback>
            <a :href="link('feedback')">{{ t('app.suggest') }}</a>
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
  font-size: 0.9rem;
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
  font-size: 0.8rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .footer {
    padding-bottom: 96px;
  }
}

/* The plan board uses the whole width; its page keeps text at the usual width (PlannerView). */
.shell-wide {
  max-width: none;
}
</style>
