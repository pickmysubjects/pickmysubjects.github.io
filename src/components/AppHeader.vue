<script setup lang="ts">
import { computed } from 'vue'
import { useDataset, type DatasetName } from '@/composables/useDataset'
import type { View } from '@/composables/useView'

defineProps<{ view: View }>()

const { name, data, setDataset } = useDataset()

const links: { view: View; label: string }[] = [
  { view: 'plan', label: 'Plan' },
  { view: 'recommend', label: 'Suggestions' },
  { view: 'record', label: 'My record' },
  { view: 'contribute', label: 'Add data' },
  { view: 'feedback', label: 'Feedback' },
]

const subjectCount = computed(() => Object.keys(data.value.subjects).length)

function onDataset(event: Event): void {
  setDataset((event.target as HTMLSelectElement).value as DatasetName)
}
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <a class="wordmark" href="#/plan">
        <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5 L14.5 12 L12 19 L9.5 12 Z" />
        </svg>
        Subject Compass
      </a>
      <nav class="nav" aria-label="Main">
        <a
          v-for="link in links"
          :key="link.view"
          class="nav-link"
          :href="`#/${link.view}`"
          :aria-current="view === link.view ? 'page' : undefined"
          >{{ link.label }}</a
        >
      </nav>
      <label class="dataset">
        <span class="visually-hidden">Data</span>
        <select class="select dataset-select" :value="name" @change="onDataset">
          <option value="demo">Demo data (fictional)</option>
          <option value="real">UniMelb data (real, growing)</option>
        </select>
      </label>
    </div>
    <p v-if="name === 'demo'" class="demo-note">
      You're exploring a fictional “Example University” so every feature has data to show. Switch to UniMelb data —
      it's real but still small, and it grows as students add subjects.
    </p>
    <p v-else class="demo-note">
      Only {{ subjectCount }} UniMelb subjects are curated so far, so most checks will say “can't tell yet”.
      <a href="#/contribute">Add a subject you know</a> — it takes about a minute.
    </p>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 1px solid var(--contour);
  background: var(--paper-raised);
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 28px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px 20px;
}

.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
}

.mark {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--overprint);
  stroke-width: 2;
}

.mark path {
  fill: var(--overprint);
  stroke: none;
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-link {
  padding: 6px 10px;
  white-space: nowrap;
  border-radius: var(--radius);
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
}

.nav-link:hover {
  color: var(--ink);
}

.nav-link[aria-current='page'] {
  color: var(--ink);
  box-shadow: inset 0 -2px 0 var(--overprint);
  border-radius: 0;
}

.dataset-select {
  width: auto;
  font-size: 0.85rem;
}

.demo-note {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px 12px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .nav {
    order: 3;
    flex-basis: 100%;
    margin: 0 -10px;
  }
}
</style>
