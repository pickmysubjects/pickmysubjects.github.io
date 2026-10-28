<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import type { GuidePageCardData } from './guidePages'

/**
 * One guide page as a card: its small illustration in the top right, its short name (a link to the
 * page) and direct links to the places students look for most. On the guide overview and the home
 * page; `big` is a start page's larger card, `limit` shows only the first few links.
 */
const props = defineProps<{ page: GuidePageCardData; big?: boolean; limit?: number }>()
const { t } = useI18n()
const links = computed(() => (props.limit ? props.page.links.slice(0, props.limit) : props.page.links))
</script>

<template>
  <li class="card surface" :class="{ big }">
    <span class="card-art" aria-hidden="true"><component :is="page.art" /></span>
    <a class="card-name" :href="link(page.to)">{{ t(page.name) }}<ArrowRight :size="18" aria-hidden="true" /></a>
    <ul class="card-links">
      <li v-for="l in links" :key="l.to"><a :href="link(l.to)">{{ t(l.key) }}</a></li>
    </ul>
  </li>
</template>

<style scoped>
/* A page: its illustration in the top right, the name (a link to the page), then the places
   students look for most, each a link straight to it. */
.card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 20px 22px 22px;
}

.card-art {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 92px;
  height: 69px;
  pointer-events: none;
}

.card-art > :deep(*) {
  width: 100%;
  height: 100%;
}

.card-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 44px;
  padding-right: 96px;
  font-size: 1.125rem;
  font-weight: var(--fw-bold);
  line-height: 1.3;
  color: var(--ink);
  text-decoration: none;
}

.card-name svg {
  flex: none;
  color: var(--accent);
  transition: transform 0.2s;
}

.card-name:hover {
  color: var(--accent);
}

.card-name:hover svg {
  transform: translateX(3px);
}

.card-links {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card-links a {
  display: block;
  padding: 6px 10px;
  margin-inline: -10px;
  font-size: var(--fs-small);
  font-weight: var(--fw-medium);
  line-height: 1.4;
  color: var(--ink-soft);
  text-decoration: none;
  border-radius: 10px;
}

.card-links a:hover {
  color: var(--accent);
  background: var(--inset-fill);
}

/* A start page: larger, the illustration a size up and the links in two columns. */
.card.big {
  padding: 24px 26px 24px;
}

.big .card-art {
  width: 128px;
  height: 96px;
}

.big .card-name {
  min-height: 72px;
  padding-right: 132px;
  font-size: 1.375rem;
}

.big .card-links {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

@media (max-width: 640px) {
  .card,
  .card.big {
    padding: 14px 14px 16px;
    border-radius: 18px;
  }

  .card-art,
  .big .card-art {
    top: 6px;
    right: 8px;
    width: 76px;
    height: 57px;
  }

  .card-name,
  .big .card-name {
    min-height: 48px;
    padding-right: 84px;
    font-size: 1.125rem;
  }
}
</style>
