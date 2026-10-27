<script setup lang="ts" generic="T extends string | number">
// A segmented control: a glass track with a raised pill that slides to the chosen option.
// Arrow keys move between options (radiogroup pattern). Styles live in main.css (.seg-*).
import { computed } from 'vue'

const props = defineProps<{
  options: readonly { value: T; label: string }[]
  label: string
}>()
const model = defineModel<T>({ required: true })

const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))

function onKey(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const n = props.options.length
  const next = props.options[(index.value + step + n) % n]
  if (!next) return
  model.value = next.value
  const track = e.currentTarget as HTMLElement
  ;(track.querySelectorAll<HTMLElement>('.seg-option')[(index.value + n) % n])?.focus()
}
</script>

<template>
  <div
    class="seg-track"
    role="radiogroup"
    :aria-label="label"
    :style="{ '--seg-count': options.length, '--seg-index': index }"
    @keydown="onKey"
  >
    <span class="seg-thumb" aria-hidden="true" />
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      role="radio"
      class="seg-option"
      :aria-checked="o.value === model"
      :tabindex="o.value === model ? 0 : -1"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
