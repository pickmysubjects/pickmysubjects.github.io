<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
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
// This release's lines (home.release.*, in every language); add a key here for one more.
const LINES = ['line1', 'line2', 'line3', 'line4'] as const
const updated = computed(() => t.value('home.release.label', { v: versionLabel(), date: releaseDate(locale.value) }))

/*
 * One line, as much as fits: 0 everything, 1 without the sub-line, 2 also without the version
 * number, 3 the announcement wraps (never cut mid-word). Widths are measured with everything
 * shown, again once the fonts are in and after a language change.
 */
const fit = shallowRef(0)
const root = useTemplateRef<HTMLElement>('root')
// chrome: the pill's padding, dot and gap around the words.
let widths: { chrome: number; text: number; sub: number; num: number } | null = null
function measure(): void {
  const el = root.value
  const text = el?.querySelector<HTMLElement>('.release-text')
  if (!el || !text) return
  widths = {
    chrome: el.querySelector<HTMLElement>('.release-pill')!.offsetWidth - text.clientWidth,
    text: text.scrollWidth,
    sub: el.querySelector<HTMLElement>('.release-sub')?.offsetWidth ?? 0,
    num: el.querySelector<HTMLElement>('.release-num')?.offsetWidth ?? 0,
  }
  place()
}
function place(): void {
  const el = root.value
  if (!el || !widths) return
  const room = el.clientWidth - widths.chrome - 1
  fit.value = widths.text <= room ? 0 : widths.text - widths.sub <= room ? 1 : widths.text - widths.sub - widths.num <= room ? 2 : 3
}
async function remeasure(): Promise<void> {
  fit.value = 0
  await nextTick()
  measure()
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  void document.fonts?.ready.then(remeasure)
  if ('ResizeObserver' in window && root.value) {
    ro = new ResizeObserver(place)
    ro.observe(root.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(locale, remeasure)
</script>

<template>
  <div ref="root" class="release" :class="`fit-${fit}`" @keydown.esc="open = false">
    <button class="release-pill" type="button" :aria-expanded="open" :aria-controls="id" @click="open = !open">
      <span class="release-dot" aria-hidden="true" />
      <span v-if="IS_BETA" class="release-text">
        <span class="release-main"><span class="release-beta">Beta<span class="release-num"> v{{ APP_VERSION }}</span></span><span class="release-sep" aria-hidden="true">·</span><strong>{{ t('home.notice.title') }}</strong></span>
        <span class="release-sub"><span class="release-sep" aria-hidden="true">·</span>{{ t('home.notice.sub') }}</span>
      </span>
      <span v-else class="release-text"><span class="release-main">{{ updated }}</span></span>
    </button>
    <div v-show="open" :id="id" class="release-panel" role="region" :aria-label="t('home.release.title')">
      <p class="release-title">{{ t('home.release.title') }}</p>
      <p v-if="IS_BETA" class="release-when">{{ updated }}</p>
      <ul>
        <li v-for="key in LINES" :key="key">{{ t(`home.release.${key}`) }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Full width of its column (that's the room the pill measures); the pill itself is only as wide as its words. */
.release {
  position: relative;
  justify-self: stretch;
  z-index: 5;
  min-width: 0;
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

.release-text {
  min-width: 0;
  line-height: 1.4;
  text-align: left;
  white-space: nowrap;
}

.fit-1 .release-sub,
.fit-2 .release-sub,
.fit-3 .release-sub,
.fit-2 .release-num,
.fit-3 .release-num {
  display: none;
}

.fit-3 .release-text {
  white-space: normal;
}

.fit-3 .release-pill {
  border-radius: 16px;
}

@media (max-width: 640px) {
  .release-pill {
    font-size: var(--fs-caption);
  }
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
