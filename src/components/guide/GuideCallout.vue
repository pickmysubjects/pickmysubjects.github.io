<script setup lang="ts">
import { computed } from 'vue'
import { Lightbulb, TriangleAlert } from 'lucide-vue-next'

/**
 * A set-off line in a guide topic. tip: a how-to or a feature of this site; warn: a trap that
 * costs money, marks or a visa; pull: the one thing to remember from the whole page.
 */
const props = withDefaults(defineProps<{ kind?: 'tip' | 'warn' | 'pull' }>(), { kind: 'tip' })
const icon = computed(() => (props.kind === 'warn' ? TriangleAlert : props.kind === 'tip' ? Lightbulb : null))
</script>

<template>
  <aside class="callout" :class="kind">
    <component :is="icon" v-if="icon" :size="18" aria-hidden="true" class="callout-icon" />
    <div class="callout-body"><slot /></div>
  </aside>
</template>

<style scoped>
.callout {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  line-height: 1.6;
}

.callout-body {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.callout-icon {
  flex: none;
  margin-top: 0.2em;
}

.tip {
  background: var(--inset-fill);
}

.tip .callout-icon {
  color: var(--accent);
}

.warn {
  background: var(--warn-soft);
  color: var(--ink);
}

.warn .callout-icon {
  color: var(--warn);
}

/* The page's one key line: larger type on an accent rule, no box. */
.pull {
  padding: 4px 0 4px 20px;
  border-left: 3px solid var(--accent-fill);
  border-radius: 0;
  font-size: 1.1875rem;
  font-weight: var(--fw-semibold);
  line-height: 1.5;
  letter-spacing: var(--track-heading);
  color: var(--ink);
  text-wrap: pretty;
}

@media (max-width: 640px) {
  .callout:not(.pull) {
    gap: 10px;
    padding: 12px;
  }

  .pull {
    font-size: 1.0625rem;
    padding-left: 16px;
  }
}
</style>
