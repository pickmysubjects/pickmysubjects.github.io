<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import type { YearDiff } from '@/engine/yearDiff'
import { changeSections, changesSummary } from '@/utils/changesText'

/** What changed in the new Handbook year: the summary first, then the lists (see changeSections). */
const props = defineProps<{ year: string }>()
const { data } = useDataset()
const { t, locale } = useI18n()

// Built only once the new year differs from the last (scripts/changes.ts); absent until then.
const files = import.meta.glob<YearDiff>('@/generated/changes.json', { import: 'default' })
const diff = shallowRef<YearDiff | null>(null)
const loaded = shallowRef(false)
const load = Object.values(files)[0]
if (load) void load().then((d) => ((diff.value = String(d.to) === props.year ? d : null), (loaded.value = true)))
else loaded.value = true

const sep = computed(() => t.value('listSep'))
const summary = computed(() => (diff.value ? changesSummary(t.value, diff.value, sep.value) : ''))
const sections = computed(() =>
  diff.value
    ? changeSections(t.value, diff.value, {
        subjectTitle: (c) => {
          const s = data.value.subjects[c]
          return s ? localTitle(s, locale.value) || s.title : undefined
        },
        componentTitle: (id) => data.value.components.find((c) => c.id === id)?.title,
        listSep: sep.value,
      })
    : [],
)
const hrefOf = (kind: 'subject' | 'major', id: string) => link(`${kind === 'subject' ? 'subject' : 'majors'}/${id}`)
const exists = (kind: 'subject' | 'major', id: string) => (kind === 'subject' ? !!data.value.subjects[id] : data.value.components.some((c) => c.id === id))
</script>

<template>
  <article class="changes">
    <template v-if="diff">
      <h1 class="page-title">{{ t('changes.heading', { year: diff.to }) }}</h1>
      <p class="page-lede summary">{{ summary }}</p>
      <p class="note">{{ t('changes.lede', { from: diff.from }) }}</p>
      <section v-for="s in sections" :key="s.key" class="group surface">
        <h2 class="group-title">{{ s.title }}</h2>
        <ul class="list">
          <li v-for="i in s.items" :key="i.kind + i.id">
            <a v-if="exists(i.kind, i.id)" :href="hrefOf(i.kind, i.id)">{{ i.label }}</a>
            <span v-else>{{ i.label }}</span>
            <span v-if="i.details.length" class="detail">{{ i.details.join(' ') }}</span>
          </li>
        </ul>
      </section>
    </template>
    <section v-else-if="loaded" class="surface empty">
      <h1 class="page-title">{{ t('changes.heading', { year }) }}</h1>
      <p><a :href="link('')">{{ t('seo.made') }}</a></p>
    </section>
  </article>
</template>

<style scoped>
.changes {
  display: grid;
  gap: var(--space-5);
  padding-top: 32px;
  min-width: 0;
}

.summary {
  font-weight: 600;
}

.note {
  margin: 0;
  color: var(--ink-soft);
}

.group,
.empty {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
  min-width: 0;
}

.group-title {
  margin: 0;
  font-size: var(--fs-section);
}

.list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: 20px;
}

.detail {
  display: block;
  font-size: var(--fs-small);
  color: var(--ink-soft);
}
</style>
