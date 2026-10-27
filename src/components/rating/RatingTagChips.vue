<script setup lang="ts">
import { computed } from 'vue'
import { topTags } from '@/engine'
import { useI18n } from '@/i18n'

/** The tags students tick most for a subject, with how many ticked each. Hidden when none. */
const props = defineProps<{ tags?: Partial<Record<string, number>> }>()
const { t } = useI18n()
const top = computed(() => topTags(props.tags))
</script>

<template>
  <div v-if="top.length" class="tags">
    <span class="tags-title">{{ t('ratingTags.title') }}</span>
    <ul class="tags-list">
      <li v-for="x in top" :key="x.tag" class="tag">
        {{ t(`ratingTags.${x.tag}`) }}<span class="tag-n" :aria-label="t('ratingTags.count', { n: x.n })">{{ x.n }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tags {
  display: grid;
  gap: var(--space-2);
}

.tags-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  font-size: 0.875rem;
  font-weight: 550;
  color: var(--ink);
  background: var(--inset-fill);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.tag-n {
  min-width: 22px;
  padding: 1px 7px;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
}
</style>
