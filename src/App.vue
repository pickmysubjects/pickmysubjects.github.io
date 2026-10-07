<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import BottomNav from './components/layout/BottomNav.vue'
import Interp from './components/Interp.vue'
import HomeView from './views/HomeView.vue'
import SubjectView from './views/SubjectView.vue'
import PlannerView from './views/PlannerView.vue'
import RecommendView from './views/RecommendView.vue'
import RecordView from './views/RecordView.vue'
import ContributeView from './views/ContributeView.vue'
import FeedbackView from './views/FeedbackView.vue'
import PrivacyView from './views/PrivacyView.vue'
import { useView } from './composables/useView'
import { useI18n } from './i18n'

const { view, param } = useView()
const { t } = useI18n()
const plannerUrl =
  'https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner'
</script>

<template>
  <div class="backdrop" aria-hidden="true" />
  <AppHeader :view="view" />
  <main class="app-main shell">
    <HomeView v-if="view === 'home'" />
    <SubjectView v-else-if="view === 'subject'" :key="param" :code="param" />
    <PlannerView v-else-if="view === 'plan'" />
    <RecommendView v-else-if="view === 'recommend'" />
    <RecordView v-else-if="view === 'record'" />
    <ContributeView v-else-if="view === 'contribute'" />
    <FeedbackView v-else-if="view === 'feedback'" />
    <PrivacyView v-else />
  </main>
  <footer class="footer">
    <div class="footer-inner shell">
      <nav class="footer-links" :aria-label="t('nav.more')">
        <a href="#/contribute">{{ t('nav.contribute') }}</a>
        <a href="#/feedback">{{ t('nav.feedback') }}</a>
        <a href="#/privacy">{{ t('app.privacy') }}</a>
        <a href="https://github.com/pualgao230113-sys/subject-compass" target="_blank" rel="noopener">GitHub</a>
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
            <a href="#/feedback">{{ t('app.suggest') }}</a>
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
</style>
