<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { Info } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

/**
 * A small ⓘ after a one-line hint. Tapping it opens the full text as an overlay near the ⓘ
 * (a sheet at the bottom on phones), so opening it never moves anything on the page.
 * Tapping again, Escape, a tap outside, scrolling or resizing closes it.
 * The full text is also in a hidden copy in the page source, so prerendered pages keep it.
 * Pass the text as `text`, or as the default slot when it has links in it.
 */
defineProps<{ text?: string }>()
const { t } = useI18n()
const open = shallowRef(false)
const id = useId()
const button = useTemplateRef<HTMLButtonElement>('button')
const panel = useTemplateRef<HTMLElement>('panel')
const pos = shallowRef<Record<string, string>>({})

const GAP = 8
const EDGE = 12

function place(): void {
  const b = button.value?.getBoundingClientRect()
  const p = panel.value
  if (!b || !p) return
  if (window.innerWidth <= 640) {
    pos.value = {}
    return
  }
  const w = p.offsetWidth
  const h = p.offsetHeight
  const left = Math.min(Math.max(EDGE, b.left + b.width / 2 - w / 2), window.innerWidth - w - EDGE)
  // Below the ⓘ when it fits, otherwise above it.
  const below = b.bottom + GAP + h <= window.innerHeight - EDGE || b.top - GAP - h < EDGE
  const top = below ? b.bottom + GAP : b.top - GAP - h
  pos.value = { left: `${left}px`, top: `${top}px` }
}

function close(): void {
  open.value = false
}
function onOutside(e: Event): void {
  const target = e.target as Node
  if (button.value?.contains(target) || panel.value?.contains(target)) return
  close()
}
function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  close()
  button.value?.focus()
}

function listen(on: boolean): void {
  const fn = on ? window.addEventListener : window.removeEventListener
  fn('pointerdown', onOutside, true)
  fn('keydown', onKey)
  fn('scroll', close, true)
  fn('resize', close)
}

watch(open, async (isOpen) => {
  listen(isOpen)
  if (!isOpen) return
  pos.value = { visibility: 'hidden' }
  await nextTick()
  place()
})
onBeforeUnmount(() => listen(false))
</script>

<template>
  <span class="infotip">
    <button
      ref="button"
      class="infotip-button"
      type="button"
      :aria-expanded="open"
      :aria-describedby="id"
      :aria-label="t('infoTip')"
      :title="t('infoTip')"
      @click="open = !open"
    >
      <Info :size="14" aria-hidden="true" />
    </button>
    <span :id="id" class="infotip-source" hidden><slot>{{ text }}</slot></span>
    <Teleport v-if="open" to="body">
      <span ref="panel" class="infotip-panel" role="tooltip" :style="pos"><slot>{{ text }}</slot></span>
    </Teleport>
  </span>
</template>

<style scoped>
.infotip {
  display: inline;
}

.infotip-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 4px;
  padding: 0;
  vertical-align: -4px;
  color: var(--ink-faint);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.infotip-button:hover,
.infotip-button[aria-expanded='true'] {
  color: var(--accent-ink);
  background: var(--accent-soft);
}

.infotip-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.infotip-panel {
  position: fixed;
  z-index: 1000;
  display: block;
  max-width: min(340px, calc(100vw - 24px));
  padding: 10px 14px;
  color: var(--ink);
  font-size: var(--fs-small);
  font-weight: 400;
  line-height: var(--lh-body);
  text-align: start;
  white-space: normal;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  box-shadow: var(--glass-shadow);
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .infotip-panel {
    inset: auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;
    max-width: none;
  }
}
</style>
