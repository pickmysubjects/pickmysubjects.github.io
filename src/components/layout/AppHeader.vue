<script setup lang="ts">
import { link, useView } from '@/composables/useView'
import { ChevronDown } from 'lucide-vue-next'
import LangMenu from './LangMenu.vue'
import AppLogo from '../AppLogo.vue'
import GlobalSearch from './GlobalSearch.vue'
import { IS_BETA } from '@/release'
import { MENUS, areaOf, isHere, pageTitleKey, type Area } from './nav'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { View } from '@/composables/useView'
import { useI18n } from '@/i18n'

const props = defineProps<{ view: View }>()
const { param } = useView()
const { t, locale } = useI18n()
const active = computed(() => areaOf(props.view))
const title = computed(() => pageTitleKey(props.view, param.value))

/*
 * Each area is its name, a link to the area's landing page, and a ▾ disclosure button with its
 * menu. A mouse opens the menu after a short pause anywhere on the area (so passing over the bar
 * doesn't flash menus) and closes it on leaving; a click on ▾, Enter or Space opens it and keeps
 * it open until Esc, a click elsewhere, focus leaving or a page change. ↓ on either opens it.
 */
const open = shallowRef<Area | null>(null)
/** Menus that would run off the right edge open leftwards from their area instead. */
const flipped = shallowRef<Area | null>(null)
let pinned = false
let timer = 0
const HOVER_OPEN = 200
const HOVER_CLOSE = 220

function show(area: Area, byClick: boolean): void {
  clearTimeout(timer)
  open.value = area
  pinned = byClick
  flipped.value = null
  void nextTick(() => {
    const r = document.getElementById(`menu-${area}`)?.getBoundingClientRect()
    if (r && r.right > window.innerWidth - 8) flipped.value = area
  })
}
function close(): void {
  clearTimeout(timer)
  open.value = null
  pinned = false
}
function onEnter(area: Area, e: PointerEvent): void {
  if (e.pointerType !== 'mouse') return
  clearTimeout(timer)
  if (open.value === area) return
  // Moving across from another open menu switches straight away.
  timer = window.setTimeout(() => show(area, false), open.value ? 0 : HOVER_OPEN)
}
function onLeave(e: PointerEvent): void {
  if (e.pointerType !== 'mouse') return
  clearTimeout(timer)
  if (open.value && !pinned) timer = window.setTimeout(close, HOVER_CLOSE)
}
function onCaret(area: Area): void {
  // Opened by hovering a moment ago: the click keeps it open rather than shutting it.
  if (open.value === area && !pinned) pinned = true
  else if (open.value === area) close()
  else show(area, true)
}

function items(area: Area): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`#menu-${area} .menu-item`)]
}
function button(area: Area): HTMLElement | null {
  return document.getElementById(`menu-btn-${area}`)
}
async function onAreaKey(area: Area, e: KeyboardEvent): Promise<void> {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    show(area, true)
    await nextTick()
    items(area)[0]?.focus()
  } else if (e.key === 'Escape' && open.value) {
    close()
  }
}
function onMenuKey(area: Area, e: KeyboardEvent): void {
  const list = items(area)
  const i = list.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    button(area)?.focus()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const n = list.length
    list[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus()
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    list[e.key === 'Home' ? 0 : list.length - 1]?.focus()
  }
}
function onFocusOut(e: FocusEvent): void {
  const to = e.relatedTarget as Node | null
  if (to && (e.currentTarget as HTMLElement).contains(to)) return
  if (to) close()
}
function onDocPointer(e: PointerEvent): void {
  if (open.value && !(e.target as Element).closest?.('.nav-item')) close()
}
function onDocKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) {
    const area = open.value
    close()
    if (document.activeElement?.closest('.nav-item')) button(area)?.focus()
  }
}

/*
 * One row at every width and in every language: when the bar's contents don't fit, it gives up
 * room step by step (fit-1 … fit-7, each keeping the ones before): the search becomes an icon,
 * the menu icons go, the language name goes, the site name goes, everything tightens, then the
 * last two areas and finally all areas show their icon instead of their name. Measured, not
 * guessed per language, so a long translation can never push the bar onto two lines.
 */
