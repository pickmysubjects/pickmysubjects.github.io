<script setup lang="ts">
import { ArrowDownUp, ArrowRight, Calculator, Columns2, Gauge, Heart, Printer, Share2, Star, Scale } from 'lucide-vue-next'
import { computed } from 'vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

/**
 * Features that are easy to miss, each one tap from where it lives. `short`: one row of the
 * most-used few as small pills (home), the rest one tap away on the tools page.
 */
const props = defineProps<{ title?: string; short?: boolean }>()
const { t } = useI18n()
const ITEMS = [
  { key: 'can.finalCalc', to: 'tools/final/', icon: Calculator },
  { key: 'can.share', to: 'plan', icon: Share2 },
  { key: 'can.plans', to: 'plan', icon: Columns2 },
  { key: 'can.print', to: 'plan', icon: Printer },
  { key: 'can.wam', to: 'tools/wam/', icon: Gauge },
  { key: 'can.mine', to: 'subjects/?mine=1', icon: ArrowDownUp },
  { key: 'can.easyHard', to: 'subjects/easy/', icon: Scale },
  { key: 'can.rate', to: 'subjects', icon: Star },
  { key: 'can.shortlist', to: 'shortlist', icon: Heart },
] as const
const SHORT = new Set(['can.finalCalc', 'can.wam', 'can.easyHard', 'can.share', 'can.plans'])
const items = computed(() => (props.short ? ITEMS.filter((i) => SHORT.has(i.key)) : ITEMS))
</script>

<template>
  <section class="can" :class="{ 'can-short': short }" aria-labelledby="can-title">
    <div class="can-head">
      <h2 id="can-title" class="can-title">{{ title ?? t('can.title') }}</h2>
      <a class="can-all" :href="link('tools/')">{{ t('menu.allTools') }} <ArrowRight :size="15" aria-hidden="true" /></a>
    </div>
    <ul class="can-list">
      <li v-for="i in items" :key="i.key">
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

.can-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.can-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: var(--fw-semibold);
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

/* Short: pills that wrap, as small as a tap target allows. */
.can-short {
  gap: var(--space-3);
}

.can-short .can-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.can-short .can-item {
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: var(--fs-small);
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
