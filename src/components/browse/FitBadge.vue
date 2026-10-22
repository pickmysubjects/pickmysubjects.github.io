<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { fitBand, type Recommendation } from '@/engine'
import { useI18n } from '@/i18n'

/** How well a suggestion fits: a number and a word; tap for what the number means. */
const props = defineProps<{ rec: Recommendation }>()
const { t } = useI18n()
const open = shallowRef(false)
const id = useId()
// Relative to the student's other options (the raw score centres on 50 and read as a poor mark).
const band = computed(() => fitBand(props.rec.betterThan))
</script>

<template>
  <span class="fit" @focusout="open = false">
    <button
      type="button"
      class="fit-btn"
      :class="`fit-${band}`"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="t('suggest.fit', { score: rec.betterThan, confidence: t(`suggest.band.${band}`) })"
      @click="open = !open"
    >
      <span class="num">{{ rec.betterThan }}</span>{{ t(`suggest.band.${band}`) }}
    </button>
    <span v-if="rec.confidence === 'low'" class="thin">{{ t('suggest.thinData') }}</span>
    <span v-if="open" :id="id" class="explain" role="note">{{ t('suggest.fitHint') }}</span>
  </span>
</template>

<style scoped>
.fit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.fit-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px 1px 2px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--accent);
  background: var(--accent-soft);
  cursor: pointer;
}

.fit-btn:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.num {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  color: var(--surface);
  background: var(--accent);
  font-variant-numeric: tabular-nums;
}

.fit-ok {
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.fit-ok .num {
  background: var(--ink-soft);
}

.thin {
  font-size: 0.75rem;
  color: var(--ink-faint);
}

/* Placed against the row (the nearest positioned box), so it never runs off a phone screen. */
.explain {
  position: absolute;
  top: 40px;
  left: 18px;
  right: 18px;
  z-index: 5;
  max-width: 300px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-2, 0 6px 24px rgb(0 0 0 / 0.12));
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--ink);
}
</style>
