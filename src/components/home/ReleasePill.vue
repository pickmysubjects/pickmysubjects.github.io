<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useI18n } from '@/i18n'
import { APP_VERSION, IS_BETA, releaseDate, versionLabel } from '@/release'

/**
 * The home page's one release line, a small glass pill at the top of the hero. During the beta
 * it carries the announcement too (home.notice.*: when the full version comes); after 1.0 it
 * says the version and when it last changed. Tapping it shows what's new in this release
 * (home.release.*). The panel floats over the page, so opening it never moves anything.
 */
const { t, locale } = useI18n()
const open = shallowRef(false)
const id = useId()
const updated = computed(() => t.value('home.release.label', { v: versionLabel(), date: releaseDate(locale.value) }))
</script>

<template>
  <div class="release" @keydown.esc="open = false">
    <button class="release-pill" type="button" :aria-expanded="open" :aria-controls="id" @click="open = !open">
      <span class="release-dot" aria-hidden="true" />
      <span v-if="IS_BETA" class="release-text">
        <span class="release-beta">Beta<span class="release-num"> v{{ APP_VERSION }}</span></span>
        <span class="release-sep" aria-hidden="true">·</span>
        <strong>{{ t('home.notice.title') }}</strong>
        <span class="release-sub"><span class="release-sep" aria-hidden="true">·</span> {{ t('home.notice.sub') }}</span>
      </span>
      <span v-else class="release-text">{{ updated }}</span>
    </button>
    <div v-show="open" :id="id" class="release-panel" role="region" :aria-label="t('home.release.title')">
      <p class="release-title">{{ t('home.release.title') }}</p>
      <p v-if="IS_BETA" class="release-when">{{ updated }}</p>
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
  max-width: 100%;
}

.release-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 30px;
  padding: 4px 12px 4px 10px;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
  background: var(--glass-shine), var(--glass-fill);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  cursor: pointer;
}

/* One line always: the version number and the sub-line step aside first, then an ellipsis. */
.release-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.release-beta {
  font-weight: var(--fw-semibold);
  color: var(--accent);
}

.release-sep {
  margin: 0 0.35em;
  color: var(--ink-faint);
}

.release-text strong {
  font-weight: var(--fw-semibold);
  color: var(--ink);
}

@media (max-width: 1100px) and (min-width: 641px), (max-width: 480px) {
  .release-sub {
    display: none;
  }
}

@media (max-width: 400px) {
  .release-num {
    display: none;
  }
}

/* A 44px tap target on touch without making the pill look bigger. */
@media (pointer: coarse) {
  .release-pill::after {
    content: '';
    position: absolute;
    inset: -7px -4px;
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
  flex: none;
  width: 7px;
  height: 7px;
  background: var(--accent-fill);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-fill) 18%, transparent);
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
  margin: 0;
  color: var(--ink);
  font-weight: 600;
}

.release-when {
  margin: 0 0 4px;
  font-size: var(--fs-meta);
}

.release-panel ul {
  margin: 4px 0 0;
  padding-left: 1.1em;
}
</style>
