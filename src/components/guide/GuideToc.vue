<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { reducedMotion } from '@/utils/motion'
import type { GuidePageSlug } from '@/utils/guideSections'
import { MINI_ART } from './art/minis'

/**
 * "On this page": the page's topics, the one being read highlighted. Desktop: a sticky list in
 * the left column. Phones: a small fold at the top of the page. A tap scrolls smoothly and
 * keeps the #anchor in the address, so the link can be shared.
 * On desktop the panel never grows past the window: a long list scrolls inside it (soft fades
 * show there's more, and the topic being read is kept in view), and when the list leaves room
 * the page's small illustration sits under it.
 */
interface TocItem {
  id: string
  title: string
  sub: boolean
}
const props = defineProps<{ items: TocItem[]; slug: GuidePageSlug }>()
const { t } = useI18n()
const active = shallowRef<string | null>(null)
const open = shallowRef(false)
const activeTitle = computed(() => props.items.find((i) => i.id === active.value)?.title ?? null)

// The topic being read: the last one whose top has passed a line a little below the header.
let frame = 0
function spy(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    let current: string | null = null
    for (const i of props.items) {
      const el = document.getElementById(i.id)
      if (el && el.getBoundingClientRect().top <= 200) current = i.id
    }
    active.value = current
  })
}