const headerEl = useTemplateRef<HTMLElement>('headerEl')
const innerEl = useTemplateRef<HTMLElement>('innerEl')
const navEl = useTemplateRef<HTMLElement>('navEl')
const FIT_STEPS = 7
function overflows(): boolean {
  const inner = innerEl.value
  const nav = navEl.value
  if (!inner) return false
  return inner.scrollWidth > inner.clientWidth + 1 || (!!nav && nav.scrollWidth > nav.clientWidth + 1)
}
function fit(): void {
  const h = headerEl.value
  if (!h) return
  for (let i = 1; i <= FIT_STEPS; i++) h.classList.remove(`fit-${i}`)
  for (let i = 1; i <= FIT_STEPS && overflows(); i++) h.classList.add(`fit-${i}`)
}
let resize: ResizeObserver | undefined

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onDocKey)
  fit()
  resize = new ResizeObserver(() => fit())
  if (innerEl.value) resize.observe(innerEl.value)
  void document.fonts?.ready.then(fit)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKey)
  resize?.disconnect()
  clearTimeout(timer)
})
watch(() => [props.view, param.value], close)
// A new language (or a page with/without the beta chip) changes the widths.
watch([locale, () => props.view === 'home', t], () => void nextTick(fit))
</script>

<template>
  <header ref="headerEl" class="header">
    <div ref="innerEl" class="header-inner shell">
      <a class="brand" :href="link('')" :aria-current="view === 'home' ? 'page' : undefined" :title="t('nav.home')">
        <AppLogo class="mark" small />
        <span class="brand-name">PickMySubjects<span v-if="IS_BETA && view !== 'home'" class="beta-chip">Beta</span></span>
      </a>
      <nav ref="navEl" class="nav" :aria-label="t('nav.main')">
        <ul class="nav-list">
          <li
            v-for="m in MENUS"
            :key="m.area"
            class="nav-item"
            :class="[`area-${m.area}`, { active: active === m.area, open: open === m.area }]"
            @pointerenter="onEnter(m.area, $event)"
            @pointerleave="onLeave"
            @focusout="onFocusOut"
          >
            <a
              class="nav-link"
              :href="link(m.to)"
              :title="t(m.key)"
              :aria-current="active === m.area ? 'true' : undefined"
              @keydown="onAreaKey(m.area, $event)"
            >
              <component :is="m.icon" class="nav-icon" :size="16" aria-hidden="true" />
              <span class="nav-label">{{ t(m.key) }}</span>
            </a>
            <button
              :id="`menu-btn-${m.area}`"
              class="nav-caret"
              type="button"
              :aria-expanded="open === m.area"
              :aria-controls="`menu-${m.area}`"
              :aria-label="t('menu.openMenu', { name: t(m.key) })"
              @click="onCaret(m.area)"
              @keydown="onAreaKey(m.area, $event)"
            >
              <ChevronDown :size="14" aria-hidden="true" />
            </button>
            <div
              v-show="open === m.area"
              :id="`menu-${m.area}`"
              class="menu"
              :class="{ wide: m.items.length > 6, end: flipped === m.area }"
              @keydown="onMenuKey(m.area, $event)"
            >
              <ul class="menu-list">
                <li v-for="item in m.items" :key="item.to">
                  <a
                    class="menu-item"
                    :href="link(item.to)"
                    :aria-current="isHere(item, view, param) ? 'page' : undefined"
                    @click="close"
                  >
                    <span class="menu-icon"><component :is="item.icon" :size="17" aria-hidden="true" /></span>
                    <span class="menu-text">
                      <span class="menu-name">{{ t(item.key) }}</span>
                      <span class="menu-desc">{{ t(item.desc) }}</span>
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>
      <!-- Phones: the menus live in the tab bar and its sheet; the bar says where you are. -->
      <span v-if="title" class="phone-title">{{ t(title) }}</span>
      <div class="tools">
        <GlobalSearch />
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
  flex: none;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  border-radius: 999px;
}

.brand-name {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

/* Small and quiet, so the one-row header keeps its room. */
.beta-chip {
  margin-left: 6px;
  padding: 1px 6px;
  color: var(--ink-soft);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  vertical-align: 2px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
}

.mark {
  width: 30px;
  height: 30px;
}

.nav {
  min-width: 0;
}

.nav-list {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
  box-shadow: var(--glass-shadow);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 999px;
  transition: background 0.15s, box-shadow 0.15s;
}

/* The area's name (a link to its landing page) and its ▾ (the menu) share one pill. */
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 4px 0 14px;
  border-radius: 999px 0 0 999px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s;
}

