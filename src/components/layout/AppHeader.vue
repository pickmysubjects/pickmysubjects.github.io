<script setup lang="ts">
import { link } from '@/composables/useView'
import { BookOpen } from 'lucide-vue-next'
import LangMenu from './LangMenu.vue'
import AppLogo from '../AppLogo.vue'
import SubjectSearch from '../SubjectSearch.vue'
import { NAV_ITEMS, subNavFor } from './nav'
import type { View } from '@/composables/useView'
import { useI18n } from '@/i18n'

import { computed } from 'vue'

const props = defineProps<{ view: View }>()
const { t } = useI18n()
const sub = computed(() => subNavFor(props.view))
</script>

<template>
  <header class="header" :class="{ 'header-with-steps': sub }">
    <div class="header-inner shell">
      <a class="brand" :href="link('')">
        <AppLogo class="mark" small />
        <span class="brand-name">PickMySubjects</span>
      </a>
      <nav class="nav" :aria-label="t('nav.main')">
        <template v-for="item in NAV_ITEMS" :key="item.view">
          <a
            class="nav-link"
            :href="link(`${item.view === 'home' ? '' : item.view}`)"
            :aria-current="view === item.view || item.also?.includes(view) ? 'page' : undefined"
          >
            <component :is="item.icon" :size="16" aria-hidden="true" />
            {{ t(item.key) }}
          </a>
          <!-- Inside a section: its pages, right next to it (numbered when they're steps). -->
          <span v-if="sub && sub.parent === item.view" class="nav-steps">
            <a
              v-for="(s, i) in sub.steps"
              :key="s.view"
              class="nav-step"
              :href="link(s.view)"
              :aria-current="view === s.view ? 'step' : undefined"
            >
              <span v-if="sub.numbered" class="nav-step-n" aria-hidden="true">{{ i + 1 }}</span>
              <component :is="s.icon" v-else :size="14" aria-hidden="true" />
              {{ t(s.key) }}
            </a>
          </span>
        </template>
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
  border-bottom: 1px solid var(--chrome-edge);
  background: var(--chrome-shine), var(--chrome-fill);
  /* Specular line along the bottom edge, where content slides under. */
  box-shadow: var(--chrome-highlight), inset 0 -1px 0 rgb(255 255 255 / 45%), var(--chrome-shadow);
  -webkit-backdrop-filter: var(--chrome-blur);
  backdrop-filter: var(--chrome-blur);
}

/* A soft fade under the bar so content slides under it instead of being cut. */
.header::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  height: 14px;
  pointer-events: none;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--chrome-fill) 70%, transparent), transparent);
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

.nav {
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}

.nav-steps {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  padding-left: 6px;
  border-left: 1px solid var(--glass-edge);
}

.nav-step {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: var(--ink-soft);
  white-space: nowrap;
  text-decoration: none;
  border-radius: 999px;
}

.nav-step:hover {
  color: var(--ink);
}

.nav-step[aria-current='step'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
}

.nav-step-n {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--bg);
  background: var(--ink-soft);
  border-radius: 999px;
}

.nav-step[aria-current='step'] .nav-step-n {
  background: var(--overprint);
  color: var(--accent-ink);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
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
  /* The current section: a brand-pink pill, so "where am I" is obvious at a glance. */
  background: var(--accent-fill);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 38%), 0 4px 12px -4px color-mix(in srgb, var(--accent-fill) 55%, transparent);
  color: var(--accent-fill-ink);
  font-weight: 600;
}

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-left: auto;
}

.guide {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}


.guide:hover,
.guide[aria-current='page'] {
  color: var(--ink);
  background: var(--glass-fill-hover);
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
  /* The first thing to give way when the header is tight: the language and Basics buttons never wrap. */
  flex: 0 1 220px;
  min-width: 140px;
}

/* The header search needs room next to five links and Basics; below that, Browse has its own search. */
@media (max-width: 1440px) {
  .header-search {
    display: none;
  }
}

/* Five links and the language menu must fit before the bottom bar takes over. */
@media (max-width: 1060px) {
  .nav-link svg {
    display: none;
  }
}

@media (max-width: 900px) {
  .brand-name {
    display: none;
  }
}

/* With the bottom bar there's room for the name again. */
@media (max-width: 720px) {
  .brand-name {
    display: inline;
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

/* The three My steps sit in the bar on wide screens; below that they're a slim switch at the top
   of the page itself (App.vue), so there's only ever one bar. */
@media (max-width: 1100px) {
  .nav-steps {
    display: none;
  }
}
/* With the three My steps in the bar there's less room: the language button keeps only its
   icon a little earlier, so a long language name (Tiếng Việt) can't push it off the edge. */
@media (max-width: 1400px) {
  .header-with-steps :deep(.lang-name) {
    display: none;
  }

  .header-with-steps :deep(.lang) {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
}
</style>
