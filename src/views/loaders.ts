import type { Component } from 'vue'
import type { View } from '@/composables/useView'

/**
 * Each page's code, loaded when it's first shown, so the first visit downloads and parses only
 * the page it opens (the planner and the contribute tools are most of the app's code).
 */
export const VIEW_LOADERS: Record<View, () => Promise<Component>> = {
  home: () => import('./HomeView.vue').then((m) => m.default),
  subject: () => import('./SubjectView.vue').then((m) => m.default),
  plan: () => import('./PlannerView.vue').then((m) => m.default),
  // Suggestions moved into Find subjects ("sort for me"); the old address opens it.
  recommend: () => import('./BrowseView.vue').then((m) => m.default),
  record: () => import('./RecordView.vue').then((m) => m.default),
  contribute: () => import('./ContributeView.vue').then((m) => m.default),
  feedback: () => import('./FeedbackView.vue').then((m) => m.default),
  privacy: () => import('./PrivacyView.vue').then((m) => m.default),
  about: () => import('./AboutView.vue').then((m) => m.default),
  guide: () => import('./GuideView.vue').then((m) => m.default),
  subjects: () => import('./BrowseView.vue').then((m) => m.default),
  majors: () => import('./MajorsView.vue').then((m) => m.default),
  shortlist: () => import('./ShortlistView.vue').then((m) => m.default),
  careers: () => import('./CareersView.vue').then((m) => m.default),
  changes: () => import('./ChangesView.vue').then((m) => m.default),
  tools: () => import('./ToolsView.vue').then((m) => m.default),
}
