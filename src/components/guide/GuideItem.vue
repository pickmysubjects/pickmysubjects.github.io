<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

// One topic on the basics page: the short answer always shows, the detail opens on tap.
defineProps<{ title: string; short: string; open?: boolean }>()
</script>

<template>
  <details class="item" :open="open">
    <summary class="head">
      <span class="text">
        <span class="title">{{ title }}</span>
        <span class="short">{{ short }}</span>
      </span>
      <ChevronDown :size="18" aria-hidden="true" class="chev" />
    </summary>
    <div class="body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.item + .item {
  border-top: 1px solid var(--line);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  list-style: none;
  cursor: pointer;
}

.head::-webkit-details-marker {
  display: none;
}

.head:hover .title {
  color: var(--accent);
}

.text {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.title {
  font-weight: 650;
  transition: color 0.15s;
}

.short {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.chev {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.2s;
}

.item[open] .chev {
  transform: rotate(180deg);
}

.body {
  display: grid;
  gap: 12px;
  padding: 0 20px 20px;
  line-height: 1.65;
}

@media (max-width: 720px) {
  .head {
    padding: 14px 16px;
  }

  .body {
    padding: 0 16px 18px;
  }
}
</style>
