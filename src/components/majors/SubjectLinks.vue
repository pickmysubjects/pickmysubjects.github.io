<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { periodsFor } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

// A short list of subjects, each a link with its title and when it runs; `notes` adds a line per code.
const props = defineProps<{ codes: string[]; year: number; notes?: Record<string, string> }>()
const { data } = useDataset()
const { t } = useI18n()

const rows = computed(() =>
  props.codes.map((code) => {
    const s = data.value.subjects[code]
    return {
      code,
      title: s?.title ?? t.value('plan.notInDataset'),
      when: s ? periodsFor(s, props.year).map((p) => t.value(`periodShort.${p}`)).join(' · ') : '',
      note: props.notes?.[code],
    }
  }),
)
</script>

<template>
  <ul class="links surface">
    <li v-for="r in rows" :key="r.code">
      <a class="row" :href="link(`subject/${r.code}`)">
        <span class="main">
          <span class="head">
            <span class="code">{{ r.code }}</span>
            <span v-if="r.when" class="when">{{ r.when }}</span>
          </span>
          <span class="title">{{ r.title }}</span>
          <span v-if="r.note" class="note">{{ r.note }}</span>
        </span>
        <ChevronRight :size="18" aria-hidden="true" class="go" />
      </a>
    </li>
  </ul>
</template>

<style scoped>
.links {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.links li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--ink);
  text-decoration: none;
}

.row:hover {
  background: var(--surface-2);
}

.main {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.code {
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--accent);
}

.when {
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.note {
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.go {
  flex: none;
  color: var(--ink-faint);
}
</style>
