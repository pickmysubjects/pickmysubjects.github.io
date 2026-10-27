<script setup lang="ts">
import { Briefcase, Calculator, CalendarDays, Columns2, FileX, Flame, Gauge, Layers, Route, Scale, Shapes, Snowflake, Sprout } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { TOOLS, TOOL_GROUPS } from '@/utils/tools'

/** The tools as glass cards, grouped; `compact` (home): one grid, no group titles or descriptions. */
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
const ICONS = { calculator: Calculator, gauge: Gauge, scale: Scale, flame: Flame, 'file-x': FileX, snowflake: Snowflake, shapes: Shapes, layers: Layers, sprout: Sprout, columns: Columns2, route: Route, briefcase: Briefcase, calendar: CalendarDays } as const
const icon = (name: string) => ICONS[name as keyof typeof ICONS]
</script>

<template>
  <ul v-if="compact" class="cards">
    <li v-for="x in TOOLS" :key="x.key">
      <a class="card glass" :class="{ 'card-main': x.group === 'calc' }" :href="link(x.to)">
        <component :is="icon(x.icon)" :size="16" aria-hidden="true" class="card-icon" />
        <span>{{ t(x.key) }}</span>
      </a>
    </li>
  </ul>
  <template v-else>
    <section v-for="g in TOOL_GROUPS" :key="g.group" class="group" :aria-labelledby="`tg-${g.group}`">
      <h2 :id="`tg-${g.group}`" class="sec-title">{{ t(g.key) }}</h2>
      <ul class="cards" :class="{ big: g.group === 'calc' }">
        <li v-for="x in TOOLS.filter((x) => x.group === g.group)" :key="x.key">
          <a class="card glass" :href="link(x.to)">
            <component :is="icon(x.icon)" :size="g.group === 'calc' ? 22 : 16" aria-hidden="true" class="card-icon" />
            <span class="card-text">
              <span class="card-name">{{ t(x.key) }}</span>
              <span v-if="x.text" class="card-desc">{{ t(x.text) }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.group {
  display: grid;
  gap: var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cards.big {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 14px 16px;
  border-radius: var(--radius);
  color: var(--ink);
  text-decoration: none;
  font-weight: var(--fw-medium);
}

.big .card {
  align-items: flex-start;
  padding: 20px;
}

.card:hover {
  color: var(--accent);
}

.card-icon {
  flex: none;
  color: var(--accent);
}

.card-main {
  font-weight: var(--fw-semibold);
}

.card-text {
  display: grid;
  gap: 4px;
}

.card-name {
  font-weight: var(--fw-semibold);
}

.card-desc {
  font-size: var(--fs-small);
  font-weight: var(--fw-regular);
  color: var(--ink-soft);
}
</style>
