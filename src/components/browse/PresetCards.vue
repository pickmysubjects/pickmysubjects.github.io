<script setup lang="ts">
import { onMounted, useTemplateRef, type Component } from 'vue'
import { FileX, Flame, Scale, Shapes, Snowflake, Sparkles, Sprout, X } from 'lucide-vue-next'
import type { Order, PresetName } from '@/engine'
import { useI18n } from '@/i18n'

/**
 * One row of chips under the hero, in two kinds. Orders (one at a time, instead of the sort
 * menu): "Fits me" first and set apart (the student's own interests and strengths), then easiest
 * first (水课) and hardest first (难课). Shortcuts: each sets ordinary filters (the same ones the
 * filter panel shows) and is lit while those filters are exactly its values. A lit chip is pink
 * and has its own ✕; tapping it again also turns it off. Where the row scrolls sideways, the lit
 * chip is brought into view.
 */
const props = defineProps<{ order: Order; preset: PresetName | null }>()
const emit = defineEmits<{ order: [o: Order]; preset: [p: PresetName | null] }>()
const { t } = useI18n()

const ORDERS: { id: Exclude<Order, 'mine' | null>; icon: Component; name: string }[] = [
  { id: 'easy', icon: Scale, name: 'browse.rankList.easy' },
  { id: 'hard', icon: Flame, name: 'browse.rankList.hard' },
]
const SHORTCUTS: { id: PresetName; icon: Component; name: string }[] = [
  { id: 'noExam', icon: FileX, name: 'browse.preset.noExam' },
  { id: 'summerWinter', icon: Snowflake, name: 'browse.preset.summerWinter' },
  { id: 'firstSemester', icon: Sprout, name: 'browse.preset.firstSemester' },
  { id: 'breadth', icon: Shapes, name: 'browse.preset.breadth' },
]
const toggleOrder = (o: Order) => emit('order', props.order === o ? null : o)
const togglePreset = (p: PresetName) => emit('preset', props.preset === p ? null : p)

const row = useTemplateRef<HTMLElement>('row')
onMounted(() => {
  const el = row.value
  const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!el || !on || el.scrollWidth <= el.clientWidth) return
  const a = el.getBoundingClientRect()
  const b = on.getBoundingClientRect()
  el.scrollLeft += b.left - a.left - (a.width - b.width) / 2
})
</script>

<template>
  <div ref="row" class="presets" role="group" :aria-label="t('browse.presets')">
    <div class="preset preset-mine" :class="{ on: order === 'mine' }">
      <button type="button" class="preset-btn" :aria-pressed="order === 'mine'" :title="t('browse.presetDesc.mine')" @click="toggleOrder('mine')">
        <Sparkles :size="16" aria-hidden="true" class="preset-icon" />{{ t('browse.preset.mine') }}
      </button>
      <button v-if="order === 'mine'" type="button" class="preset-x" :aria-label="t('browse.removeFilter', { x: t('browse.preset.mine') })" @click="emit('order', null)">
        <X :size="14" aria-hidden="true" />
      </button>
    </div>
    <div v-for="o in ORDERS" :key="o.id" class="preset" :class="{ on: order === o.id }">
      <button type="button" class="preset-btn" :aria-pressed="order === o.id" @click="toggleOrder(o.id)">
        <component :is="o.icon" :size="16" aria-hidden="true" class="preset-icon" />{{ t(o.name) }}
      </button>
      <button v-if="order === o.id" type="button" class="preset-x" :aria-label="t('browse.removeFilter', { x: t(o.name) })" @click="emit('order', null)">
        <X :size="14" aria-hidden="true" />
      </button>
    </div>
    <span class="preset-sep" aria-hidden="true" />
    <div v-for="l in SHORTCUTS" :key="l.id" class="preset" :class="{ on: preset === l.id }">
      <button type="button" class="preset-btn" :aria-pressed="preset === l.id" @click="togglePreset(l.id)">
        <component :is="l.icon" :size="16" aria-hidden="true" class="preset-icon" />{{ t(l.name) }}
      </button>
      <button v-if="preset === l.id" type="button" class="preset-x" :aria-label="t('browse.removeFilter', { x: t(l.name) })" @click="emit('preset', null)">
        <X :size="14" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* One row of compact chips: the name and its icon; the orders, then a hairline, then the
   shortcuts. Where the row doesn't fit (phones, long languages) it scrolls sideways out to the
   screen's edges. */
.presets {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 calc(-1 * var(--gutter, 24px));
  padding: 2px var(--gutter, 24px) 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.presets::-webkit-scrollbar {
  display: none;
}

.preset {
  position: relative;
  flex: none;
}

.preset-sep {
  flex: none;
  width: 1px;
  height: 24px;
  margin: 0 4px;
  background: var(--divider);
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px 0 13px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  white-space: nowrap;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.2s var(--ease-spring);
}

.preset-btn:hover {
  background: var(--glass-shine), var(--glass-fill-hover);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--glass-edge));
}

.preset-btn:active {
  transform: scale(var(--press-scale));
}

.preset-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.preset-icon {
  flex: none;
  color: var(--accent);
}

/* Chosen: the brand pink, with room for its ✕. */
.on .preset-btn {
  padding-right: 38px;
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
  border-color: transparent;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), 0 6px 16px -6px color-mix(in srgb, var(--accent-fill) 60%, transparent);
}

.on .preset-icon {
  color: var(--accent-fill-ink);
}

/* "Fits me" off: a soft pink pill, already the most noticeable of the row; on: full pink. */
.preset-mine:not(.on) .preset-btn {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.preset-mine:not(.on) .preset-btn:hover {
  border-color: var(--accent);
}

.preset-mine {
  margin-right: 6px;
}

.preset-x {
  position: absolute;
  top: 50%;
  right: 8px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--accent-fill-ink);
  background: rgb(255 255 255 / 22%);
  border: 0;
  border-radius: 999px;
  transform: translateY(-50%);
  cursor: pointer;
}

.preset-x:hover {
  background: rgb(255 255 255 / 36%);
}

.preset-x:focus-visible {
  outline: 2px solid var(--accent-fill-ink);
  outline-offset: 1px;
}

@media (pointer: coarse), (max-width: 720px) {
  .preset-btn {
    min-height: 44px;
  }
}
</style>
