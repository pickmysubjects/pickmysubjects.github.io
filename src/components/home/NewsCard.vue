<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { NEWS } from '@/content/news'
import HelixSmile from '@/components/home/HelixSmile.vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * The latest news from the person who makes the site, on the home page (#news), laid out like a
 * short letter: who it's from and when beside it (above it on phones), the title, the first
 * paragraph, and the rest a tap away, ending with a good-luck line signed with Helix's smile and
 * a P.S. The strip at the top of every page links here.
 */
const { t, locale } = useI18n()
const item = NEWS[0]
const open = shallowRef(false)
const body = computed(() => (item ? item.body[locale.value] : []))
const shown = computed(() => (open.value ? body.value : body.value.slice(0, 1)))
const more = computed(() => !!item && (body.value.length > 1 || !!item.closing || !!item.ps))

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
  <article v-if="item" id="news" ref="el" class="news glass" aria-labelledby="news-title">
    <header class="news-meta">
      <span class="news-badge">{{ t('news.title') }}</span>
      <time class="news-date" :datetime="item.date">{{ date }}</time>
    </header>

    <div class="news-main">
      <h2 id="news-title" class="news-title">{{ item.title[locale] }}</h2>
      <div class="news-body">
        <p v-for="(p, i) in shown" :key="i" :class="{ lede: i === 0 }">{{ p }}</p>
        <template v-if="open">
          <p v-if="item.closing" class="news-closing">
            <span>{{ item.closing[locale] }}</span>
            <HelixSmile :size="30" />
          </p>
          <p v-if="item.ps" class="news-ps">
            {{ item.ps[locale] }}
            <a v-if="item.privacyLink" :href="link('privacy')">{{ t('news.privacy') }}</a>
          </p>
        </template>
      </div>
      <button v-if="more" class="news-more" type="button" :aria-expanded="open" @click="open = !open">
        {{ open ? t('news.less') : t('news.more') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
/* A letter: who and when in a narrow column, the text in a readable measure beside it. */
.news {
  display: grid;
  grid-template-columns: minmax(9rem, 13rem) minmax(0, 1fr);
  gap: var(--space-3) var(--space-6);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  scroll-margin-top: 88px;
}

.news-meta {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 8px;
}

.news-badge {
  padding: 4px 12px;
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  background: var(--accent-soft);
  border-radius: 999px;
}

.news-date {
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.news-main {
  display: grid;
  gap: var(--space-3);
  max-width: 68ch;
}

.news-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.3;
  text-wrap: balance;
}

.news-body {
  display: grid;
  gap: 12px;
  line-height: 1.7;
}

.news-body p {
  margin: 0;
}

.lede {
  color: var(--ink);
}

.news-closing {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: var(--fw-semibold);
}

/* The P.S. set apart: a hairline above, a little quieter. */
.news-ps {
  padding-top: 12px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  border-top: 1px solid var(--line);
}

.news-ps a {
  color: var(--accent);
}

.news-more {
  justify-self: start;
  min-height: 36px;
  padding: 0 16px;
  color: var(--accent);
  font: inherit;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.news-more:hover {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

@media (max-width: 760px) {
  .news {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--space-4);
  }

  .news-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .news-title {
    font-size: 1.25rem;
  }
}
</style>
