<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { fitBand, type Recommendation } from '@/engine'
import { useI18n } from '@/i18n'

/**
 * How well a suggestion fits, from the "sort for me" engine: "Match 86%" with a small meter, in
 * the same spot on every card; tap for what the number means. The number is how many of the
 * student's other options this one beats (the raw score centres on 50 and read as a poor mark).
 */
const props = defineProps<{ rec: Recommendation }>()
const { t } = useI18n()
const open = shallowRef(false)
const id = useId()
const band = () => fitBand(props.rec.betterThan)
</script>

<template>
  <span class="fit" @focusout="open = false">
    <button
      type="button"
      class="fit-btn"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="t('suggest.fit', { score: rec.betterThan, confidence: t(`suggest.band.${band()}`) })"
      @click="open = !open"
    >
      <span class="meter" aria-hidden="true"><span class="meter-fill" :style="{ width: `${rec.betterThan}%` }" /></span>
      <span class="label">{{ t('suggest.matchPct', { n: rec.betterThan }) }}</span>
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

/* A pink pill: the meter, then "Match 86%". */
.fit-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 2px 9px 2px 8px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 999px;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--accent);
  background: var(--accent-soft);
  cursor: pointer;
}

.fit-btn:hover {
  border-color: var(--accent);
}

.fit-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.meter {
  position: relative;
  width: 26px;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}

.meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--accent-fill);
}

.thin {
  font-size: 0.75rem;
  color: var(--ink-soft);
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
  background: var(--glass-shine), var(--sheet-fill);
  box-shadow: var(--shadow-2, 0 6px 24px rgb(0 0 0 / 0.12));
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--ink);
}
</style>
