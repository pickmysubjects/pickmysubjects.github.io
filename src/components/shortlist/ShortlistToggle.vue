<script setup lang="ts">
import { computed } from 'vue'
import { Heart } from 'lucide-vue-next'
import { useShortlist } from '@/composables/useShortlist'
import { useI18n } from '@/i18n'

/** "♡ Shortlist": saves a subject to look at again, or takes it off. `compact`: the heart only. */
const props = defineProps<{ code: string; compact?: boolean }>()
const { t } = useI18n()
const shortlist = useShortlist()
const on = computed(() => shortlist.codes.value.includes(props.code))
const label = computed(() => t.value(on.value ? 'shortlist.removeLabel' : 'shortlist.addLabel', { code: props.code }))
</script>

<template>
  <button
    type="button"
    class="toggle"
    :class="compact ? 'toggle-compact' : 'button button-quiet'"
    :aria-pressed="on"
    :aria-label="compact ? label : undefined"
    :title="label"
    @click="shortlist.toggle(code)"
  >
    <Heart :size="compact ? 18 : 17" :fill="on ? 'currentColor' : 'none'" aria-hidden="true" />
    <span v-if="!compact">{{ on ? t('shortlist.added') : t('shortlist.add') }}</span>
  </button>
</template>

<style scoped>
.toggle[aria-pressed='true'] {
  color: var(--accent);
}

.toggle-compact {
  position: relative;
  z-index: 1;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.toggle-compact:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.toggle-compact[aria-pressed='true'] {
  color: var(--accent);
}

.toggle-compact:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .toggle-compact {
    transition: none;
  }
}
</style>
