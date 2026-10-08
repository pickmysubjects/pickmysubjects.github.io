<script setup lang="ts">
import { link } from '@/composables/useView'
import LangMenu from './LangMenu.vue'
import AppLogo from '../AppLogo.vue'
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
        <AppLogo class="mark" />
        <span class="brand-name">PickMySubjects</span>
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
  border-bottom: 1px solid rgb(255 255 255 / 55%);
  background: rgb(255 255 255 / 45%);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
}

@media (prefers-color-scheme: dark) {
  .header {
    border-bottom-color: rgb(255 255 255 / 8%);
    background: rgb(20 18 26 / 55%);
  }
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
  width: 30px;
  height: 30px;
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
  background: rgb(255 255 255 / 55%);
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
  width: 220px;
}

/* The header search needs room next to five links; on smaller screens the Browse page has its own search. */
@media (max-width: 1320px) {
  .header-search {
    display: none;
  }
}

/* Five links and the language menu must fit before the bottom bar takes over. */
@media (max-width: 1060px) {
  .badge,
  .nav-link svg {
    display: none;
  }
}

@media (max-width: 900px) {
  .brand-name {
    display: none;
  }
}

/* The badge comes back with the bottom bar; on the narrowest phones it gives way to the language menu. */
@media (max-width: 720px) {
  .badge {
    display: inline-flex;
  }

  .brand-name {
    display: inline;
  }
}

@media (max-width: 400px) {
  .badge {
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
