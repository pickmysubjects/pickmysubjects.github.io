<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed } from 'vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import SavedTable from '@/components/shortlist/SavedTable.vue'
import PairLearn from '@/components/shortlist/PairLearn.vue'
import { compareFromQuery, useShortlist } from '@/composables/useShortlist'
import { link, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { isComparePair, pairFromSlug } from '@/engine/comparePairs'

/**
 * Saved subjects, and the comparison of them: one table, a row per saved subject. An old compare
 * link (?compare=A,B,C, or #compare-title from the menu) opens the same table with those first.
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
const asked = computed(() => (pair.value ? [...pair.value] : compareFromQuery(query.value.get('compare')).filter((c) => data.value.subjects[c])))
// A subject from a shared compare link that isn't saved here still gets its row, with a save button.
const codes = computed(() => (pair.value ? [...pair.value] : [...new Set([...saved.value, ...asked.value])]))
</script>

<template>
  <div class="shortlist">
    <DetailHero :title="title" :art="art">
      <p v-if="pair" class="lede">{{ cantBoth ? t('compare.cantBoth') : t('compare.pairLede') }}</p>
      <p v-else-if="codes.length" class="lede">{{ t('shortlist.lede') }}<InfoTip :text="t('shortlist.local')" /></p>
    </DetailHero>

    <section v-if="codes.length" id="compare-title" class="list surface" :aria-label="title">
      <SavedTable :codes="codes" :highlight="asked" />
    </section>

    <PairLearn v-if="pair" :a="pair[0]" :b="pair[1]" />

    <section v-else class="empty surface">
      <p>{{ t('shortlist.empty') }}</p>
      <a class="button button-accent" :href="link('subjects')">{{ t('shortlist.browseLink') }}</a>
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

.empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3) var(--space-5);
  padding: var(--space-5);
}

.empty p {
  margin: 0;
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  .shortlist {
    gap: var(--space-4);
    padding-top: var(--space-3);
  }

  .empty {
    padding: var(--space-4);
  }
}
</style>
