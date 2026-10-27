<script setup lang="ts">
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { computed } from 'vue'
import { NAV_ITEMS, subNavFor } from './nav'

/**
 * The second level of the navigation, under the top bar: the pages inside the current section
 * ("Me": record → plan → shortlist, a real sequence, drawn as a numbered stepper; "Browse": three
 * ways in, drawn as plain tabs). Led by the section's name so it reads as belonging to it.
 */
const { view } = useView()
const { t } = useI18n()
const sub = computed(() => subNavFor(view.value))
const parent = computed(() => NAV_ITEMS.find((n) => n.view === sub.value?.parent))
</script>

<template>
  <nav v-if="sub" class="steps" :class="{ numbered: sub.numbered }" :aria-label="t(sub.numbered ? 'nav.record' : 'browse.switchLabel')">
    <span v-if="parent" class="steps-parent" aria-hidden="true">
      <component :is="parent.icon" :size="14" />
      {{ t(parent.key) }}
      <svg class="steps-chev" viewBox="0 0 24 24" width="14" height="14"><path d="m9 6 6 6-6 6" /></svg>
    </span>
    <ol class="steps-list">
      <li v-for="(s, i) in sub.steps" :key="s.view">
        <a class="step" :href="link(s.view)" :aria-current="view === s.view ? 'page' : undefined">
          <span v-if="sub.numbered" class="step-n" aria-hidden="true">{{ i + 1 }}</span>
          <component :is="s.icon" v-else class="step-icon" :size="15" aria-hidden="true" />
          <span class="step-label">{{ t(s.key) }}</span>
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.steps {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
}

/* "Me ›": names the section these pages belong to. */
.steps-parent {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--ink-faint);
  white-space: nowrap;
}

.steps-chev {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.steps-list {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: none;
}

.steps-list li {
  display: flex;
  flex: none;
  align-items: center;
}

/* A real sequence: a thin line joins the steps. */
.numbered .steps-list li + li::before {
  content: '';
  width: 18px;
  height: 1.5px;
  border-radius: 1px;
  background: var(--divider);
}

.steps:not(.numbered) .steps-list {
  gap: 4px;
}

.step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--control-h-sm);
  padding: 0 12px 0 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink-soft);
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.steps:not(.numbered) .step {
  padding: 0 12px;
}

.step:hover {
  color: var(--ink);
  background: var(--inset-fill);
}

/* The current page: a tinted glass pill (never the solid pink of the main nav). */
.step[aria-current='page'] {
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  background: color-mix(in srgb, var(--accent-fill) 10%, var(--glass-fill));
  box-shadow: var(--glass-shadow);
  font-weight: 650;
  color: var(--accent);
}

.step-n {
  display: inline-grid;
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

.step[aria-current='page'] .step-n {
  border-color: transparent;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
}

@media (max-width: 720px) {
  .steps-parent {
    display: none;
  }

  .step-icon {
    display: none;
  }
}

@media (max-width: 420px) {
  .numbered .steps-list li + li::before {
    width: 10px;
  }

  .step {
    padding: 0 8px 0 5px;
    font-size: 0.8125rem;
  }

  /* Phones: the other steps keep their number and a short label, so all three stay on screen. */
  .numbered .step:not([aria-current='page']) .step-label {
    max-width: 5.5em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
