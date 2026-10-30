<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { localTitle } from '@/i18n/localized'
import type { YearDiff } from '@/engine/yearDiff'
import { changeSections, changesSummary } from '@/utils/changesText'
import { SITE_RELEASES } from '@/content/updates'
import InfoPage from '@/components/about/InfoPage.vue'
import GuideItem from '@/components/guide/GuideItem.vue'

/**
 * /changes/<year>: what changed in the new Handbook year, the summary first, then the lists (see
 * changeSections). /changes/ on its own: the index, with that year's page (once there is one) and
 * the site's own update log (the one place it is shown; About links here).
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
// The update log: one version at a time, picked from a row of versions (newest first).
const shownVersion = shallowRef(SITE_RELEASES[0]!.version)
const shownRelease = computed(() => SITE_RELEASES.find((r) => r.version === shownVersion.value) ?? SITE_RELEASES[0]!)

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
const title = computed(() => (props.year ? t.value('changes.heading', { year: props.year }) : t.value('menu.changes')))
const exists = (kind: 'subject' | 'major', id: string) => (kind === 'subject' ? !!data.value.subjects[id] : data.value.components.some((c) => c.id === id))
</script>

<template>
  <InfoPage page="changes" :title="title" :refresh="loaded">
    <template v-if="!year">
      <GuideItem id="changes-handbook" :title="t('changes.handbookTitle')">
        <p v-if="latest">
          <a :href="link(`changes/${latest.to}`)">{{ t('changes.heading', { year: latest.to }) }}</a>
        </p>
        <p v-else-if="loaded" class="note">{{ t('changes.none') }}</p>
      </GuideItem>
      <GuideItem id="changes-site" :title="t('about.updatesTitle')">
        <!-- Versions only, no dates; the row scrolls sideways when it doesn't fit. -->
        <!-- One thin line with a dot per version, newest on the left; the picked dot is filled. -->
        <div class="versions" role="group" :aria-label="t('about.updatesTitle')">
          <button v-for="r in SITE_RELEASES" :key="r.version" type="button" class="version" :aria-pressed="r.version === shownVersion" @click="shownVersion = r.version">
            <span class="version-dot" aria-hidden="true" />
            <span class="version-num">v{{ r.version }}</span>
          </button>
        </div>
        <ul class="log">
          <li v-for="(p, i) in shownRelease.points" :key="i">{{ p[locale] }}</li>
        </ul>
      </GuideItem>
    </template>
    <template v-else-if="diff">
      <section class="summary surface">
        <p class="summary-text">{{ summary }}</p>
        <p class="note">{{ t('changes.lede', { from: diff.from }) }}</p>
      </section>
      <GuideItem v-for="s in sections" :id="s.key" :key="s.key" :title="s.title">
        <ul class="list">
          <li v-for="i in s.items" :key="i.kind + i.id">
            <a v-if="exists(i.kind, i.id)" :href="hrefOf(i.kind, i.id)">{{ i.label }}</a>
            <span v-else>{{ i.label }}</span>
            <span v-if="i.details.length" class="detail">{{ i.details.join(' ') }}</span>
          </li>
        </ul>
      </GuideItem>
    </template>
    <p v-else-if="loaded" class="foot"><a :href="link('')">{{ t('seo.made') }}</a></p>
  </InfoPage>
</template>

<style scoped>
.versions {
  position: relative;
  display: flex;
  margin: 0 0 12px;
  padding: 4px 0 6px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.version {
  position: relative;
  flex: 1 0 64px;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 0;
  color: var(--ink-soft);
  font: inherit;
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
  background: none;
  border: 0;
  cursor: pointer;
}

/* The line: each version draws its half to the left and right of its dot. */
.version::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--divider);
}

.version:first-child::before {
  left: 50%;
}

.version:last-child::before {
  right: 50%;
}

.version-dot {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--divider);
}

.version:hover {
  color: var(--ink);
}

.version:hover .version-dot {
  background: var(--ink-soft);
}

.version[aria-pressed='true'] {
  color: var(--ink);
  font-weight: var(--fw-semibold);
}

.version[aria-pressed='true'] .version-dot {
  background: var(--accent-fill);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-fill) 16%, transparent);
}

.log {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 1.2em;
  line-height: 1.55;
}

.summary {
  display: grid;
  gap: 8px;
  padding: 24px 32px;
}

.summary-text {
  font-size: 1.0625rem;
  font-weight: var(--fw-semibold);
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

@media (max-width: 640px) {
  .summary {
    padding: 18px 14px;
    border-radius: 18px;
  }
}
</style>
