<script setup lang="ts">
import { Languages } from 'lucide-vue-next'
import { LOCALES, useI18n, type LocaleCode } from '@/i18n'

const { t, locale, setLocale } = useI18n()

function onChange(event: Event): void {
  setLocale((event.target as HTMLSelectElement).value as LocaleCode)
}
</script>

<template>
  <label class="lang" :title="t('app.language')">
    <Languages class="lang-icon" :size="17" aria-hidden="true" />
    <span class="lang-name">{{ LOCALES.find((l) => l.code === locale)?.name }}</span>
    <span class="visually-hidden">{{ t('app.language') }}</span>
    <!-- A real <select> over the button: native, accessible, works on phones. -->
    <select class="lang-select" :value="locale" @change="onChange">
      <option v-for="l in LOCALES" :key="l.code" :value="l.code" :lang="l.code">{{ l.name }}</option>
    </select>
  </label>
</template>

<style scoped>
.lang {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink-soft);
  cursor: pointer;
}

.lang:hover {
  color: var(--ink);
}

.lang:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.lang-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

@media (max-width: 720px) {
  .lang-name {
    display: none;
  }

  .lang {
    width: 36px;
    padding: 0;
    justify-content: center;
  }
}
</style>
