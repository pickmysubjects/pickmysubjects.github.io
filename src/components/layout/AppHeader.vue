<script setup lang="ts">
import { link } from '@/composables/useView'
import { BookOpen } from 'lucide-vue-next'
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
          :aria-current="view === item.view || item.also?.includes(view) ? 'page' : undefined"
        >
          <component :is="item.icon" :size="16" aria-hidden="true" />
          {{ t(item.key) }}
        </a>
      </nav>
      <div class="tools">
        <SubjectSearch v-if="view !== 'home'" class="header-search" compact />
        <a
          class="guide"
          :href="link('guide')"
          :aria-current="view === 'guide' ? 'page' : undefined"
          :title="t('guide.title')"
        >
          <BookOpen :size="16" aria-hidden="true" />
          <span class="guide-label">{{ t('guide.nav') }}</span>
        </a>
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
  background: rgb(255 255 255 / 62%);
  box-shadow: 0 6px 24px -18px rgb(80 40 90 / 35%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
}

@media (prefers-color-scheme: dark) {
  .header {
    border-bottom-color: rgb(255 255 255 / 8%);
    background: rgb(20 18 26 / 72%);
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
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.nav {
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  color: var(--ink);
  background: var(--glass-fill-hover);
}

.nav-link[aria-current='page'] {
  background: var(--glass-shine), color-mix(in srgb, var(--ink) 88%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 30%), 0 4px 12px -6px rgb(16 16 20 / 45%);
  color: var(--bg);
}

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.guide {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
  background: var(--glass-shine), color-mix(in srgb, var(--accent-soft) 80%, transparent);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
}

.guide:hover,
.guide[aria-current='page'] {
  border-color: var(--accent);
}

/* Where the header is tight, just the book icon (its name is in the title and the footer). */
@media (max-width: 1120px) and (min-width: 721px), (max-width: 480px) {
  .guide-label {
    display: none;
  }

  .guide {
    padding: 0 10px;
  }
}

.header-search {
  width: 220px;
}

/* The header search needs room next to five links and Basics; below that, Browse has its own search. */
@media (max-width: 1440px) {
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
