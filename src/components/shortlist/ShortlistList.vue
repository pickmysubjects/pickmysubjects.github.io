<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { periodsFor, type Subject } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import { subjectGist } from '@/i18n/gist'

/** The saved subjects with their quick facts: pick some to compare, open one, or remove it. */
const props = defineProps<{ codes: string[]; picked: string[]; max: number; year: number }>()
const emit = defineEmits<{ pick: [code: string]; remove: [code: string] }>()
const { data } = useDataset()
const { t, locale } = useI18n()

// Codes no longer in the data (renamed, or saved on the demo data) are skipped, not shown broken.
const items = computed(() =>
  props.codes
    .map((c) => data.value.subjects[c])
    .filter((s): s is Subject => s !== undefined)
    .map((s) => {
      const periods = periodsFor(s, props.year)
      return {
        s,
        title: localTitle(s, locale.value) || s.title,
        facts: [periods.length ? periods.map((p) => t.value(`periodShort.${p}`)).join(' · ') : t.value('shortlist.notRunning'), ...subjectGist(t.value, s)],
      }
    }),
)
const full = computed(() => props.picked.length >= props.max)
</script>

<template>
  <ul class="list">
    <li v-for="i in items" :key="i.s.code" class="item" :class="{ picked: picked.includes(i.s.code) }">
      <label class="pick">
        <input
          type="checkbox"
          :checked="picked.includes(i.s.code)"
          :disabled="full && !picked.includes(i.s.code)"
          :aria-label="t('shortlist.pickLabel', { code: i.s.code })"
          @change="emit('pick', i.s.code)"
        />
      </label>
      <div class="body">
        <span class="code">{{ i.s.code }}</span>
        <a class="title" :href="link(`subject/${i.s.code}`)">{{ i.title }}</a>
        <span class="facts">
          <span v-for="f in i.facts" :key="f" class="fact">{{ f }}</span>
        </span>
      </div>
      <button type="button" class="remove" :aria-label="t('shortlist.removeLabel', { code: i.s.code })" :title="t('shortlist.remove')" @click="emit('remove', i.s.code)">
        <X :size="18" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4);
  border-bottom: 1px solid var(--line);
  transition: background 0.15s;
}

.item:last-child {
  border-bottom: 0;
}

.item.picked {
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
}

.pick {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

.pick input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
  cursor: pointer;
}

.pick input:disabled {
  cursor: not-allowed;
}

.body {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.code {
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--accent);
}

.title {
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.title:hover {
  text-decoration: underline;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin-top: 4px;
}

.fact {
  padding: 1px 9px;
  font-size: 0.8125rem;
  color: var(--ink-soft);
  background: var(--surface-2);
  border-radius: 999px;
}

.remove {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
}

.remove:hover {
  color: var(--ink);
  background: var(--surface-2);
}

.remove:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
  }
}
</style>
