<script setup lang="ts">
import { trackEvent } from '@/utils/analytics'
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef } from 'vue'
import { Heart, Link2, Share2 } from 'lucide-vue-next'
import CompareTable from '@/components/shortlist/CompareTable.vue'
import ShortlistList from '@/components/shortlist/ShortlistList.vue'
import { COMPARE_MAX, compareFromQuery, useShortlist } from '@/composables/useShortlist'
import { link, replaceAddress, useView } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useI18n } from '@/i18n'

/** Saved subjects, and the ones picked from them compared side by side (kept in ?compare=). */
const { t } = useI18n()
const { query } = useView()
const { data } = useDataset()
const plan = usePlan()
const shortlist = useShortlist()
const year = computed(() => viewYear(plan.terms.value[0]?.year))

// Picked subjects live in the address, so a comparison can be shared as a link.
const picked = computed(() => compareFromQuery(query.value.get('compare')).filter((c) => data.value.subjects[c]))
function setPicked(codes: string[]): void {
  replaceAddress(codes.length ? `shortlist/?compare=${codes.join(',')}` : 'shortlist/')
}
function pick(code: string): void {
  const now = picked.value
  if (now.includes(code)) setPicked(now.filter((c) => c !== code))
  else if (now.length < COMPARE_MAX) {
    setPicked([...now, code])
    // Counted once, when the second subject opens the side-by-side table.
    if (now.length === 1) trackEvent('compare-open')
  }
}
function remove(code: string): void {
  shortlist.remove(code)
  if (picked.value.includes(code)) setPicked(picked.value.filter((c) => c !== code))
}
const saved = computed(() => shortlist.codes.value.filter((c) => data.value.subjects[c]))

const copied = shallowRef(false)
async function share(): Promise<void> {
  try {
    if (navigator.share) await navigator.share({ title: t.value('shortlist.compareTitle'), url: location.href })
    else {
      await navigator.clipboard.writeText(location.href)
      copied.value = true
      setTimeout(() => (copied.value = false), 2400)
    }
  } catch {
    // Cancelled or blocked: nothing to say.
  }
}
</script>

<template>
  <div class="shortlist">
    <header class="head">
      <h1 class="page-title">{{ t('shortlist.title') }}</h1>
    </header>

    <section v-if="picked.length >= 2" class="compare surface" aria-labelledby="compare-title">
      <div class="compare-bar">
        <h2 id="compare-title" class="sec-title">{{ t('shortlist.compareTitle') }}</h2>
        <span class="compare-actions">
          <button type="button" class="button button-quiet" @click="share">
            <component :is="copied ? Link2 : Share2" :size="16" aria-hidden="true" /> {{ copied ? t('shortlist.copied') : t('shortlist.copyLink') }}
          </button>
          <button type="button" class="button button-quiet" @click="setPicked([])">{{ t('shortlist.close') }}</button>
        </span>
      </div>
      <CompareTable :codes="picked" />
    </section>

    <section v-if="saved.length" class="saved surface">
      <div class="saved-bar">
        <p class="hint" role="status">
          {{ picked.length >= COMPARE_MAX ? t('shortlist.full') : picked.length >= 2 ? t('shortlist.compare', { n: picked.length }) : t('shortlist.pickHint') }}
        </p>
        <button v-if="picked.length" type="button" class="link-button" @click="setPicked([])">{{ t('shortlist.clearPick') }}</button>
      </div>
      <ShortlistList :codes="saved" :picked="picked" :max="COMPARE_MAX" :year="year" @pick="pick" @remove="remove" />
    </section>

    <section v-else class="empty surface">
      <Heart :size="28" aria-hidden="true" class="empty-icon" />
      <p>{{ t('shortlist.empty') }}</p>
      <a class="button button-accent" :href="link('subjects')">{{ t('shortlist.browseLink') }}</a>
    </section>

    <p class="local">{{ t('shortlist.localShort') }}<InfoTip :text="t('shortlist.local')" /></p>
  </div>
</template>

<style scoped>
.shortlist {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--page-top);
  min-width: 0;
}

.compare {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
}

.compare-bar,
.saved-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.compare-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sec-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.saved {
  min-width: 0;
  overflow: hidden;
}

.saved-bar {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line);
  background: var(--inset-fill);
}

.hint {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 550;
  color: var(--ink-soft);
}

.link-button {
  padding: 6px 4px;
  border: 0;
  background: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.empty {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-5);
  color: var(--ink-soft);
}

.empty-icon {
  color: var(--accent);
}

.local {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

@media (max-width: 720px) {
  .compare {
    padding: var(--space-4) var(--space-3);
  }
}
</style>
