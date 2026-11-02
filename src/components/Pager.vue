<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

/**
 * Page numbers under a long list: Previous, the first, the last and the pages around the current
 * one (gaps as "…"), Next. Text buttons only; the current page is marked, not a link.
 */
const props = defineProps<{ page: number; pages: number }>()
const emit = defineEmits<{ go: [page: number] }>()
const { t } = useI18n()

/** 1 … 4 5 [6] 7 8 … 20: always the ends, two either side of the current page. */
const items = computed<(number | 'gap')[]>(() => {
  const { page, pages } = props
  const want = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter((n) => n >= 1 && n <= pages))
  const list = [...want].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  for (const [i, n] of list.entries()) {
    if (i && n - list[i - 1]! > 1) out.push('gap')
    out.push(n)
  }
  return out
})
</script>

<template>
  <nav v-if="pages > 1" class="pager" :aria-label="t('pager.label')">
    <button type="button" class="pager-step" :disabled="page <= 1" @click="emit('go', page - 1)">{{ t('pager.prev') }}</button>
    <template v-for="(n, i) in items" :key="i">
      <span v-if="n === 'gap'" class="pager-gap" aria-hidden="true">…</span>
      <button v-else type="button" class="pager-num" :aria-current="n === page ? 'page' : undefined" @click="n !== page && emit('go', n)">{{ n }}</button>
    </template>
    <button type="button" class="pager-step" :disabled="page >= pages" @click="emit('go', page + 1)">{{ t('pager.next') }}</button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.pager-step,
.pager-num {
  min-width: 36px;
  min-height: 36px;
  padding: 0 12px;
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-small);
  font-variant-numeric: tabular-nums;
  background: var(--glass-fill);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
}

.pager-step:hover:not(:disabled),
.pager-num:hover:not([aria-current]) {
  border-color: var(--ink-soft);
}

.pager-step:disabled {
  color: var(--ink-soft);
  cursor: default;
  opacity: 0.5;
}

.pager-num[aria-current='page'] {
  color: var(--accent-fill-ink);
  font-weight: var(--fw-semibold);
  background: var(--accent-fill);
  border-color: var(--accent-fill);
  cursor: default;
}

.pager-gap {
  color: var(--ink-soft);
}
</style>
