<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { usePhone } from '@/composables/usePhone'

/**
 * A lower section of the subject page. On wide screens it reads straight through; on phones it
 * folds to its heading so the page stays short, and opens on tap.
 */
defineProps<{ title: string }>()
const phone = usePhone()
</script>

<template>
  <details v-if="phone" class="fold">
    <summary class="fold-head">
      <span class="sec-title">{{ title }}</span>
      <ChevronDown :size="18" aria-hidden="true" class="fold-chev" />
    </summary>
    <div class="fold-body"><slot /></div>
  </details>
  <template v-else>
    <h2 class="sec-title">{{ title }}</h2>
    <slot />
  </template>
</template>

<style scoped>
.fold-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  list-style: none;
  cursor: pointer;
}

.fold-head::-webkit-details-marker {
  display: none;
}

.fold-head .sec-title {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
}

.fold-chev {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.2s;
}

.fold[open] .fold-chev {
  transform: rotate(180deg);
}

.fold-body {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-4);
}

/* The FAQ brings its own heading; inside a fold the summary already says it. */
.fold-body :deep(.faq-title) {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .fold-chev {
    transition: none;
  }
}
</style>
