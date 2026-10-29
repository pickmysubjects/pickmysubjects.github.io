<script setup lang="ts">
import { copyright, versionLabel } from '@/release'
import { latestDataYear } from '@/engine/dataYear'
import AppHeader from './components/layout/AppHeader.vue'
import ComingNotice from './components/home/ComingNotice.vue'
import BottomNav from './components/layout/BottomNav.vue'
import Interp from './components/Interp.vue'
import AppLogo from './components/AppLogo.vue'
import RolloverNotice from './components/RolloverNotice.vue'
import MissedAnchor from './components/layout/MissedAnchor.vue'
import { VIEW_LOADERS } from './views/loaders'
import { defineAsyncComponent, watchEffect } from 'vue'
import { useView, link } from './composables/useView'
import { useDataset } from './composables/useDataset'
import { useI18n } from './i18n'
import { listPageTitle, PRESET_TITLE_KEYS, subjectPageTitle } from '@/utils/seo'
import { careerTarget, presetFromSlug, rankFromSlug, subjectDifficulty } from '@/engine'
import { careerPhrase } from '@/utils/careerPathText'
import { guidePageOf } from '@/utils/guideSections'

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
const ShortlistView = lazy('shortlist')
const CareersView = lazy('careers')
const ChangesView = lazy('changes')
const ToolsView = lazy('tools')
// The compare page lives under /plan/ but has its own code.
const PlanCompareView = defineAsyncComponent(() => import('./views/PlanCompareView.vue'))

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
  majors: 'majors.title',
  shortlist: 'shortlist.title',
  careers: 'careerPath.title',
  changes: 'menu.changes',
}
watchEffect(() => {
  const s = view.value === 'subject' ? data.value.subjects[param.value.toUpperCase()] : undefined
  const key = TITLES[view.value]
  const guidePage = view.value === 'guide' ? guidePageOf(param.value) : ({ kind: 'overview' } as const)
  const career = view.value === 'careers' && param.value ? careerTarget(data.value, param.value) : undefined
  const major = view.value === 'majors' && param.value ? data.value.components.find((c) => c.id === param.value) : undefined
  // A quick pick's own page keeps the title its static page has, so search engines that run
  // the app see the same one.
  const preset = view.value === 'subjects' ? presetFromSlug(param.value) : undefined
  const ranking = view.value === 'subjects' ? rankFromSlug(param.value) : undefined
  const year = latestDataYear(data.value.subjects)
  // Breadth depends on the degree: the static page names the Bachelor of Science, but a student
  // planning another degree sees that degree's breadth list, so the title names it instead.
  const breadthElsewhere = preset === 'breadth' && course.value !== 'B-SCI' ? data.value.courses.find((c) => c.code === course.value)?.title : undefined
  document.title = s
    ? subjectPageTitle(t.value, s, locale.value, subjectDifficulty(data.value.subjects, s.code, course.value, year))
    : career
      ? `${t.value('careerPath.seoTitle', { job: careerPhrase(career.names, locale.value) })} | PickMySubjects`
    : major
      ? `${t.value(major.informal ? 'seo.informalTitle' : major.kind === 'minor' ? 'seo.minorTitle' : major.kind === 'specialisation' ? 'seo.specTitle' : 'seo.majorTitle', { title: major.title })} | PickMySubjects`
      : ranking
        ? `${t.value(ranking === 'easy' ? 'seo.rankEasy' : 'seo.rankHard', { year })} | PickMySubjects`
      : preset
        ? `${breadthElsewhere ? t.value('seo.presetBreadthFor', { course: breadthElsewhere, year }) : t.value(PRESET_TITLE_KEYS[preset], { year })} | PickMySubjects`
      : guidePage.kind !== 'overview'
        ? `${t.value(guidePage.kind === 'category' ? `guide.cat.${guidePage.category}.title` : 'guide.kd.title')} | ${t.value('guide.title')} | PickMySubjects`
      : view.value === 'plan' && param.value === 'compare'
        ? `${t.value('cmp.seoTitle')} | PickMySubjects`
      : view.value === 'tools'
        ? `${t.value(param.value === 'final' ? 'seo.calcTitle' : param.value === 'wam' ? 'tools.wamSeoTitle' : param.value === 'revision' ? 'tools.revSeoTitle' : 'tools.seoTitle')} | PickMySubjects`
      : view.value === 'changes' && param.value
        ? `${t.value('changes.seoTitle', { year: param.value })} | PickMySubjects`
      : view.value === 'subjects' || view.value === 'guide' || view.value === 'careers' || view.value === 'majors'
        ? listPageTitle(t.value, view.value)
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
  <main class="app-main shell">
    <ComingNotice v-if="view !== 'home'" slim />
    <RolloverNotice />
    <MissedAnchor />
    <HomeView v-if="view === 'home'" />
    <SubjectView v-else-if="view === 'subject'" :key="param" :code="param" />
    <PlanCompareView v-else-if="view === 'plan' && param === 'compare'" />
    <PlannerView v-else-if="view === 'plan'" />
    <RecordView v-else-if="view === 'record'" />
    <ContributeView v-else-if="view === 'contribute'" />
    <FeedbackView v-else-if="view === 'feedback'" />
    <AboutView v-else-if="view === 'about'" />
    <GuideView v-else-if="view === 'guide'" />
    <BrowseView v-else-if="view === 'subjects'" />
    <MajorsView v-else-if="view === 'majors'" :id="param" />
    <ShortlistView v-else-if="view === 'shortlist'" />
    <CareersView v-else-if="view === 'careers'" :id="param" />
    <ChangesView v-else-if="view === 'changes'" :key="param" :year="param" />
    <ToolsView v-else-if="view === 'tools'" :tool="param" />
    <PrivacyView v-else />
  </main>
  <footer class="footer">
    <div class="footer-inner shell">
      <!-- Link names are the header menu's short names; long titles belong to each page itself. -->
      <nav class="footer-links" :aria-label="t('nav.more')">
        <a :href="link('subjects')">{{ t('browse.switchSubjects') }}</a>
        <a :href="link('majors')">{{ t('browse.switchMajors') }}</a>
        <a :href="link('careers')">{{ t('browse.switchCareers') }}</a>
        <a :href="link('guide')">{{ t('guide.nav') }}</a>
        <a :href="link('tools/')">{{ t('tools.nav') }}</a>
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
        <span class="footer-meta">{{ copyright() }} · {{ versionLabel() }}</span>
      </p>
    </div>
  </footer>
  <BottomNav :view="view" />
</template>

<style scoped>
.app-main {
  min-height: 70vh;
  padding-bottom: var(--space-7);
}

.footer {
  /* A frosted band, the same glass as the top bar, so the page ends as cleanly as it starts. */
  border-top: 1px solid var(--chrome-edge);
  padding: 32px 0 44px;
  background: var(--chrome-shine), var(--chrome-fill);
  box-shadow: var(--chrome-highlight);
}

.footer-inner {
  display: grid;
  gap: 16px;
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
  /* Clear the floating bottom tab bar (and its 12px inset), including the home-indicator inset. */
  .footer {
    padding-bottom: calc(116px + env(safe-area-inset-bottom));
  }

  .footer-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }

  .footer-links a {
    display: flex;
    align-items: center;
    min-height: var(--control-h);
  }
}

.footer-meta {
  margin-left: 0.5em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
