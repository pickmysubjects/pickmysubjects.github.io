<script setup lang="ts">
import Interp from '@/components/Interp.vue'
import { computed, nextTick, shallowRef, type Component, useTemplateRef, watch } from 'vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import GuideHero from '@/components/guide/GuideHero.vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import GuideOverview from '@/components/guide/GuideOverview.vue'
import GuideBasics from '@/components/guide/GuideBasics.vue'
import GuideEnrolling from '@/components/guide/GuideEnrolling.vue'
import GuideSemester from '@/components/guide/GuideSemester.vue'
import GuideInternational from '@/components/guide/GuideInternational.vue'
import GuideHelp from '@/components/guide/GuideHelp.vue'
import KeyDates from '@/components/guide/KeyDates.vue'
import GuideServices from '@/components/guide/GuideServices.vue'
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { URLS } from '@/utils/guideLinks'
import { guidePageOf, neighbours, showToc, slugOf, topicPath, type GuideCategory, type GuidePageSlug } from '@/utils/guideSections'

/**
 * The basics guide: an overview at /guide/, then one article per section and the key dates page.
 * Each article: a hero band, "On this page" when the page is long enough to need it (left on
 * desktop, a fold on phones), the topics in glass cards, then the previous and next section.
 */
const { t, locale } = useI18n()
const { param } = useView()
const page = computed(() => guidePageOf(param.value))
const slug = computed(() => slugOf(page.value))
// Categories without their own component (systems, life) are plain service lists.
const SECTIONS: Partial<Record<GuideCategory, Component>> = { basics: GuideBasics, enrolling: GuideEnrolling, semester: GuideSemester, international: GuideInternational, help: GuideHelp }

const title = computed(() => {
  const p = page.value
  if (p.kind === 'category') return t.value(`guide.cat.${p.category}.title`)
  if (p.kind === 'extra') return t.value('guide.kd.title')
  return t.value('guide.title')
})

const navName = (s: GuidePageSlug) => t.value(s === 'key-dates' ? 'guide.datesTitle' : `guide.cat.${s}.nav`)
const navDesc = (s: GuidePageSlug) => t.value(`menu.d.${s === 'key-dates' ? 'keyDates' : s}`)
// The sections before and after this one, so a student can read the guide straight through;
// the ends lead back to the overview.
const pager = computed(() => {
  if (!slug.value) return null
  const { prev, next } = neighbours(slug.value)
  return {
    prev: prev ? { href: link(`guide/${prev}/`), title: navName(prev) } : { href: link('guide/'), title: t.value('guide.overview') },
    next: next ? { href: link(`guide/${next}/`), title: navName(next), desc: navDesc(next) } : { href: link('guide/'), title: t.value('guide.overview'), desc: t.value('menu.d.guideHome') },
  }
})

// "On this page": every titled part of the article, read from the page once it's drawn.
const body = useTemplateRef<HTMLElement>('body')
const toc = shallowRef<{ id: string; title: string; sub: boolean }[]>([])
watch(
  [page, locale],
  async () => {
    await nextTick()
    const els = body.value ? [...body.value.querySelectorAll<HTMLElement>('[data-toc][id]')] : []
    toc.value = els.map((el) => ({ id: el.id, title: el.dataset.toc ?? '', sub: 'tocSub' in el.dataset }))
  },
  { immediate: true, flush: 'post' },
)
// Topics only: a system or another part inside a topic adds a line, not a reason for the list.
const hasToc = computed(() => showToc(toc.value.filter((i) => !i.sub).length))
</script>

<template>
  <article class="guide">
    <GuideHero :key="slug ?? 'overview'" :slug="slug" :title="title" />

    <template v-if="page.kind === 'overview'">
      <GuideOverview />
      <p class="source">
        <Interp :text="t('guide.sourcesLine')">
          <template #site><a :href="URLS.STUDENT_SITE" target="_blank" rel="noopener">{{ t('guide.sourcesLink') }}</a></template>
          <template #stop1><a :href="link(topicPath('it-help'))">Stop 1</a></template>
        </Interp>
      </p>
    </template>

    <div v-else class="article" :class="{ 'no-toc': !hasToc }">
      <div v-if="hasToc" class="article-toc">
        <GuideToc v-if="slug" :items="toc" :slug="slug" />
      </div>
      <div ref="body" class="article-body content">
        <KeyDates v-if="page.kind === 'extra'" />
        <component :is="SECTIONS[page.category]" v-else-if="SECTIONS[page.category]" />
        <GuideServices v-else :key="page.category" :category="page.category" />

        <!-- What to read next: the next section, large; the previous one, small. -->
        <nav v-if="pager" class="pager" :aria-label="t('guide.nav')">
          <a class="pager-prev" :href="pager.prev.href"><ArrowLeft :size="16" aria-hidden="true" />{{ pager.prev.title }}</a>
          <a class="pager-next surface" :href="pager.next.href">
            <span class="pager-next-text">
              <span class="pager-next-title">{{ pager.next.title }}</span>
              <span class="pager-next-desc">{{ pager.next.desc }}</span>
            </span>
            <span class="pager-next-go"><ArrowRight :size="20" aria-hidden="true" /></span>
          </a>
        </nav>
        <p class="source">
          <Interp :text="t('guide.sourcesLine')">
            <template #site><a :href="URLS.STUDENT_SITE" target="_blank" rel="noopener">{{ t('guide.sourcesLink') }}</a></template>
            <template #stop1><a :href="link(topicPath('it-help'))">Stop 1</a></template>
          </Interp>
        </p>
      </div>
    </div>
  </article>
</template>

<style scoped>
/*
 * Every paragraph, list, callout, tile grid and table in a topic runs to the card's edges, so
 * they line up; the page width (.shell) caps the line length. Cards are
 * frostier than elsewhere on the site (the sheet fill), so the colour field stays calm under text.
 */
