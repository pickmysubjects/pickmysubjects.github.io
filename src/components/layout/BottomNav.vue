<script setup lang="ts">
import { link, useView } from '@/composables/useView'
import type { View } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { MENUS, TABS, areaOf, isHere } from './nav'

const props = defineProps<{ view: View }>()
const { param } = useView()
const { t } = useI18n()
const active = computed(() => areaOf(props.view))

/*
 * The Tools tab opens a sheet with every feature, grouped like the desktop menus (tools first,
 * since that's the tab that opened it). A native modal <dialog>: focus stays inside, Esc closes.
 */
const sheet = useTemplateRef<HTMLDialogElement>('sheet')
const sheetOpen = shallowRef(false)
const groups = computed(() => [...MENUS.filter((m) => m.area === 'tools'), ...MENUS.filter((m) => m.area !== 'tools')])

function openSheet(): void {
  const d = sheet.value
  if (!d || d.open) return
  if (typeof d.showModal === 'function') d.showModal()
  else d.setAttribute('open', '')
  sheetOpen.value = true
}
function closeSheet(): void {
  sheet.value?.close()
}
// A tap on the dimmed page around the sheet closes it.
function onSheetClick(e: MouseEvent): void {
  if (e.target === sheet.value) closeSheet()
}
watch(() => [props.view, param.value], closeSheet)
// The sheet only exists on phones: a window widened past that closes it.
let wide: MediaQueryList | undefined
const onWide = () => wide?.matches && closeSheet()
onMounted(() => {
  wide = matchMedia('(min-width: 721px)')
  wide.addEventListener('change', onWide)
})
onBeforeUnmount(() => wide?.removeEventListener('change', onWide))
</script>

<template>
  <nav class="tabs" :aria-label="t('nav.main')">
    <template v-for="tab in TABS" :key="tab.key">
      <a
        v-if="tab.to !== null"
        class="tab"
        :href="link(tab.to)"
        :aria-current="(tab.area ? active === tab.area : view === 'home') ? 'page' : undefined"
      >
        <component :is="tab.icon" :size="20" aria-hidden="true" />
        <span class="tab-label">{{ t(tab.key) }}</span>
      </a>
      <button
        v-else
        class="tab"
        type="button"
        aria-haspopup="dialog"
        aria-controls="all-features"
        :aria-expanded="sheetOpen"
        :aria-current="active === tab.area ? 'true' : undefined"
        @click="openSheet"
      >
        <component :is="tab.icon" :size="20" aria-hidden="true" />
        <span class="tab-label">{{ t(tab.key) }}</span>
      </button>
    </template>
  </nav>
  <dialog id="all-features" ref="sheet" class="sheet" aria-labelledby="all-features-title" @click="onSheetClick" @close="sheetOpen = false">
    <div class="sheet-body">
      <div class="sheet-head">
        <span class="sheet-grip" aria-hidden="true" />
        <h2 id="all-features-title" class="sheet-title">{{ t('menu.all') }}</h2>
        <button class="sheet-close" type="button" :aria-label="t('menu.close')" @click="closeSheet">
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
      <div class="sheet-scroll">
        <section v-for="g in groups" :key="g.area" class="sheet-group" :aria-labelledby="`sheet-${g.area}`">
          <h3 :id="`sheet-${g.area}`" class="sheet-group-title">
            <component :is="g.icon" :size="15" aria-hidden="true" />
            {{ t(g.key) }}
          </h3>
          <ul class="sheet-list">
            <li v-for="item in g.items" :key="item.to">
              <a class="sheet-item" :href="link(item.to)" :aria-current="isHere(item, view, param) ? 'page' : undefined" @click="closeSheet">
                <span class="sheet-icon"><component :is="item.icon" :size="17" aria-hidden="true" /></span>
                <span class="sheet-text">
                  <span class="sheet-name">{{ t(item.key) }}</span>
                  <span class="sheet-desc">{{ t(item.desc) }}</span>
                </span>
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.tabs {
  display: none;
}

.sheet {
  display: none;
}

@media (max-width: 720px) {
  .tabs {
    position: fixed;
    /* A floating capsule, inset from the edges like the iOS tab bar. */
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    padding: 6px;
    border: 1px solid var(--chrome-edge);
    border-radius: 30px;
    background: var(--chrome-shine), var(--float-fill);
    box-shadow: var(--float-rim), var(--float-shadow);
    -webkit-backdrop-filter: var(--float-blur);
    backdrop-filter: var(--float-blur);
  }

  .tab {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 0;
    padding: 6px 2px;
    border: 0;
    /* Concentric with the bar: 30px outer radius minus 6px padding. */
    border-radius: 24px;
    background: none;
    font: inherit;
    color: var(--ink-soft);
    text-decoration: none;
    cursor: pointer;
  }

  .tab[aria-current='page'],
  .tab[aria-current='true'] {
    color: var(--accent-fill-ink);
    background: var(--accent-fill);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 38%), 0 4px 12px -4px color-mix(in srgb, var(--accent-fill) 55%, transparent);
  }

  .tab-label {
    max-width: 100%;
    overflow: hidden;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .sheet[open] {
    position: fixed;
    inset: auto 0 0;
    display: block;
    width: 100%;
    max-width: none;
    max-height: min(82dvh, 760px);
    margin: 0;
    padding: 0;
    border: 1px solid var(--chrome-edge);
    border-bottom: 0;
    border-radius: 28px 28px 0 0;
    background: var(--chrome-shine), var(--float-fill);
    box-shadow: var(--float-rim), var(--float-shadow);
    -webkit-backdrop-filter: var(--float-blur);
    backdrop-filter: var(--float-blur);
    color: var(--ink);
    animation: sheet-up 0.26s var(--ease-spring);
  }

  .sheet::backdrop {
    background: rgb(0 0 0 / 28%);
  }

  .sheet-body {
    display: flex;
    flex-direction: column;
    max-height: inherit;
  }

  .sheet-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 16px 8px 20px;
  }

  .sheet-grip {
    position: absolute;
    top: 7px;
    left: 50%;
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--ink-faint);
    opacity: 0.5;
    transform: translateX(-50%);
  }

  .sheet-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
  }

  .sheet-close {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--glass-edge);
    border-radius: 999px;
    background: var(--glass-fill);
    color: var(--ink-soft);
    cursor: pointer;
  }

  .sheet-scroll {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 12px calc(20px + env(safe-area-inset-bottom));
  }

  .sheet-group + .sheet-group {
    margin-top: 10px;
  }

  .sheet-group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 8px 8px 4px;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--ink-soft);
  }

  .sheet-list {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sheet-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 8px 10px;
    border-radius: 14px;
    color: var(--ink);
    text-decoration: none;
  }

  .sheet-item:active,
  .sheet-item:hover {
    background: var(--inset-fill);
  }

  .sheet-item[aria-current='page'] {
    background: color-mix(in srgb, var(--accent-fill) 11%, var(--glass-fill));
  }

  .sheet-icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent-fill) 12%, transparent);
    color: var(--accent);
  }

  .sheet-text {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .sheet-name {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .sheet-desc {
    font-size: 0.8125rem;
    color: var(--ink-soft);
  }
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet[open] {
    animation: none;
  }
}
</style>
