<script setup lang="ts">
import { link } from '@/composables/useView'
import LangMenu from './LangMenu.vue'
import SubjectSearch from '../SubjectSearch.vue'
import { NAV_ITEMS } from './nav'
import type { View } from '@/composables/useView'
import { useI18n } from '@/i18n'

defineProps<{ view: View }>()
const { t } = useI18n()
</script>

<template>
  <header class="header">
    <div class="header-inner shell">
      <a class="brand" :href="link('')">
        <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 4.5 L14.6 12 L12 19.5 L9.4 12 Z" />
        </svg>
        <span class="brand-name">Subject Compass</span>
        <span class="badge">{{ t('app.unofficial') }}</span>
      </a>
      <nav class="nav" :aria-label="t('nav.main')">
        <a
          v-for="item in NAV_ITEMS"
          :key="item.view"
          class="nav-link"
          :href="link(`${item.view === 'home' ? '' : item.view}`)"
          :aria-current="view === item.view ? 'page' : undefined"
        >
          <component :is="item.icon" :size="16" aria-hidden="true" />
          {{ t(item.key) }}
        </a>
      </nav>
      <div class="tools">
        <SubjectSearch v-if="view !== 'home'" class="header-search" compact />
        <LangMenu />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(160%) blur(14px);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 64px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}

.brand-name {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

.mark {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
}

.mark path {
  fill: var(--accent);
  stroke: none;
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.nav {
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  color: var(--ink);
}

.nav-link[aria-current='page'] {
  background: var(--ink);
  color: var(--bg);
}

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.header-search {
  width: 260px;
}

@media (max-width: 960px) {
  .header-search {
    display: none;
  }
}

@media (max-width: 720px) {
  .nav {
    display: none;
  }

  .header-inner {
    height: 56px;
  }
}
</style>
