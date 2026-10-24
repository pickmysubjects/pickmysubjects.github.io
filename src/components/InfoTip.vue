<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { Info } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

/**
 * A small ⓘ after a one-line hint. Tapping it shows the full text underneath; tapping again
 * (or Escape) hides it. The full text is always in the page source, so prerendered pages keep it.
 * Pass the text as `text`, or as the default slot when it has links in it.
 */
defineProps<{ text?: string }>()
const { t } = useI18n()
const open = shallowRef(false)
const id = useId()
</script>

<template>
  <span class="infotip" @keydown.esc="open = false">
    <button
      class="infotip-button"
      type="button"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="t('infoTip')"
      :title="t('infoTip')"
      @click="open = !open"
    >
      <Info :size="14" aria-hidden="true" />
    </button>
    <span v-show="open" :id="id" class="infotip-panel"><slot>{{ text }}</slot></span>
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
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: var(--lh-body);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
}
</style>
