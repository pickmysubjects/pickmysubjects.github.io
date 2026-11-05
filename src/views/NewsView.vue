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
    <GuideItem v-for="(n, i) in NEWS" :id="`news-${n.date}-${i}`" :key="`${n.date}-${i}`" :title="n.title[locale]" :short="dateOf(n.date)">
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
  </InfoPage>
</template>

<style scoped>
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
