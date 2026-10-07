<script setup lang="ts">
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
      :href="`#/${item.view === 'home' ? '' : item.view}`"
      :aria-current="view === item.view ? 'page' : undefined"
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
    inset: auto 0 0 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: saturate(160%) blur(14px);
  }

  .tab {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 6px 0;
    border-radius: 12px;
    color: var(--ink-faint);
    text-decoration: none;
  }

  .tab[aria-current='page'] {
    color: var(--accent);
  }

  .tab-label {
    font-size: 0.72rem;
    font-weight: 600;
  }
}
</style>
