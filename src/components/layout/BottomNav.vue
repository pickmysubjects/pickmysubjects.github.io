<script setup lang="ts">
import { link } from '@/composables/useView'
import type { View } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { NAV_ITEMS } from './nav'

defineProps<{ view: View }>()
const { t } = useI18n()
</script>

<template>
  <nav class="tabs" :aria-label="t('nav.main')">
    <a
      v-for="item in NAV_ITEMS"
      :key="item.view"
      class="tab"
      :href="link(`${item.view === 'home' ? '' : item.view}`)"
      :aria-current="view === item.view || item.also?.includes(view) ? 'page' : undefined"
    >
      <component :is="item.icon" :size="20" aria-hidden="true" />
      <span class="tab-label">{{ t(item.key) }}</span>
    </a>
  </nav>
</template>

<style scoped>
.tabs {
  display: none;
}

@media (max-width: 720px) {
  .tabs {
    position: fixed;
    /* A floating capsule, inset from the edges like the iOS tab bar. */
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 6px;
    border: 1px solid var(--chrome-edge);
    border-radius: 30px;
    background: var(--chrome-shine), var(--float-fill);
    box-shadow: var(--float-rim), var(--float-shadow);
    -webkit-backdrop-filter: var(--float-blur);
    backdrop-filter: var(--float-blur);
  }

  .tab {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 6px 0;
    /* Concentric with the bar: 30px outer radius minus 6px padding. */
    border-radius: 24px;
    color: var(--ink-soft);
    text-decoration: none;
  }

  .tab[aria-current='page'] {
    color: var(--accent);
    background: var(--glass-fill-hover);
    box-shadow: var(--pill-raised);
  }

  .tab-label {
    font-size: 0.75rem;
    font-weight: 600;
  }
}
</style>
