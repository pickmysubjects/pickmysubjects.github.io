<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ChevronRight, ExternalLink } from 'lucide-vue-next'
import { handbookUrl } from '@/utils/links'
import { periodsFor } from '@/engine'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

// A short list of subjects, each a link with its title and when it runs; `notes` adds a line per code.
const props = defineProps<{ codes: string[]; year: number; notes?: Record<string, string>; limit?: number }>()
// A long list starts short; the rest is one tap away.
const expanded = shallowRef(false)
const { data } = useDataset()
const { t } = useI18n()

const visible = computed(() => (props.limit && !expanded.value ? props.codes.slice(0, props.limit) : props.codes))
const hidden = computed(() => props.codes.length - visible.value.length)
const rows = computed(() =>
  visible.value.map((code) => {
    const s = data.value.subjects[code]
    return {
      code,
      // Not added to our data yet: say so, and go to the Handbook instead of an empty page.
      missing: !s,
      title: s?.title ?? t.value('subject.notYetAdded'),
      when: s ? periodsFor(s, props.year).map((p) => t.value(`periodShort.${p}`)).join(' · ') : '',
      note: props.notes?.[code],
    }
  }),
)
</script>

<template>
  <ul class="links surface">
    <li v-for="r in rows" :key="r.code">
      <a
        class="row"
        :class="{ 'row-missing': r.missing }"
        :href="r.missing ? handbookUrl(r.code) : link(`subject/${r.code}`)"
        :target="r.missing ? '_blank' : undefined"
        :rel="r.missing ? 'noopener' : undefined"
      >
        <span class="main">
          <span class="head">
            <span class="code">{{ r.code }}</span>
            <span v-if="r.when" class="when">{{ r.when }}</span>
          </span>
          <span class="title">{{ r.title }}</span>
          <span v-if="r.note" class="note">{{ r.note }}</span>
        </span>
        <ExternalLink v-if="r.missing" :size="16" aria-hidden="true" class="go" />
        <ChevronRight v-else :size="18" aria-hidden="true" class="go" />
      </a>
    </li>
    <li v-if="hidden > 0" class="more-row">
      <button type="button" class="more" @click="expanded = true">{{ t('subject.showAll', { n: codes.length }) }}</button>
    </li>
  </ul>
</template>

<style scoped>
.row-missing .title {
  font-weight: 400;
  color: var(--ink-soft);
}

.links {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.links li + li {
  border-top: 1px solid var(--line);
}

.more {
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  text-align: left;
  cursor: pointer;
}

.more:hover {
  background: var(--glass-fill-hover);
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
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--accent);
}

.when {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.note {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.go {
  flex: none;
  color: var(--ink-faint);
}
</style>
