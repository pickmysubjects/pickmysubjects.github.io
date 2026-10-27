<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useI18n } from '@/i18n'
import { APP_VERSION, releaseDate } from '@/release'

/**
 * A small glass pill in the hero: the site version and when it last changed. Tapping it shows
 * what's new in this release (home.release.*, the only strings a release needs to edit).
 * The panel floats over the page, so opening it never moves anything.
 */
const { t, locale } = useI18n()
const open = shallowRef(false)
const id = useId()
const label = computed(() => t.value('home.release.label', { v: APP_VERSION, date: releaseDate(locale.value) }))
</script>

<template>
  <div class="release" @keydown.esc="open = false">
    <button class="release-pill" type="button" :aria-expanded="open" :aria-controls="id" @click="open = !open">
      <span class="release-dot" aria-hidden="true" />{{ label }}
    </button>
    <div v-show="open" :id="id" class="release-panel" role="region" :aria-label="t('home.release.title')">
      <p class="release-title">{{ t('home.release.title') }}</p>
      <ul>
        <li>{{ t('home.release.line1') }}</li>
        <li>{{ t('home.release.line2') }}</li>
        <li>{{ t('home.release.line3') }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.release {
  position: relative;
  justify-self: start;
  z-index: 5;
}

.release-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 4px 12px;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  cursor: pointer;
}

/* A 44px tap target on touch without making the pill look bigger. */
@media (pointer: coarse) {
  .release-pill::after {
    content: '';
    position: absolute;
    inset: -6px -4px;
  }
}

.release-pill:hover,
.release-pill[aria-expanded='true'] {
  color: var(--ink);
  background: var(--glass-shine), var(--glass-fill-hover);
}

.release-pill:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.release-dot {
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
}

.release-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: max-content;
  max-width: min(340px, calc(100vw - 32px));
  padding: 12px 16px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: var(--lh-body);
  background: var(--glass-shine), var(--chrome-fill);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-sm);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong);
}

.release-title {
  margin: 0 0 4px;
  color: var(--ink);
  font-weight: 600;
}

.release-panel ul {
  margin: 0;
  padding-left: 1.1em;
}
</style>
