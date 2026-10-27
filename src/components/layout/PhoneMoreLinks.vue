<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { MENUS } from './nav'

/**
 * Phones only, at the foot of Me: the two areas that have no tab of their own (墨大入门 and About),
 * as glass cards. Desktop has them in the header.
 */
const { t } = useI18n()
const DESC: Record<string, string> = { guide: 'menu.d.guideGroup', about: 'menu.d.aboutGroup' }
const areas = MENUS.filter((m) => m.area in DESC)
</script>

<template>
  <nav class="more" :aria-label="t('nav.more')">
    <a v-for="m in areas" :key="m.area" class="more-card surface" :href="link(m.to)">
      <span class="more-icon"><component :is="m.icon" :size="20" aria-hidden="true" /></span>
      <span class="more-text">
        <span class="more-name">{{ t(m.key) }}</span>
        <span class="more-desc">{{ t(DESC[m.area]!) }}</span>
      </span>
      <ChevronRight class="more-chev" :size="18" aria-hidden="true" />
    </a>
  </nav>
</template>

<style scoped>
.more {
  display: none;
}

@media (max-width: 720px) {
  .more {
    display: grid;
    gap: 10px;
  }

  .more-card {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    padding: 12px 14px 12px 16px;
    border-radius: 20px;
    color: var(--ink);
    text-decoration: none;
  }

  .more-card:active {
    transform: scale(var(--press-scale));
  }

  .more-icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent-fill) 12%, transparent);
    color: var(--accent);
  }

  .more-text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }

  .more-name {
    font-weight: 650;
  }

  .more-desc {
    font-size: 0.8125rem;
    color: var(--ink-soft);
  }

  .more-chev {
    flex: none;
    color: var(--ink-faint);
  }
}
</style>
