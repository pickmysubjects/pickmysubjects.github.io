<script setup lang="ts">
import { ArrowDownUp, Columns2, Gauge, Heart, Printer, Share2, Snowflake, Star, Scale } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/** Features that are easy to miss, each one tap from where it lives. */
defineProps<{ title?: string }>()
const { t } = useI18n()
const ITEMS = [
  { key: 'can.share', to: 'plan', icon: Share2 },
  { key: 'can.plans', to: 'plan', icon: Columns2 },
  { key: 'can.print', to: 'plan', icon: Printer },
  { key: 'can.wam', to: 'record', icon: Gauge },
  { key: 'can.mine', to: 'subjects/?mine=1', icon: ArrowDownUp },
  { key: 'can.easyHard', to: 'subjects/easy/', icon: Scale },
  { key: 'can.summerWinter', to: 'subjects/summer-winter/', icon: Snowflake },
  { key: 'can.rate', to: 'subjects', icon: Star },
  { key: 'can.shortlist', to: 'shortlist', icon: Heart },
] as const
</script>

<template>
  <section class="can" aria-labelledby="can-title">
    <h2 id="can-title" class="can-title">{{ title ?? t('can.title') }}</h2>
    <ul class="can-list">
      <li v-for="i in ITEMS" :key="i.key">
        <a class="can-item glass" :href="link(i.to)">
          <component :is="i.icon" :size="16" aria-hidden="true" class="can-icon" />
          <span>{{ t(i.key) }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.can {
  display: grid;
  gap: var(--space-4);
}

/* Same as the home page's section titles. */
.can-title {
  font-size: 1.375rem;
  font-weight: 700;
}

.can-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.can-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 12px 14px;
  font-size: 0.9375rem;
  font-weight: 550;
  line-height: 1.35;
  color: var(--ink);
  text-decoration: none;
  text-wrap: pretty;
  /* Background, border and shadow: the shared .glass tile. */
  border-radius: var(--radius);
  transition: border-color 0.15s;
}

.can-item:hover {
  border-color: var(--accent);
}

/* Three by three on wide screens, two columns on tablets and phones. */
@media (max-width: 900px) {
  .can-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .can-item {
    transition: none;
  }
}

.can-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.can-icon {
  flex: none;
  color: var(--accent);
}
</style>
