<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import GuideHero from '@/components/guide/GuideHero.vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import { useI18n } from '@/i18n'
import { showToc } from '@/utils/guideSections'
import { ABOUT_ART, type AboutPage } from './art'

/**
 * A page of the About group, laid out like a guide page: the hero band (title and the page's
 * scene), then "On this page" beside the sections when there are two or more, and the sections
 * (GuideItem cards, each with an id) in the reading column. `toc: false` for a page that is one
 * tool rather than sections to read (feedback). `refresh` re-reads the sections after content
 * that loads late (the Handbook changes).
 */
const props = withDefaults(defineProps<{ page: AboutPage; title: string; toc?: boolean; refresh?: unknown }>(), { toc: true, refresh: undefined })
const { locale } = useI18n()
const art = computed(() => ABOUT_ART[props.page])

const body = useTemplateRef<HTMLElement>('body')
const items = shallowRef<{ id: string; title: string; sub: boolean }[]>([])
watch(
  [locale, () => props.refresh],
  async () => {
    await nextTick()
    const els = body.value ? [...body.value.querySelectorAll<HTMLElement>('[data-toc][id]')] : []
    items.value = els.map((el) => ({ id: el.id, title: el.dataset.toc ?? '', sub: false }))
  },
  { immediate: true, flush: 'post' },
)
const hasToc = computed(() => props.toc && showToc(items.value.length))
</script>

<template>
  <article class="info">
    <GuideHero :title="title" :art="art.hero" />
    <div class="info-article" :class="{ 'no-toc': !hasToc }">
      <div v-if="hasToc" class="info-toc">
        <GuideToc :items="items" :art="art.mini" />
      </div>
      <div ref="body" class="info-body">
        <slot />
      </div>
    </div>
  </article>
</template>

<style scoped>
/* The guide's measures (GuideView): frostier cards, the hero and the article sharing their edges. */
.info {
  --card-fill: var(--peek-fill);

  display: grid;
  gap: 24px;
  padding-top: 20px;
}

.info-article {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.info-article.no-toc {
  grid-template-columns: minmax(0, 1fr);
}

.info-toc {
  align-self: stretch;
}

.info-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}

@media (max-width: 960px) {
  .info-article {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}

@media (max-width: 640px) {
  .info {
    gap: 14px;
    padding-top: 12px;
  }

  .info-body {
    gap: 16px;
  }
}

/* ---------- Shared pieces inside the sections ---------- */

.info-body :deep(p) {
  margin: 0;
}

.info-body :deep(.plain) {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.info-body :deep(.plain li) {
  position: relative;
  padding-left: 22px;
}

.info-body :deep(.plain li::before) {
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

.info-body :deep(.note) {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.info-body :deep(.actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-body :deep(.ext) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

.info-body :deep(.ext:hover) {
  text-decoration: underline;
}

/* A closing line on its own frosted strip, never straight on the colour field. */
.info-body :deep(.foot) {
  width: fit-content;
  max-width: 100%;
  padding: 10px 16px;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  border: 1px solid var(--card-edge);
  border-radius: 14px;
  background: var(--card-fill);
}
</style>