.nav-caret {
  display: inline-grid;
  place-items: center;
  width: 26px;
  min-height: 36px;
  padding: 0 6px 0 2px;
  border: 0;
  border-radius: 0 999px 999px 0;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.nav-caret svg {
  opacity: 0.7;
  transition: transform 0.2s var(--ease-spring), opacity 0.15s;
}

.nav-item:hover,
.nav-item.open {
  background: var(--glass-fill-hover);
}

.nav-item:hover :is(.nav-link, .nav-caret),
.nav-item.open :is(.nav-link, .nav-caret) {
  color: var(--ink);
}

.nav-caret:hover svg,
.nav-caret[aria-expanded='true'] svg {
  opacity: 1;
}

.nav-caret[aria-expanded='true'] svg {
  transform: rotate(180deg);
}

/* A faint divider between the name and ▾ while the pointer is on the pill. */
.nav-item:hover .nav-caret,
.nav-item.open .nav-caret {
  box-shadow: inset 1px 0 0 color-mix(in srgb, currentColor 12%, transparent);
}

.nav-link:focus-visible,
.nav-caret:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.nav-item.active {
  /* The current area: a brand-pink pill, so "where am I" is obvious at a glance. */
  background: var(--accent-fill);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 38%), 0 4px 12px -4px color-mix(in srgb, var(--accent-fill) 55%, transparent);
}

.nav-item.active :is(.nav-link, .nav-caret) {
  color: var(--accent-fill-ink);
}

.nav-item.active :is(.nav-link, .nav-caret):focus-visible {
  outline-color: var(--accent-fill-ink);
}

/* The menu: a floating glass panel under its button, over the page (no layout shift). */
.menu {
  position: absolute;
  top: calc(100% + 10px);
  left: -4px;
  z-index: 40;
  width: max-content;
  min-width: 300px;
  max-width: min(340px, calc(100vw - 32px));
  padding: 8px;
  border: 1px solid var(--chrome-edge);
  border-radius: 22px;
  /* Opaque tinted glass: inside the header's own glass a backdrop blur can't reach the page
     below, so any see-through fill lets the page's text show through the menu's. */
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-fill) 6%, var(--surface)), var(--surface) 70%);
  box-shadow: var(--float-rim), 0 18px 48px -12px rgb(0 0 0 / 28%), 0 4px 12px -4px rgb(0 0 0 / 12%);
  animation: menu-in 0.18s var(--ease-spring);
}

/* The gap between button and panel still counts as "on the menu" for the mouse. */
.menu::before {
  content: '';
  position: absolute;
  inset: -12px 0 auto;
  height: 12px;
}

.menu.wide {
  max-width: min(600px, calc(100vw - 32px));
}

.menu.end {
  right: -4px;
  left: auto;
}

.menu-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wide .menu-list {
  grid-template-columns: repeat(2, minmax(240px, 1fr));
}

.menu-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  color: var(--ink);
  text-decoration: none;
  transition: background 0.12s;
}

.menu-item:hover,
.menu-item:focus-visible {
  background: var(--inset-fill);
}

.menu-item[aria-current='page'] {
  background: color-mix(in srgb, var(--accent-fill) 11%, var(--glass-fill));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}

.menu-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-fill) 12%, transparent);
  color: var(--accent);
}

.menu-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.menu-name {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
}

.menu-item[aria-current='page'] .menu-name {
  color: var(--accent);
}

.menu-desc {
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--ink-soft);
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu {
    animation: none;
  }

  .nav-caret svg {
    transition: none;
  }
}

.tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-left: auto;
}

.phone-title {
  display: none;
}

/* Giving up room step by step when the bar is too full (see fit() in the script). */
.fit-1 :deep(.search-trigger) {
  justify-content: center;
  width: 36px;
  min-width: 0;
  padding: 0;
}

.fit-1 :deep(.search-trigger) > :is(span, kbd) {
  display: none;
}

.fit-2 .nav-icon {
  display: none;
}

.fit-3 :deep(.lang-name) {
  display: none;
}

.fit-3 :deep(.lang) {
  width: 36px;
  padding: 0;
  justify-content: center;
}

.fit-4 .brand-name {
  display: none;
}

.fit-5 .header-inner {
  gap: 10px;
}

.fit-5 .nav-list {
  gap: 0;
  padding: 3px;
}

.fit-5 .nav-link {
  padding-left: 11px;
  font-size: 0.9375rem;
}

.fit-5 .nav-caret {
  width: 22px;
  padding-right: 4px;
}

/* The last steps: an area shows its icon; its name stays for screen readers and as a tooltip. */
.fit-6 :is(.area-me, .area-about) .nav-icon,
.fit-7 .nav-icon {
  display: inline;
}

.fit-6 :is(.area-me, .area-about) .nav-label,
.fit-7 .nav-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .nav {
    display: none;
  }

  .header-inner {
    gap: 10px;
    height: 56px;
  }

  .phone-title {
    display: block;
    min-width: 0;
    overflow: hidden;
    font-weight: 650;
    font-size: 1rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* With a page name beside it, the logo alone is enough. */
  .header:has(.phone-title) .brand-name {
    display: none;
  }

  .header:not(:has(.phone-title)) .brand-name {
    display: inline;
  }
}
</style>
