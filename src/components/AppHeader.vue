<script setup lang="ts">
import { computed } from 'vue'
import Interp from './Interp.vue'
import { useDataset, type DatasetName } from '@/composables/useDataset'
import type { View } from '@/composables/useView'
import { LOCALES, useI18n, type LocaleCode } from '@/i18n'

defineProps<{ view: View }>()

const { name, data, setDataset } = useDataset()
const { t, locale, setLocale } = useI18n()

const views: View[] = ['plan', 'recommend', 'record', 'contribute', 'feedback']
const subjectCount = computed(() => Object.keys(data.value.subjects).length)

function onDataset(event: Event): void {
  setDataset((event.target as HTMLSelectElement).value as DatasetName)
}

function onLocale(event: Event): void {
  setLocale((event.target as HTMLSelectElement).value as LocaleCode)
}
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <a class="wordmark" href="#/plan">
        <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5 L14.5 12 L12 19 L9.5 12 Z" />
        </svg>
        Subject Compass
      </a>
      <nav class="nav" :aria-label="t('nav.main')">
        <a
          v-for="v in views"
          :key="v"
          class="nav-link"
          :href="`#/${v}`"
          :aria-current="view === v ? 'page' : undefined"
          >{{ t(`nav.${v}`) }}</a
        >
      </nav>
      <div class="pickers">
        <label class="picker">
          <span class="visually-hidden">{{ t('app.language') }}</span>
          <svg class="picker-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
          </svg>
          <select class="select picker-select" :value="locale" @change="onLocale">
            <option v-for="l in LOCALES" :key="l.code" :value="l.code" :lang="l.code">{{ l.name }}</option>
          </select>
        </label>
        <label class="picker">
          <span class="visually-hidden">{{ t('data.label') }}</span>
          <select class="select picker-select" :value="name" @change="onDataset">
            <option value="demo">{{ t('data.demo') }}</option>
            <option value="real">{{ t('data.real') }}</option>
          </select>
        </label>
      </div>
    </div>
    <p v-if="name === 'demo'" class="demo-note">{{ t('data.demoNote') }}</p>
    <p v-else class="demo-note">
      <Interp :text="t('data.realNote', { n: subjectCount })">
        <template #link>
          <a href="#/contribute">{{ t('data.realLink') }}</a>
        </template>
      </Interp>
    </p>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 1px solid var(--contour);
  background: var(--paper-raised);
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 28px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px 20px;
}

.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
}

.mark {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--overprint);
  stroke-width: 2;
}

.mark path {
  fill: var(--overprint);
  stroke: none;
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-link {
  padding: 6px 10px;
  white-space: nowrap;
  border-radius: var(--radius);
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
}

.nav-link:hover {
  color: var(--ink);
}

.nav-link[aria-current='page'] {
  color: var(--ink);
  box-shadow: inset 0 -2px 0 var(--overprint);
  border-radius: 0;
}

.pickers {
  display: flex;
  gap: 8px;
}

.picker {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.picker-icon {
  position: absolute;
  left: 10px;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--ink-soft);
  stroke-width: 1.6;
  pointer-events: none;
}

.picker-icon + .picker-select {
  padding-left: 30px;
}

.picker-select {
  width: auto;
  font-size: 0.85rem;
}

.demo-note {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px 12px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .nav {
    order: 3;
    flex-basis: 100%;
    margin: 0 -10px;
  }
}
</style>
