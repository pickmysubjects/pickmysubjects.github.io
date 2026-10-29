<script setup lang="ts">
import { computed, defineAsyncComponent, type Component, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

/**
 * The site's side panel shell (guide, about, subject pages, revision planner). Desktop: a sticky
 * glass panel with a small label; content taller than the window scrolls inside it (soft fades
 * show there's more), and when the content leaves room the page's small illustration sits under
 * it. Phones (≤960px): a fold at the top with the label and a one-line summary.
 * The default slot is rendered in both places; `phone` tells which one.
 * Row styles for lists inside (`.side-list`, pink pill for the current row) live here too.
 */
const props = defineProps<{ label: string; now?: string; art?: () => Promise<Component>; tag?: 'nav' | 'aside' }>()
const open = defineModel<boolean>('open', { default: false })

const artComp = computed(() => (props.art ? defineAsyncComponent(props.art) : null))
const scroller = useTemplateRef<HTMLElement>('scroller')
const content = useTemplateRef<HTMLElement>('content')
const side = useTemplateRef<HTMLElement>('side')
const fadeTop = shallowRef(false)
const fadeBottom = shallowRef(false)
const showArt = shallowRef(false)
// The illustration's height (CSS .side-art) plus the gap above it.
const ART_SPACE = 132

function edges(): void {
  const el = scroller.value
  if (!el) return
  fadeTop.value = el.scrollTop > 2
  fadeBottom.value = el.scrollTop + el.clientHeight < el.scrollHeight - 2
}

// Room for the illustration: the panel's height limit minus the label and the whole content.
function fit(): void {
  const el = scroller.value
  const box = side.value
  if (!el || !box) return
  const limit = parseFloat(getComputedStyle(box).maxHeight) || window.innerHeight
  const label = box.firstElementChild?.getBoundingClientRect().height ?? 0
  showArt.value = label + el.scrollHeight + ART_SPACE + 32 <= limit
  nextTick(edges)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(fit)
  if (scroller.value) ro.observe(scroller.value)
  if (content.value) ro.observe(content.value)
  window.addEventListener('resize', fit)
  fit()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', fit)
  ro?.disconnect()
})

defineExpose({ scroller, fit })
</script>

<template>
  <component :is="tag ?? 'aside'" class="side" :aria-label="label">
    <!-- Desktop -->
    <div ref="side" class="side-panel surface">
      <p class="side-label">{{ label }}</p>
      <div ref="scroller" class="side-scroll" :class="{ 'fade-top': fadeTop, 'fade-bottom': fadeBottom }" @scroll.passive="edges">
        <div ref="content"><slot :phone="false" /></div>
      </div>
      <div v-if="showArt && artComp" class="side-art" aria-hidden="true"><component :is="artComp" /></div>
    </div>
    <!-- Phones -->
    <details class="side-drop surface" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary class="side-summary">
        <span class="side-label">{{ label }}</span>
        <span class="side-now">{{ now }}</span>
        <ChevronDown :size="18" aria-hidden="true" class="side-chev" />
      </summary>
      <div class="side-drop-body"><slot :phone="true" /></div>
    </details>
  </component>
</template>

<style scoped>
/* As tall as its column, so the panel can stay in view while the page scrolls. */
.side {
  height: 100%;
}

.side-label {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* A glass panel the height of its content, held under the header while the page scrolls. */
.side-panel {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 112px);
  padding: 16px 10px 12px;
  border-radius: 22px;
}

/* The content scrolls inside the panel when it's taller than the window; thin scrollbar, and a
   soft fade at an edge that has more beyond it. */
.side-scroll {
  flex: 0 1 auto;
  min-height: 0;
  margin: 0 -4px;
  padding: 0 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--ink) 22%, transparent) transparent;
  --fade-top: 0px;
  --fade-bottom: 0px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--fade-top), #000 calc(100% - var(--fade-bottom)), transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 var(--fade-top), #000 calc(100% - var(--fade-bottom)), transparent);
}

.side-scroll.fade-top {
  --fade-top: 28px;
}

.side-scroll.fade-bottom {
  --fade-bottom: 28px;
}

.side-scroll::-webkit-scrollbar {
  width: 6px;
}

.side-scroll::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 22%, transparent);
}

/* The page's small illustration, under the content when there's room. */
.side-art {
  flex: none;
  height: 100px;
  margin-top: 12px;
  padding: 0 12px;
}

.side-art > :deep(*) {
  width: 100%;
  height: 100%;
}

.side-panel .side-label {
  padding: 0 12px 6px;
  border-bottom: 1px solid var(--divider);
  margin-bottom: 2px;
}

.side-drop {
  display: none;
}

@media (max-width: 960px) {
  .side-panel {
    display: none;
  }

  .side-drop {
    display: block;
    border-radius: 20px;
  }

  .side-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 8px 16px;
    list-style: none;
    cursor: pointer;
  }

  .side-summary::-webkit-details-marker {
    display: none;
  }

  .side-now {
    overflow: hidden;
    font-size: var(--fs-small);
    font-weight: var(--fw-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .side-chev {
    color: var(--ink-faint);
    transition: transform 0.2s;
  }

  .side-drop[open] .side-chev {
    transform: rotate(180deg);
  }

  .side-drop-body {
    padding: 8px 8px 10px;
    border-top: 1px solid var(--divider);
  }
}
</style>

<style>
/* Rows inside a side panel (slot content, so not scoped): a quiet row, a bar on hover, and a pink
   pill for the current one (aria-current or aria-pressed). */
.side-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-list :is(a, button) {
  position: relative;
  display: block;
  width: 100%;
  padding: 8px 12px 8px 16px;
  border: 0;
  border-radius: 12px;
  background: none;
  font: inherit;
  font-size: var(--fs-small);
  line-height: 1.4;
  text-align: start;
  color: var(--ink-soft);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

/* Touch screens: each row a full 40px tap. */
@media (pointer: coarse) {
  .side-list :is(a, button) {
    padding-block: 10px;
  }
}

.side-list .sub a {
  padding-left: 28px;
  font-size: var(--fs-meta);
}

/* The bar on the left edge of each row: hidden until hover, pink on the current one. */
.side-list :is(a, button)::before {
  content: '';
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: 6px;
  width: 3px;
  border-radius: 2px;
  background: currentColor;
  opacity: 0;
  transform: scaleY(0.4);
  transition: opacity 0.15s, transform 0.2s var(--ease-spring);
}

.side-list :is(a, button):hover {
  color: var(--ink);
  background: var(--inset-fill);
}

.side-list :is(a, button):hover::before {
  opacity: 0.35;
  transform: none;
}

.side-list :is(a, button):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.side-list :is(a[aria-current], button[aria-pressed='true']) {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 13%, var(--glass-fill));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 50%), inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.side-list :is(a[aria-current], button[aria-pressed='true'])::before {
  background: var(--accent-fill);
  opacity: 1;
  transform: none;
}
</style>