function jump(id: string, event: MouseEvent): void {
  const el = document.getElementById(id)
  if (!el) return
  event.preventDefault()
  open.value = false
  history.replaceState(history.state, '', `#${encodeURIComponent(id)}`)
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

// ---- Desktop panel: the list scrolls inside it; the illustration only where it fits. ----
const art = computed(() => defineAsyncComponent(MINI_ART[props.slug]))
const scroller = useTemplateRef<HTMLElement>('scroller')
const side = useTemplateRef<HTMLElement>('side')
const fadeTop = shallowRef(false)
const fadeBottom = shallowRef(false)
const showArt = shallowRef(false)
// The illustration's height (CSS .toc-art) plus the gap above it.
const ART_SPACE = 132

function edges(): void {
  const el = scroller.value
  if (!el) return
  fadeTop.value = el.scrollTop > 2
  fadeBottom.value = el.scrollTop + el.clientHeight < el.scrollHeight - 2
}

// Room for the illustration: the panel's height limit minus the label and the whole list.
function fit(): void {
  const el = scroller.value
  const box = side.value
  if (!el || !box) return
  const limit = parseFloat(getComputedStyle(box).maxHeight) || window.innerHeight
  const label = box.firstElementChild?.getBoundingClientRect().height ?? 0
  showArt.value = label + el.scrollHeight + ART_SPACE + 32 <= limit
  nextTick(edges)
}

// Keep the topic being read in view inside the list, without moving the page.
watch(active, (id) => {
  const el = scroller.value
  const link = id ? el?.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`) : null
  if (!el || !link || el.scrollHeight <= el.clientHeight) return
  const top = link.offsetTop - el.offsetTop
  const want = top < el.scrollTop + 24 ? top - 24 : top + link.offsetHeight > el.scrollTop + el.clientHeight - 24 ? top + link.offsetHeight - el.clientHeight + 24 : null
  if (want !== null) el.scrollTo({ top: want, behavior: reducedMotion() ? 'auto' : 'smooth' })
})

let ro: ResizeObserver | null = null
onMounted(() => {
  window.addEventListener('scroll', spy, { passive: true })
  spy()
  ro = new ResizeObserver(fit)
  if (scroller.value) ro.observe(scroller.value)
  window.addEventListener('resize', fit)
  fit()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', spy)
  window.removeEventListener('resize', fit)
  ro?.disconnect()
  cancelAnimationFrame(frame)
})
watch(() => props.items, () => {
  spy()
  nextTick(fit)
})
</script>

<template>
  <nav class="toc" :aria-label="t('subject.onPage')">
    <!-- Desktop -->
    <div ref="side" class="toc-side surface">
      <p class="toc-label">{{ t('subject.onPage') }}</p>
      <div ref="scroller" class="toc-scroll" :class="{ 'fade-top': fadeTop, 'fade-bottom': fadeBottom }" @scroll.passive="edges">
        <ol class="toc-list">
          <li v-for="i in items" :key="i.id" :class="{ sub: i.sub }">
            <a :href="`#${i.id}`" :aria-current="active === i.id ? 'location' : undefined" @click="jump(i.id, $event)">{{ i.title }}</a>
          </li>
        </ol>
      </div>
      <div v-if="showArt" class="toc-art" aria-hidden="true"><component :is="art" /></div>
    </div>
    <!-- Phones -->
    <details class="toc-drop surface" :open="open" @toggle="open = ($event.target as HTMLDetailsElement).open">
      <summary class="toc-summary">
        <span class="toc-label">{{ t('subject.onPage') }}</span>
        <span class="toc-now">{{ activeTitle ?? items[0]?.title }}</span>
        <ChevronDown :size="18" aria-hidden="true" class="toc-chev" />
      </summary>
      <ol class="toc-list">
        <li v-for="i in items" :key="i.id" :class="{ sub: i.sub }">
          <a :href="`#${i.id}`" :aria-current="active === i.id ? 'location' : undefined" @click="jump(i.id, $event)">{{ i.title }}</a>
        </li>
      </ol>
    </details>
  </nav>
</template>

<style scoped>
/* As tall as the article, so the list can stay in view while it scrolls. */
.toc {
  height: 100%;
}

.toc-label {
  font-size: var(--fs-meta);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.toc-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc-list a {
  position: relative;
  display: block;
  padding: 8px 12px 8px 16px;
  font-size: var(--fs-small);
  line-height: 1.4;
  color: var(--ink-soft);
  text-decoration: none;
  border-radius: 12px;
  transition: background 0.15s, color 0.15s;
}

.toc-list .sub a {
  padding-left: 28px;
  font-size: var(--fs-meta);
}

/* The bar on the left edge of each item: hidden until hover, pink when it's the topic being read. */
.toc-list a::before {
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

.toc-list a:hover {
  color: var(--ink);
  background: var(--inset-fill);
}

.toc-list a:hover::before {
  opacity: 0.35;
  transform: none;
}

.toc-list a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.toc-list a[aria-current] {
  font-weight: var(--fw-semibold);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent-fill) 13%, var(--glass-fill));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 50%), inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}

.toc-list a[aria-current]::before {
  background: var(--accent-fill);
  opacity: 1;
  transform: none;
}

/* A glass panel the height of its list, held under the header while the article scrolls. */
.toc-side {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 112px);
  padding: 16px 10px 12px;
  border-radius: 22px;
}

/* The list scrolls inside the panel when it's taller than the window; thin scrollbar, and a
   soft fade at an edge that has more beyond it. */
.toc-scroll {
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

.toc-scroll.fade-top {
  --fade-top: 28px;
}

.toc-scroll.fade-bottom {
  --fade-bottom: 28px;
}

.toc-scroll::-webkit-scrollbar {
  width: 6px;
}

.toc-scroll::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 22%, transparent);
}

/* The page's small illustration, under the list when there's room. */
.toc-art {
  flex: none;
  height: 100px;
  margin-top: 12px;
  padding: 0 12px;
}

.toc-art > :deep(*) {
  width: 100%;
  height: 100%;
}

.toc-side .toc-label {
  padding: 0 12px 6px;
  border-bottom: 1px solid var(--divider);
  margin-bottom: 2px;
}

.toc-drop {
  display: none;
}

@media (max-width: 960px) {
  .toc-side {
    display: none;
  }

  .toc-drop {
    display: block;
    border-radius: 20px;
  }

  .toc-summary {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 8px 16px;
    list-style: none;
    cursor: pointer;
  }

  .toc-summary::-webkit-details-marker {
    display: none;
  }

  .toc-now {
    overflow: hidden;
    font-size: var(--fs-small);
    font-weight: var(--fw-semibold);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .toc-chev {
    color: var(--ink-faint);
    transition: transform 0.2s;
  }

  .toc-drop[open] .toc-chev {
    transform: rotate(180deg);
  }

  .toc-drop .toc-list {
    padding: 0 8px 10px;
    border-top: 1px solid var(--divider);
    padding-top: 8px;
  }
}
</style>
