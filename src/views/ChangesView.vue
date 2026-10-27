<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import type { YearDiff } from '@/engine/yearDiff'
import { changeSections, changesSummary } from '@/utils/changesText'
import { SITE_UPDATES } from '@/content/updates'

/**
 * /changes/<year>: what changed in the new Handbook year, the summary first, then the lists (see
 * changeSections). /changes/ on its own: the index, with that year's page (once there is one) and
 * the site's own update log.
 */
const props = defineProps<{ year: string }>()
const { data } = useDataset()
const { t, locale } = useI18n()

// Built only once the new year differs from the last (scripts/changes.ts); absent until then.
const files = import.meta.glob<YearDiff>('@/generated/changes.json', { import: 'default' })
const diff = shallowRef<YearDiff | null>(null)
const loaded = shallowRef(false)
const latest = shallowRef<YearDiff | null>(null)
const load = Object.values(files)[0]
if (load) void load().then((d) => ((latest.value = d), (diff.value = String(d.to) === props.year ? d : null), (loaded.value = true)))
else loaded.value = true
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })

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
    <template v-if="!year">
      <h1 class="page-title">{{ t('menu.changes') }}</h1>
      <p class="page-lede">{{ t('changes.indexLede') }}</p>
      <section class="group surface" aria-labelledby="changes-handbook">
        <h2 id="changes-handbook" class="group-title">{{ t('changes.handbookTitle') }}</h2>
        <p v-if="latest">
          <a :href="link(`changes/${latest.to}`)">{{ t('changes.heading', { year: latest.to }) }}</a>
        </p>
        <p v-else-if="loaded" class="note">{{ t('changes.none') }}</p>
      </section>
      <section class="group surface" aria-labelledby="changes-site">
        <h2 id="changes-site" class="group-title">{{ t('about.updatesTitle') }}</h2>
        <ul class="updates">
          <li v-for="(u, i) in SITE_UPDATES" :key="i">
            <time :datetime="u.date">{{ day(u.date) }}</time>
            <span>{{ u.text[locale] }}</span>
          </li>
        </ul>
      </section>
    </template>
    <template v-else-if="diff">
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
.updates {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.updates li {
  display: grid;
  grid-template-columns: minmax(7.5em, max-content) minmax(0, 1fr);
  gap: var(--space-4);
}

.updates time {
  color: var(--ink-soft);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .updates li {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}

.changes {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--page-top);
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
