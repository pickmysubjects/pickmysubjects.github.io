<script setup lang="ts">
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { computed } from 'vue'
import { subNavFor } from './nav'

/**
 * The pages inside the current section, drawn inside the top bar: nested in the active main
 * item on wide screens, centred in the bar on phones. "Me" is a real sequence (numbered,
 * joined by thin lines); "Browse" is three ways in (icons). `compact`: only the current page
 * keeps its label, the others shrink to their number or icon.
 */
defineProps<{ compact?: boolean }>()
const { view } = useView()
const { t } = useI18n()
const sub = computed(() => subNavFor(view.value))
</script>

<template>
  <nav
    v-if="sub"
    class="sub"
    :class="{ numbered: sub.numbered, compact }"
    :aria-label="t(sub.numbered ? 'nav.record' : 'browse.switchLabel')"
  >
    <ol class="sub-list">
      <li v-for="(s, i) in sub.steps" :key="s.view">
        <a
          class="sub-item"
          :href="link(s.view)"
          :aria-current="view === s.view ? 'page' : undefined"
          :title="t(s.key)"
        >
          <span v-if="sub.numbered" class="sub-n" aria-hidden="true">{{ i + 1 }}</span>
          <component :is="s.icon" v-else class="sub-icon" :size="15" aria-hidden="true" />
          <span class="sub-label">{{ t(s.key) }}</span>
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.sub {
  min-width: 0;
  overflow: hidden;
  animation: sub-open 0.32s var(--ease-spring);
}

@keyframes sub-open {
  from {
    max-width: 0;
    opacity: 0;
  }

  to {
    max-width: 640px;
    opacity: 1;
  }
}

.sub-list {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sub-list li {
  display: flex;
  flex: none;
  align-items: center;
}

/* A real sequence: a thin line joins the steps. */
.numbered .sub-list li + li::before {
  content: '';
  width: 12px;
  height: 1.5px;
  margin-right: 2px;
  border-radius: 1px;
  background: var(--divider);
}

.sub-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px 0 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink-soft);
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.sub:not(.numbered) .sub-item {
  padding: 0 10px 0 8px;
}

.sub-item:hover {
  color: var(--ink);
  background: var(--inset-fill);
}

/* The current page: a light pink tinted pill, never the solid pink of the main item. */
.sub-item[aria-current='page'] {
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent-fill) 11%, var(--glass-fill));
  font-weight: 650;
  color: var(--accent);
}

.sub-n {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--ink-faint);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.sub-item[aria-current='page'] .sub-n {
  border-color: transparent;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
}

/* Tight rows: the other pages keep only their number or icon (their name is in the title). */
.compact .sub-item:not([aria-current='page']) {
  padding: 0 6px;
}

.compact .sub-item:not([aria-current='page']) .sub-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.compact.numbered .sub-list li + li::before {
  width: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .sub {
    animation: none;
  }
}
</style>
