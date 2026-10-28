<script setup lang="ts">
import { useId, type Component } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

/**
 * One group of filters in the side panel and the phone sheet: a heading with its icon, how many
 * of its options are on, and a fold. `open` is the parent's, so the fold survives a re-render.
 */
defineProps<{ title: string; icon: Component; active: number }>()
const open = defineModel<boolean>('open', { required: true })
const id = useId()
</script>

<template>
  <section class="fgroup" :class="{ on: active > 0 }">
    <h3 class="fgroup-head">
      <button type="button" class="fgroup-toggle" :aria-expanded="open" :aria-controls="id" @click="open = !open">
        <component :is="icon" :size="16" aria-hidden="true" class="fgroup-icon" />
        <span class="fgroup-title">{{ title }}</span>
        <span v-if="active" class="fgroup-count">{{ active }}</span>
        <ChevronDown :size="16" aria-hidden="true" class="fgroup-chev" />
      </button>
    </h3>
    <div v-show="open" :id="id" class="fgroup-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.fgroup {
  padding: 4px 0 6px;
}

.fgroup + .fgroup {
  border-top: 1px solid var(--divider);
}

.fgroup-head {
  margin: 0;
  font: inherit;
}

.fgroup-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 6px 8px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink);
  text-align: start;
  background: none;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.fgroup-toggle:hover {
  background: var(--inset-fill);
}

.fgroup-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.fgroup-icon {
  flex: none;
  color: var(--ink-faint);
}

.on .fgroup-icon {
  color: var(--accent);
}

.fgroup-title {
  flex: 1;
  min-width: 0;
}

.fgroup-count {
  min-width: 20px;
  padding: 0 6px;
  font-size: var(--fs-caption);
  line-height: 20px;
  text-align: center;
  color: var(--accent-fill-ink);
  background: var(--accent-fill);
  border-radius: 999px;
}

.fgroup-chev {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.2s var(--ease-spring);
}

[aria-expanded='false'] .fgroup-chev {
  transform: rotate(-90deg);
}

.fgroup-body {
  display: grid;
  gap: 8px;
  padding: 4px 8px 10px;
}

@media (prefers-reduced-motion: reduce) {
  .fgroup-chev {
    transition: none;
  }
}
</style>