.guide {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 24px;
  padding-top: 20px;
}

/* The article: "On this page" on the left, a reading column on the right, together as wide as
   the hero so their edges line up. */
.article {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.article.no-toc {
  grid-template-columns: minmax(0, 1fr);
}

.article-toc {
  align-self: stretch;
}

.article-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}

@media (max-width: 960px) {
  .article {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}

/* Previous / next: the next section is the obvious step (a card with its one-liner). */
.pager {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.pager-next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  color: inherit;
  text-decoration: none;
}

.pager-next-text {
  display: grid;
  gap: 2px;
}

.pager-next-title {
  font-size: 1.125rem;
  font-weight: var(--fw-bold);
}

.pager-next:hover .pager-next-title {
  color: var(--accent);
}

.pager-next-desc {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.pager-next-go {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--accent-fill-ink);
  border-radius: 50%;
  background: var(--accent-fill);
}

.pager-prev {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  order: 1;
  width: fit-content;
  min-height: 44px;
  padding: 0 16px;
  font-weight: var(--fw-semibold);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--card-fill);
}

.pager-prev:hover {
  text-decoration: underline;
}

/* The sources note sits on its own frosted strip, never straight on the colour field. */
.source {
  width: fit-content;
  max-width: 100%;
  padding: 10px 16px;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--card-fill);
}

/* ---------- Shared pieces inside the topic cards ---------- */


.content :deep(.note) {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

/* Numbered steps: a filled number on a thin rail. */
.content :deep(.steps) {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.content :deep(.steps li) {
  position: relative;
  min-height: 28px;
  padding-left: 42px;
  counter-increment: step;
}

.content :deep(.steps li::before) {
  content: counter(step);
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent-fill-ink);
  border-radius: 50%;
  background: var(--accent-fill);
}

.content :deep(.steps li:not(:last-child)::after) {
  content: '';
  position: absolute;
  top: 32px;
  bottom: -10px;
  left: 13px;
  width: 2px;
  background: var(--divider);
}

/* Bullets: a small accent dot. */
.content :deep(.plain),
.content :deep(.checks) {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.content :deep(.plain li),
.content :deep(.checks li) {
  position: relative;
  padding-left: 22px;
}

.content :deep(.plain li::before) {
  content: '';
  position: absolute;
  top: 0.7em;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-fill);
  opacity: 0.75;
}

/* A list of conditions: each one ticked. */
.content :deep(.checks li) {
  padding-left: 28px;
}

.content :deep(.checks li::before) {
  content: '';
  position: absolute;
  top: 0.35em;
  left: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--good-soft)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316703f' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")
    center / 12px no-repeat;
}

.content :deep(.box) {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--divider);
  border-radius: 14px;
}

.content :deep(.box-title) {
  font-size: 1rem;
  font-weight: var(--fw-bold);
}

.content :deep(.formula) {
  width: fit-content;
  max-width: 100%;
  padding: 12px 16px;
  font-family: var(--font-code);
  font-size: var(--fs-small);
  border-radius: 12px;
  background: var(--inset-fill);
}

.content :deep(.actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: none;
}

/* Two sides of one rule (local / international, can / can't): two cards side by side. */
.content :deep(.who) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.content :deep(.who-card) {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px 18px;
  font-size: var(--fs-small);
  line-height: 1.6;
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  background: var(--tile-fill);
}

.content :deep(.who-yes) {
  border-top: 3px solid var(--good);
}

.content :deep(.who-no) {
  border-top: 3px solid var(--bad);
}

.content :deep(.who-card h3) {
  font-size: 1rem;
  font-weight: var(--fw-bold);
}

.content :deep(.yours) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  max-width: none;
  padding: 14px 16px;
  font-weight: var(--fw-medium);
  border-radius: 14px;
  background: var(--accent-soft);
}

.content :deep(.terms) {
  display: grid;
  gap: 0;
  margin: 0;
}

.content :deep(.terms > div) {
  display: grid;
  grid-template-columns: minmax(0, 14em) minmax(0, 1fr);
  gap: 4px 20px;
  padding: 12px 0;
  border-top: 1px solid var(--divider);
}

.content :deep(.terms > div:first-child) {
  border-top: 0;
  padding-top: 0;
}

.content :deep(.terms dt) {
  font-weight: var(--fw-bold);
}

.content :deep(.terms dd) {
  margin: 0;
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
  padding: 0 0 18px 28px;
}

.content :deep(.timeline li::before) {
  content: '';
  position: absolute;
  top: 0.45em;
  left: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot) 18%, transparent);
}

.content :deep(.timeline li:not(:last-child)::after) {
  content: '';
  position: absolute;
  top: calc(0.45em + 20px);
  bottom: 4px;
  left: 6px;
  width: 2px;
  background: var(--divider);
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

.content :deep(.acc) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.content :deep(.acc li) {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 16px 18px;
  font-size: var(--fs-small);
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  background: var(--tile-fill);
}

.content :deep(.acc p) {
  margin: 0;
  overflow-wrap: anywhere;
}

.content :deep(.acc-head) {
  font-size: 1rem;
}

.content :deep(.acc-body) {
  color: var(--ink-soft);
}

.content :deep(.ext) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

@media (max-width: 640px) {
  .guide {
    gap: 14px;
    padding-top: 12px;
  }

  .article-body {
    gap: 16px;
  }

  .content :deep(.who) {
    grid-template-columns: 1fr;
  }

  .content :deep(.terms > div) {
    grid-template-columns: 1fr;
  }

  .pager-next {
    padding: 16px 18px;
    border-radius: 20px;
  }
}
</style>
