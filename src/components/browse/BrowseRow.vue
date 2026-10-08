<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Star } from 'lucide-vue-next'
import type { BrowseRow } from '@/engine'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'

const props = defineProps<{ row: BrowseRow; course: string }>()
const { t } = useI18n()

const s = computed(() => props.row.subject)
const category = computed(() => s.value.categories[props.course])
</script>

<template>
  <a class="row" :href="link(`subject/${s.code}`)">
    <span class="main">
      <span class="head">
        <span class="code">{{ s.code }}</span>
        <span v-if="category === 'breadth'" class="tag tag-breadth">{{ t('browse.cat.breadth') }}</span>
      </span>
      <span class="title">{{ s.title }}</span>
      <span class="meta">
        <span>{{ row.periods.length ? row.periods.map((p) => t(`periodShort.${p}`)).join(' · ') : t('browse.notRunning') }}</span>
        <span v-if="row.exam !== null">{{ row.exam === 0 ? t('browse.metaNoExam') : t('browse.metaExam', { n: row.exam }) }}</span>
        <span v-if="row.hours !== null">{{ t('browse.metaHours', { n: row.hours }) }}</span>
        <span v-if="s.prerequisites === 'none'">{{ t('browse.metaNoPrereq') }}</span>
        <span v-if="row.rating !== null" class="rating"><Star :size="12" aria-hidden="true" />{{ row.rating }}</span>
      </span>
    </span>
    <ChevronRight :size="18" aria-hidden="true" class="go" />
  </a>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line);
}

.row:hover {
  background: var(--surface-2);
}

.main {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code {
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--accent);
}

.tag {
  padding: 1px 8px;
  font-size: 0.72rem;
  border-radius: 999px;
}

.tag-breadth {
  color: var(--warn);
  background: var(--warn-soft);
}

.title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.go {
  flex: none;
  color: var(--ink-faint);
}
</style>
