<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import Interp from './components/Interp.vue'
import PlannerView from './views/PlannerView.vue'
import RecommendView from './views/RecommendView.vue'
import RecordView from './views/RecordView.vue'
import ContributeView from './views/ContributeView.vue'
import FeedbackView from './views/FeedbackView.vue'
import { useView } from './composables/useView'
import { useI18n } from './i18n'

const { view } = useView()
const { t } = useI18n()
const plannerUrl =
  'https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner'
</script>

<template>
  <AppHeader :view="view" />
  <main class="app-main">
    <PlannerView v-if="view === 'plan'" />
    <RecommendView v-else-if="view === 'recommend'" />
    <RecordView v-else-if="view === 'record'" />
    <ContributeView v-else-if="view === 'contribute'" />
    <FeedbackView v-else />
  </main>
  <footer class="app-footer">
    <p>
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
  </footer>
</template>

<style scoped>
.app-main {
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 20px 48px;
}

.app-footer {
  border-top: 1px solid var(--contour);
  padding: 16px 20px 32px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.app-footer p {
  max-width: 1440px;
  margin: 0 auto;
}
</style>
