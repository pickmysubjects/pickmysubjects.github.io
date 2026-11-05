<script setup lang="ts">
import { computed } from 'vue'
import { NEWS } from '@/content/news'
import NewsArticle from '@/components/news/NewsArticle.vue'
import { useI18n } from '@/i18n'

/**
 * Every piece of news from the person who makes the site, newest first, as a timeline: the date
 * in a column on the left (it stays in view while its news scrolls by), a dot on a thin line, the
 * letter on the right. Phones stack them. With several, the titles are listed beside to jump to.
 */
const { t, locale } = useI18n()
const items = computed(() => NEWS.map((item, i) => ({ item, id: `news-${item.date}-${i}` })))
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y!, m! - 1, d!))
}
</script>

<template>
  <article class="news-page">
    <header class="news-head">
      <h1 class="page-title">{{ t('news.title') }}</h1>
      <p class="page-lede">{{ t('news.lede') }}</p>
    </header>

    <div class="news-layout" :class="{ 'with-index': items.length > 1 }">
      <ol class="timeline">
        <li v-for="x in items" :id="x.id" :key="x.id" class="entry">
          <div class="entry-date">
            <span class="entry-dot" aria-hidden="true" />
            <time :datetime="x.item.date">{{ dateOf(x.item.date) }}</time>
          </div>
          <NewsArticle :item="x.item" :heading-id="`${x.id}-title`" />
        </li>
      </ol>

      <nav v-if="items.length > 1" class="news-index glass" :aria-label="t('news.title')">
        <a v-for="x in items" :key="x.id" :href="`#${x.id}`">
          <span class="index-date">{{ dateOf(x.item.date) }}</span>
          <span class="index-title">{{ x.item.title[locale] }}</span>
        </a>
      </nav>
    </div>
  </article>
</template>

<style scoped>
.news-page {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--page-top);
}

.news-head {
  display: grid;
  gap: 8px;
  max-width: 68ch;
}

.news-layout {
  display: grid;
  gap: var(--space-5);
}

.news-layout.with-index {
  grid-template-columns: minmax(0, 1fr) 16rem;
  align-items: start;
}

.timeline {
  display: grid;
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The date column and the line: the line runs down the left of the letters, a dot at each date. */
.entry {
  position: relative;
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  gap: var(--space-4);
  scroll-margin-top: 88px;
}

.entry::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: calc(-1 * var(--space-5));
  left: 5px;
  width: 1px;
  background: linear-gradient(var(--accent), color-mix(in srgb, var(--accent) 10%, transparent));
}

.entry:last-child::before {
  bottom: 0;
}

.entry-date {
  position: sticky;
  top: 96px;
  align-self: start;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 6px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
}

.entry-dot {
  position: relative;
  flex: none;
  width: 11px;
  height: 11px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

/* The letter's own "from and when" is redundant here: the page says who, the timeline says when. */
.entry :deep(.news) {
  grid-template-columns: minmax(0, 1fr);
}

.entry :deep(.news-meta) {
  display: none;
}

.news-index {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: var(--radius);
}

.news-index a {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  color: var(--ink);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.news-index a:hover {
  background: var(--glass-fill-hover);
}

.index-date {
  color: var(--ink-soft);
  font-size: var(--fs-meta);
}

.index-title {
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  line-height: 1.35;
}

@media (max-width: 960px) {
  .news-layout.with-index {
    grid-template-columns: minmax(0, 1fr);
  }

  .news-index {
    display: none;
  }
}

@media (max-width: 760px) {
  .entry {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding-left: 24px;
  }

  .entry::before {
    left: 5px;
  }

  .entry-date {
    position: static;
    margin-left: -24px;
    padding-top: 0;
  }
}
</style>
