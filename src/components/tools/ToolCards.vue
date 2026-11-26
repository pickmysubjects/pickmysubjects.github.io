<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { TOOLS } from '@/utils/tools'

/** The tools hub: one large card per tool, its name, one line on what it answers and its scene. */
const { t } = useI18n()
const ARTS = {
  final: defineAsyncComponent(() => import('./art/ArtFinal.vue')),
  wam: defineAsyncComponent(() => import('./art/ArtWam.vue')),
  revision: defineAsyncComponent(() => import('./art/ArtRevision.vue')),
  resume: defineAsyncComponent(() => import('./art/ArtResume.vue')),
  compare: defineAsyncComponent(() => import('./art/ArtCompare.vue')),
}
</script>

<template>
  <ul class="cards">
    <li v-for="x in TOOLS" :key="x.key">
      <a class="card glass" :href="link(x.to)">
        <span class="card-text">
          <span class="card-name">{{ t(x.key) }}</span>
          <span class="card-desc">{{ t(x.text) }}</span>
          <span class="button button-accent card-go">{{ t('tools.open') }}</span>
        </span>
        <span class="card-art" aria-hidden="true"><component :is="ARTS[x.art]" /></span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.cards {
  display: grid;
  /* Five tools: one row on wide screens; two a row below that, the odd one out full width. */
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Cards in a row share their rows (text, art), so the Open buttons line up even when one
   description runs to two lines. */
.cards > li {
  display: grid;
  grid-row: span 2;
  grid-template-rows: subgrid;
  gap: 0;
}

.card {
  display: grid;
  grid-row: span 2;
  grid-template-rows: subgrid;
  gap: var(--space-4);
  height: 100%;
  padding: 28px;
  border-radius: var(--radius-lg, 24px);
  color: var(--ink);
  text-decoration: none;
  transition: box-shadow 0.15s, border-color 0.15s;
}

/* Name and description on top, the Open button at the bottom: every card's button on one line,
   however long its description. */
.card-text {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  justify-items: start;
}

.card-desc {
  align-self: start;
}

.card-name {
  font-size: var(--fs-h2);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  overflow-wrap: anywhere;
}

.card-desc {
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

/* The site's accent button, as a look only: the whole card is the link. */
.card-go {
  margin-top: 4px;
}

.card:hover {
  border-color: var(--accent);
}

.card:hover .card-name {
  color: var(--accent);
}

.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.card-art {
  display: block;
  height: 150px;
}

.card-art > :deep(*) {
  width: 100%;
  height: 100%;
}

@media (max-width: 1199px) and (min-width: 721px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cards > li:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  .card {
    padding: 20px;
    border-radius: 20px;
  }

  .card-art {
    height: 96px;
  }
}
</style>
