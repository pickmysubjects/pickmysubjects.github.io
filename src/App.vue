<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import PlannerView from './views/PlannerView.vue'
import RecommendView from './views/RecommendView.vue'
import RecordView from './views/RecordView.vue'
import ContributeView from './views/ContributeView.vue'
import FeedbackView from './views/FeedbackView.vue'
import { useView } from './composables/useView'

const { view } = useView()
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
      Subject Compass is an unofficial, student-built tool. It is not affiliated with or endorsed by the University of
      Melbourne. Always confirm with the
      <a href="https://handbook.unimelb.edu.au/" target="_blank" rel="noopener">Handbook</a> and
      <a
        href="https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner"
        target="_blank"
        rel="noopener"
        >My Course Planner</a
      >
      before you enrol. Your record and plans stay in this browser. <a href="#/feedback">Suggest an improvement</a>.
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
