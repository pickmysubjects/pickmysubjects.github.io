<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed } from 'vue'
import { periodsFor } from '@/engine'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

/** The site's signature: a real prerequisite chain drawn as a tram line, one stop per subject. */
const ROUTE = ['COMP10001', 'COMP10002', 'COMP20003', 'COMP30023']
const { data } = useDataset()
const { t } = useI18n()

const stops = computed(() =>
  ROUTE.map((code) => data.value.subjects[code])
    .filter((s) => s !== undefined)
    .map((s) => ({
      code: s.code,
      title: s.title,
      level: s.level,
      runs: periodsFor(s, 2026)
        .filter((p) => p === 'semester-1' || p === 'semester-2')
        .map((p) => (p === 'semester-1' ? 'S1' : 'S2'))
        .join(' · '),
    })),
)
</script>

<template>
  <figure v-if="stops.length > 1" class="route">
    <ol class="route-line">
      <li v-for="(s, i) in stops" :key="s.code" class="stop" :class="{ 'stop-here': i === 0 }">
        <a class="stop-link" :href="link(`subject/${s.code}`)">
          <span class="stop-dot" aria-hidden="true" />
          <span class="stop-year">{{ t('home.year', { n: s.level }) }}</span>
          <span class="stop-code code">{{ s.code }}</span>
          <span class="stop-title">{{ s.title }}</span>
          <span v-if="s.runs" class="stop-runs">{{ s.runs }}</span>
        </a>
      </li>
    </ol>
    <figcaption class="route-caption">{{ t('home.routeCaption') }}</figcaption>
  </figure>
</template>

<style scoped>
.route {
  margin: 0;
}

.route-line {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The track: one thick line through every stop. */
.route-line::before {
  content: '';
  position: absolute;
  top: 37px;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: 3px;
  background: var(--accent);
}

.stop-link {
  position: relative;
  display: grid;
  gap: 2px;
  padding-right: 16px;
  color: var(--ink);
  text-decoration: none;
}

.stop-year {
  height: 22px;
  font-family: var(--font-code);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.stop-dot {
  order: 1;
  width: 22px;
  height: 22px;
  margin: 3px 0 12px;
  border: 5px solid var(--accent);
  border-radius: 50%;
  background: var(--surface);
  transition: transform 0.2s;
}

.stop-here .stop-dot {
  border-color: var(--ink);
  background: var(--signal);
}

.stop-code {
  order: 2;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--accent);
}

.stop-title {
  order: 3;
  font-weight: 600;
  line-height: 1.25;
}

.stop-runs {
  order: 4;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.stop-year {
  order: 0;
}

.stop-link:hover .stop-dot {
  transform: scale(1.2);
}

.stop-link:hover .stop-title {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.route-caption {
  margin-top: 18px;
  font-size: 0.82rem;
  color: var(--ink-faint);
}

/* On a phone the line runs down the page. */
@media (max-width: 720px) {
  .route-line {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .route-line::before {
    top: 0;
    bottom: 0;
    left: 8px;
    right: auto;
    width: 6px;
    height: auto;
  }

  .stop-link {
    grid-template-columns: 22px 1fr;
    column-gap: 16px;
    padding-right: 0;
  }

  .stop-dot {
    grid-row: 1 / span 4;
    margin: 0;
  }

  .stop-year,
  .stop-code,
  .stop-title,
  .stop-runs {
    grid-column: 2;
    height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stop-dot {
    transition: none;
  }
}
</style>
