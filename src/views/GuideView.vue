<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, nextTick, type Component, onBeforeUnmount, onMounted, watch } from 'vue'
import CanDoList from '@/components/home/CanDoList.vue'
import GuideSubnav from '@/components/guide/GuideSubnav.vue'
import GuideOverview from '@/components/guide/GuideOverview.vue'
import GuideBasics from '@/components/guide/GuideBasics.vue'
import GuideEnrolling from '@/components/guide/GuideEnrolling.vue'
import GuideSemester from '@/components/guide/GuideSemester.vue'
import GuideInternational from '@/components/guide/GuideInternational.vue'
import GuideHelp from '@/components/guide/GuideHelp.vue'
import KeyDates from '@/components/guide/KeyDates.vue'
import GuideServices from '@/components/guide/GuideServices.vue'
import { link, replaceAddress, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { URLS } from '@/utils/guideLinks'
import { categoryOfTopic, GUIDE_CATEGORIES, guidePageOf, type GuideCategory } from '@/utils/guideSections'

/** The basics guide: an overview at /guide/, one page per section, and the key dates page. */
const { t } = useI18n()
const { param } = useView()
const page = computed(() => guidePageOf(param.value))
const current = computed(() => (page.value.kind === 'overview' ? 'overview' : page.value.category))
// Categories without their own component (systems, life) are plain service lists.
const SECTIONS: Partial<Record<GuideCategory, Component>> = { basics: GuideBasics, enrolling: GuideEnrolling, semester: GuideSemester, international: GuideInternational, help: GuideHelp }
const heading = computed(() => {
  const p = page.value
  if (p.kind === 'category') return { title: t.value(`guide.cat.${p.category}.title`), lede: t.value(`guide.cat.${p.category}.lede`) }
  if (p.kind === 'extra') return { title: t.value('guide.kd.title'), lede: t.value('guide.kd.lede') }
  return { title: t.value('guide.title'), lede: t.value('guide.ledeShort'), full: t.value('guide.lede') }
})

// The sections before and after this one, so a student can read the guide straight through.
const pager = computed(() => {
  const p = page.value
  if (p.kind !== 'category') return null
  const i = GUIDE_CATEGORIES.indexOf(p.category)
  const at = (c: GuideCategory | undefined) => (c ? { href: link(`guide/${c}/`), title: t.value(`guide.cat.${c}.nav`) } : null)
  return { prev: at(GUIDE_CATEGORIES[i - 1]), next: at(GUIDE_CATEGORIES[i + 1]) }
})

const FACTS = [
  { value: '12.5', key: 'guide.factPoints' },
  { value: '50', key: 'guide.factLoad' },
  { value: '300', key: 'guide.factDegree' },
  { value: '80+', key: 'guide.factH1' },
] as const

// A #topic link: on the overview (an old one-page link), move to the section that holds it;
// on a section page, open that topic and bring it into view.
async function followHash(): Promise<void> {
  const id = decodeURIComponent(location.hash.slice(1))
  if (!id) return
  if (page.value.kind === 'overview') {
    const c = categoryOfTopic(id)
    if (c) replaceAddress(`guide/${c}/#${id}`)
    return
  }
  await nextTick()
  const el = document.getElementById(id)
  if (el instanceof HTMLDetailsElement) el.open = true
  el?.scrollIntoView({ block: 'start' })
}
const onHash = () => void followHash()
onMounted(() => {
  void followHash()
  window.addEventListener('hashchange', onHash)
})
onBeforeUnmount(() => window.removeEventListener('hashchange', onHash))
watch(param, () => void followHash())
</script>

<template>
  <article class="guide">
    <header class="guide-head">
      <p class="guide-eyebrow">{{ t('guide.eyebrow') }}</p>
      <h1 class="page-title">{{ heading.title }}</h1>
      <p class="page-lede">{{ heading.lede }}<InfoTip v-if="'full' in heading" :text="heading.full" /></p>
      <GuideSubnav :current="current" />
    </header>

    <div class="layout">
      <div class="main content">
        <template v-if="page.kind === 'overview'">
          <GuideOverview />
          <CanDoList :title="t('guide.canTitle')" class="guide-can" />
        </template>
        <KeyDates v-else-if="page.kind === 'extra'" />
        <component :is="SECTIONS[page.category]" v-else-if="SECTIONS[page.category]" />
        <GuideServices v-else :key="page.category" :category="page.category" />

        <nav v-if="page.kind !== 'overview'" class="pager" :aria-label="t('guide.overview')">
          <a v-if="pager?.prev" class="pager-link glass" :href="pager.prev.href"><span aria-hidden="true">←</span> {{ pager.prev.title }}</a>
          <a v-else class="pager-link glass" :href="link('guide/')"><span aria-hidden="true">←</span> {{ t('guide.overview') }}</a>
          <a v-if="pager?.next" class="pager-link pager-next glass" :href="pager.next.href">{{ pager.next.title }} <span aria-hidden="true">→</span></a>
        </nav>
        <p class="source">
          {{ t('guide.sourcesTextShort') }}<InfoTip :text="t('guide.sourcesText')" />
          <a :href="URLS.STUDENT_SITE" target="_blank" rel="noopener">{{ t('guide.sourcesLink') }}</a>
        </p>
      </div>

      <!-- The numbers people look up most, kept in view while reading. -->
      <aside v-if="page.kind !== 'extra'" class="side" :class="{ 'side-first': page.kind === 'overview' }">
        <ul class="facts surface">
          <li v-for="f in FACTS" :key="f.key" class="fact">
            <span class="fact-value">{{ f.value }}</span>
            <span class="fact-label">{{ t(f.key) }}</span>
          </li>
        </ul>
      </aside>
    </div>
  </article>
</template>

<style scoped>
.content {
  display: grid;
  gap: 18px;
}

.content :deep(.item) {
  scroll-margin-top: 96px;
}

.guide {
  display: grid;
  gap: 28px;
  padding-top: var(--page-top);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 32px;
  align-items: start;
}

.main {
  display: grid;
  gap: 28px;
  min-width: 0;
}

.side {
  position: sticky;
  top: 88px;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  /* On narrow screens the numbers sit after the reading, except on the overview where they lead. */
  .side {
    position: static;
  }

  .side-first {
    order: -1;
  }
}

.guide-head {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.guide-head > :deep(nav) {
  margin-top: 10px;
}

/* Previous / next section: two glass pills, the next one pushed to the right. */
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.pager-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.pager-link:hover {
  text-decoration: underline;
}

.pager-next {
  margin-left: auto;
}

.guide-eyebrow {
  margin-bottom: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

/* Four numbers in one strip, split by hairlines. */
.facts {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fact {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 18px 20px;
}

.fact + .fact {
  border-top: 1px solid var(--divider);
}

/* Between phone and desktop: one strip of four above the guide. */
@media (max-width: 960px) {
  .facts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .fact + .fact {
    border-top: 0;
    border-left: 1px solid var(--divider);
  }
}

.fact-value {
  font-family: var(--font-code);
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: var(--accent);
}

.fact-label {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ink-soft);
}


.list {
  overflow: hidden;
}

.content :deep(.note) {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.content :deep(.steps),
.content :deep(.plain) {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 22px;
}

.content :deep(.aside),
.content :deep(.formula),
.content :deep(.who-card) {
  padding: 12px 14px;
  background: var(--inset-fill);
  border-radius: var(--radius-sm);
}

.content :deep(.aside-title) {
  margin-bottom: 6px;
  font-size: 0.9375rem;
  font-weight: 650;
}

.guide-can :deep(.can-title) {
  padding-left: 4px;
}

.content :deep(.formula) {
  font-family: var(--font-code);
  font-size: 0.9375rem;
}

.content :deep(.actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content :deep(.who) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.content :deep(.who-card) {
  font-size: 0.9375rem;
}

.content :deep(.who-card h3) {
  margin-bottom: 4px;
  font-size: 0.9375rem;
  font-weight: 650;
}

.content :deep(.yours) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.content :deep(.terms) {
  display: grid;
  gap: 10px;
  margin: 0;
}

.content :deep(.terms dt) {
  font-weight: 650;
}

.content :deep(.terms dd) {
  margin: 2px 0 0;
  color: var(--ink-soft);
}

/* Dropping a subject, in time order: free, then WD, then a fail. */
.content :deep(.timeline) {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.content :deep(.timeline li) {
  position: relative;
  padding: 0 0 14px 22px;
}

.content :deep(.timeline li::before) {
  content: '';
  position: absolute;
  top: 0.5em;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot);
}

.content :deep(.timeline li:not(:last-child)::after) {
  content: '';
  position: absolute;
  top: calc(0.5em + 12px);
  bottom: 2px;
  left: 4px;
  width: 2px;
  background: var(--line);
}

.content :deep(.tl-good) {
  --dot: var(--good);
}
.content :deep(.tl-warn) {
  --dot: var(--warn);
}
.content :deep(.tl-bad) {
  --dot: var(--bad);
}

.content :deep(.links) {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.content :deep(.links a) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.content :deep(.acc) {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.content :deep(.acc li) {
  display: grid;
  gap: 2px;
  padding-left: 12px;
  border-left: 2px solid var(--line);
}

.content :deep(.acc p) {
  margin: 0;
  overflow-wrap: anywhere;
}

.content :deep(.acc-body) {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.content :deep(.ext) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
}

.source {
  font-size: 0.875rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .guide {
    gap: 22px;
  }

  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact {
    padding: 14px 16px;
  }

  .fact:nth-child(3) {
    border-left: 0;
  }

  .fact:nth-child(n + 3) {
    border-top: 1px solid var(--divider);
  }

  .content :deep(.who) {
    grid-template-columns: 1fr;
  }
}
</style>
