<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { describeField, PERIOD_LABELS, type PasteResult } from '@/engine'

const props = defineProps<{ parsed: PasteResult; yaml: string }>()

const copied = shallowRef(false)
const offerings = computed(() =>
  props.parsed.offerings === 'unknown' ? 'Not found' : props.parsed.offerings.map((p) => PERIOD_LABELS[p]).join(', '),
)
const nonAllowed = computed(() =>
  props.parsed.nonAllowed === 'unknown' ? 'Not found' : props.parsed.nonAllowed.join(', ') || 'None',
)

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.yaml)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <section class="preview" aria-labelledby="preview-title">
    <h2 id="preview-title" class="section-title">What we read</h2>
    <dl class="facts">
      <dt>Prerequisites</dt>
      <dd>{{ describeField(parsed.prerequisites) }}</dd>
      <dt>Corequisites</dt>
      <dd>{{ describeField(parsed.corequisites) }}</dd>
      <dt>Non-allowed</dt>
      <dd>{{ nonAllowed }}</dd>
      <dt>Runs in</dt>
      <dd>{{ offerings }}</dd>
    </dl>
    <ul v-if="parsed.warnings.length" class="warnings">
      <li v-for="(w, i) in parsed.warnings" :key="i">{{ w }}</li>
    </ul>
    <div class="yaml-head">
      <h2 class="section-title">Data file</h2>
      <button class="button button-quiet" type="button" @click="copy">{{ copied ? 'Copied' : 'Copy YAML' }}</button>
    </div>
    <pre class="yaml code">{{ yaml }}</pre>
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 800;
}

.facts {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  margin: 10px 0 0;
  font-size: 0.9rem;
}

.facts dt {
  font-weight: 600;
  color: var(--ink-soft);
}

.facts dd {
  margin: 0;
}

.warnings {
  margin: 12px 0 0;
  padding: 10px 12px 10px 28px;
  border-left: 3px solid var(--open);
  background: var(--open-tint);
  font-size: 0.85rem;
}

.yaml-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.yaml {
  margin: 8px 0 0;
  padding: 12px;
  border: 1px solid var(--contour);
  border-radius: var(--radius);
  background: var(--paper);
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>
