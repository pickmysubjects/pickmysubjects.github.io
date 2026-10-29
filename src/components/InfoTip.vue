<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import { Info } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useAnchoredOverlay } from '@/utils/anchoredOverlay'

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
const { pos } = useAnchoredOverlay({
  open,
  anchor: () => button.value,
  panel: () => panel.value,
  close: () => (open.value = false),
  closeOnMove: true,
})
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
