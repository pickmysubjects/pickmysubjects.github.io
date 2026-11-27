<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef } from 'vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import SavedTable from '@/components/shortlist/SavedTable.vue'
import { compareFromQuery, useShortlist } from '@/composables/useShortlist'
import { go, link, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { isComparePair, pairFromSlug } from '@/engine/comparePairs'

/**
 * Saved subjects, and the comparison of them: one table, a row per subject. Any subject can be
 * added to compare from the search at the top, without saving it first (it goes in ?compare=, so
 * the address shares the same table); saving with the heart keeps it here for good.
 */
const { t } = useI18n()
const { view, param, query } = useView()
const { data } = useDataset()
const shortlist = useShortlist()
const art = () => import('@/components/shortlist/art/ArtShortlist.vue')

// /compare/A-vs-B/: just those two, as their own page (one a student can't count both of).
const pair = computed(() => {
  const p = view.value === 'compare' ? pairFromSlug(param.value) : null
  return p && p.every((c) => data.value.subjects[c]) ? p : null
})
const cantBoth = computed(() => !!pair.value && isComparePair(data.value.subjects, pair.value[0], pair.value[1]))
const title = computed(() => (pair.value ? t.value('compare.pairTitle', { a: pair.value[0], b: pair.value[1] }) : t.value('shortlist.title')))

const saved = computed(() => shortlist.codes.value.filter((c) => data.value.subjects[c]))
// Subjects added just to compare: from a shared link's ?compare=, then the search.
const extra = shallowRef<string[]>(compareFromQuery(query.value.get('compare')).filter((c) => data.value.subjects[c]))
const asked = computed(() => (pair.value ? [...pair.value] : extra.value))
// A subject added to compare that isn't saved still gets its row, with a save button and an ×.
const codes = computed(() => (pair.value ? [...pair.value] : [...new Set([...saved.value, ...extra.value])]))
const droppable = computed(() => extra.value.filter((c) => !shortlist.codes.value.includes(c)))

// The address keeps the compared subjects, so it can be shared or reloaded as it is.
function keepInAddress(): void {
  const q = new URLSearchParams(location.search)
  if (extra.value.length) q.set('compare', extra.value.join(','))
  else q.delete('compare')
  const search = q.toString()
  history.replaceState(history.state, '', location.pathname + (search ? `?${search}` : '') + location.hash)
}
function addCompare(code: string): void {
  // On a two-subject page, a third one opens the full table with all three.
  if (pair.value) return go(`shortlist?compare=${[...pair.value, code].join(',')}`)
  if (codes.value.includes(code)) return
  extra.value = [...extra.value, code]
  keepInAddress()
}
function dropCompare(code: string): void {
  extra.value = extra.value.filter((c) => c !== code)
  keepInAddress()
}
</script>

<template>
  <div class="shortlist">
    <DetailHero :title="title" :art="art">
      <p v-if="pair" class="lede">{{ cantBoth ? t('compare.cantBoth') : t('compare.pairLede') }}</p>
      <p v-else class="lede">{{ t('shortlist.compareLede') }}<InfoTip :text="t('shortlist.local')" /></p>
    </DetailHero>

    <section id="compare-title" class="list surface" :aria-label="title">
      <div class="add-row">
        <SubjectSearch class="add-search" select compact :placeholder="t('shortlist.compareAdd')" @pick="addCompare" />
        <a v-if="!codes.length" class="add-browse" :href="link('subjects')">{{ t('shortlist.browseLink') }} →</a>
      </div>
      <SavedTable v-if="codes.length" :codes="codes" :highlight="asked" :droppable="droppable" @drop="dropCompare" />
    </section>

  </div>
</template>

<style scoped>
.shortlist {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-4);
  min-width: 0;
}

.lede {
  margin: 0;
  color: var(--ink-soft);
}

.list {
  min-width: 0;
  overflow: hidden;
  scroll-margin-top: 88px;
}

/* The search to add a subject, lined up with the table's left edge below it. */
.add-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-5);
  padding: var(--space-4) 16px var(--space-2);
}

/* Nothing to compare yet: the search alone, with even space above and below. */
.add-row:only-child {
  padding-bottom: var(--space-4);
}

.add-search {
  flex: 1 1 320px;
  max-width: 480px;
}

.add-browse {
  font-weight: var(--fw-semibold);
  white-space: nowrap;
}


@media (max-width: 640px) {
  .shortlist {
    gap: var(--space-4);
    padding-top: var(--space-3);
  }
}
</style>
