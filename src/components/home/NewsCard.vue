<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { NEWS } from '@/content/news'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * The latest news from the person who makes the site, on the home page (#news): its date and
 * title, the first paragraph, and the rest a tap away. The strip at the top of the page links here.
 */
const { t, locale } = useI18n()
const item = NEWS[0]
const open = shallowRef(false)
const body = computed(() => (item ? item.body[locale.value] : []))
const shown = computed(() => (open.value ? body.value : body.value.slice(0, 1)))
// Arriving from the strip on another page (/#news): the app draws the page after the browser looked
// for the anchor, so scroll here once this card is on screen.
const el = useTemplateRef<HTMLElement>('el')
onMounted(() => {
  if (location.hash === '#news') void nextTick(() => setTimeout(() => el.value?.scrollIntoView({ block: 'start' }), 50))
})
const date = computed(() => {
  if (!item) return ''
  const [y, m, d] = item.date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y!, m! - 1, d!))
})
</script>

<template>
  <section v-if="item" id="news" ref="el" class="news glass" aria-labelledby="news-title">
    <p class="news-eyebrow">{{ t('news.title') }} · <time :datetime="item.date">{{ date }}</time></p>
    <h2 id="news-title" class="news-title">{{ item.title[locale] }}</h2>
    <div class="news-body">
      <p v-for="(p, i) in shown" :key="i">
        {{ p }}
        <a v-if="item.privacyLink && open && i === body.length - 1" :href="link('privacy')">{{ t('news.privacy') }}</a>
      </p>
    </div>
    <button v-if="body.length > 1" class="news-more" type="button" :aria-expanded="open" @click="open = !open">
      {{ open ? t('news.less') : t('news.more') }}
    </button>
  </section>
</template>

<style scoped>
.news {
  display: grid;
  gap: 10px;
  padding: var(--space-5);
  scroll-margin-top: 88px;
}

.news-eyebrow {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.news-title {
  margin: 0;
  font-size: var(--fs-h3);
  line-height: 1.3;
}

.news-body {
  max-width: 68ch;
  line-height: 1.65;
}

.news-body p {
  margin: 0;
}

.news-body p + p {
  margin-top: 10px;
}

.news-body a {
  color: var(--accent);
}

.news-more {
  justify-self: start;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  background: none;
  border: 0;
  cursor: pointer;
}

.news-more:hover {
  color: var(--ink);
}

@media (max-width: 640px) {
  .news {
    padding: var(--space-4);
  }
}
</style>
