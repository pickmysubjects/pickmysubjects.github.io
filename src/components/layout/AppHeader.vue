<script setup lang="ts">
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
      <a class="brand" href="#/">
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
          :href="`#/${item.view === 'home' ? '' : item.view}`"
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
  gap: 28px;
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
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.12rem;
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
  align-self: stretch;
  gap: 4px;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s;
}

.nav-link:hover {
  color: var(--ink);
}

/* The current page sits on the line, like a stop on the route. */
.nav-link::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: transparent;
  transition: background 0.15s;
}

.nav-link[aria-current='page'] {
  color: var(--ink);
  font-weight: 600;
}

.nav-link[aria-current='page']::after {
  background: var(--accent);
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
