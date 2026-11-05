<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from 'vue'
import { NEWS } from '@/content/news'
import NewsArticle from '@/components/news/NewsArticle.vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * The latest news on the home page (#news), first paragraph only until opened, with a link to all
 * of it (/news/). The strip at the top of every page links here.
 */
const { t } = useI18n()
const latest = NEWS[0]
// Arriving from the strip on another page (/#news): the app draws the page after the browser looked
// for the anchor, so scroll here once this card is on screen.
const el = useTemplateRef<HTMLElement>('el')
onMounted(() => {
  if (location.hash === '#news') void nextTick(() => setTimeout(() => el.value?.scrollIntoView({ block: 'start' }), 50))
})
</script>

<template>
  <section v-if="latest" id="news" ref="el" class="news-home" :aria-label="t('news.title')">
    <NewsArticle :item="latest" collapsible heading-id="news-title" />
    <a v-if="NEWS.length" class="news-all" :href="link('news')">{{ t('news.all') }}</a>
  </section>
</template>

<style scoped>
.news-home {
  display: grid;
  gap: 8px;
  scroll-margin-top: 88px;
}

.news-all {
  justify-self: end;
  padding: 0 4px;
  color: var(--accent);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

.news-all:hover {
  color: var(--ink);
}
</style>
