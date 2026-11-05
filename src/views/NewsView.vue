<script setup lang="ts">
import InfoPage from '@/components/about/InfoPage.vue'
import GuideItem from '@/components/guide/GuideItem.vue'
import HelixSmile from '@/components/home/HelixSmile.vue'
import { NEWS } from '@/content/news'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * Every piece of news from the person who makes the site, newest first, laid out like the other
 * About pages (InfoPage): the hero band, "On this page" listing each one once there are two or
 * more, and one card per piece, its date under the title. Each ends with its good-luck line
 * signed with Helix's smile, and its P.S.
 */
const { t, locale } = useI18n()
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y!, m! - 1, d!))
}
</script>

<template>
  <InfoPage page="news" :title="t('news.title')">
    <ol class="timeline">
      <li v-for="(n, i) in NEWS" :key="`${n.date}-${i}`" class="entry">
        <time class="when" :datetime="n.date">{{ dateOf(n.date) }}</time>
        <GuideItem :id="`news-${n.date}-${i}`" :title="n.title[locale]">
      <div class="letter">
        <p v-for="(p, j) in n.body[locale]" :key="j">{{ p }}</p>
        <p v-if="n.closing" class="closing">
          <span>{{ n.closing[locale] }}</span>
          <HelixSmile :size="30" />
        </p>
        <p v-if="n.ps" class="ps">
          {{ n.ps[locale] }}
          <a v-if="n.privacyLink" :href="link('privacy')">{{ t('news.privacy') }}</a>
        </p>
      </div>
        </GuideItem>
      </li>
    </ol>
  </InfoPage>
</template>

<style scoped>
/* A vertical timeline: a hairline down the left, a dot and the date for each note, newest on top. */
.timeline {
  position: relative;
  display: grid;
  gap: 28px;
  padding: 0 0 0 28px;
  margin: 0;
  list-style: none;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 6px;
  width: 2px;
  content: '';
  background: var(--line);
  border-radius: 2px;
}

.entry {
  position: relative;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.entry::before {
  position: absolute;
  top: 4px;
  left: -28px;
  width: 14px;
  height: 14px;
  content: '';
  background: var(--accent);
  border: 3px solid var(--bg, #fff);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--line);
}

.when {
  color: var(--ink-soft);
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.02em;
}

@media (max-width: 640px) {
  .timeline {
    padding-left: 22px;
  }

  .timeline::before {
    left: 4px;
  }

  .entry::before {
    left: -22px;
  }
}

.letter {
  display: grid;
  gap: 12px;
  max-width: 68ch;
  line-height: 1.7;
}

.letter p {
  margin: 0;
}

.closing {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: var(--fw-semibold);
}

/* The P.S. set apart: a hairline above, a little quieter. */
.ps {
  padding-top: 12px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  border-top: 1px solid var(--line);
}

.ps a {
  color: var(--accent);
}
</style>
