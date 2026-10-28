<script setup lang="ts">
import { ArrowRight, Search } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { searchShortcut, useSiteSearch } from '@/composables/useSiteSearch'
import { useI18n } from '@/i18n'
import GuidePageCard from '@/components/guide/GuidePageCard.vue'
import { GUIDE_PAGE_CARDS, GUIDE_START } from '@/components/guide/guidePages'

/**
 * The way into the 墨大入门 guide: its three start pages as the overview's cards, a few topics
 * each, plus the site search (the header's own dialog) for any other topic.
 */
const { t } = useI18n()
const { ready, open } = useSiteSearch()
const start = GUIDE_PAGE_CARDS.filter((p) => GUIDE_START.includes(p.slug))
</script>

<template>
  <section class="home-guide" aria-labelledby="home-guide-title">
    <header class="head">
      <h2 id="home-guide-title" class="title">{{ t('home.guideTitle') }}</h2>
      <div class="actions">
        <button v-if="ready" type="button" class="find" aria-haspopup="dialog" @click="open">
          <Search :size="16" aria-hidden="true" />
          <span>{{ t('search.placeholder') }}</span>
          <kbd aria-hidden="true">{{ searchShortcut }}</kbd>
        </button>
        <a class="all" :href="link('guide/')">{{ t('home.guideAll') }}<ArrowRight :size="16" aria-hidden="true" /></a>
      </div>
    </header>
    <ul class="cards">
      <GuidePageCard v-for="p in start" :key="p.slug" :page="p" big :limit="3" />
    </ul>
  </section>
</template>

<style scoped>
.home-guide {
  display: grid;
  gap: var(--space-4);
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3) var(--space-5);
}

/* The heading style below the hero (StartSteps and HomeTools use the same). */
.title {
  font-size: 1.375rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-5);
}

/* Opens the header's search: a quiet glass pill that reads like a search field. */
.find {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 8px 0 16px;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  cursor: pointer;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
  transition: background-color 0.15s;
}

.find svg {
  flex: none;
  color: var(--accent);
}

.find:hover {
  background: var(--glass-shine), var(--glass-fill-hover);
}

.find:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.find kbd {
  padding: 2px 7px;
  font-family: var(--font-ui);
  font-size: var(--fs-caption);
  color: var(--ink-soft);
  background: var(--inset-fill);
  border-radius: 7px;
}

.all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  font-weight: var(--fw-semibold);
  text-decoration: none;
}

.all:hover {
  text-decoration: underline;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Three topics a page: one column, under the page's name. */
.cards :deep(.card-links) {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 960px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Touch screens have no shortcut to show. */
@media (hover: none) {
  .find kbd {
    display: none;
  }

  .find {
    padding-right: 16px;
  }
}

@media (max-width: 640px) {
  .home-guide {
    gap: var(--space-3);
  }

  .cards {
    gap: 12px;
  }

  .actions,
  .find {
    width: 100%;
  }

  .all {
    min-height: 36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .find {
    transition: none;
  }
}
</style>
