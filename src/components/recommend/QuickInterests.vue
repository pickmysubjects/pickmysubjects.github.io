<script setup lang="ts">
import { link } from '@/composables/useView'
import Interp from '@/components/Interp.vue'
import TopicChips from '@/components/profile/TopicChips.vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** First visit: a couple of taps on interests is enough to get real suggestions. */
defineProps<{ count: number }>()
const { topics } = useDataset()
const { profile, setInterests } = useProfile()
const { t } = useI18n()

// On a phone the list starts below the chips, out of sight.
function scrollToList(): void {
  document.getElementById('suggestions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="quick surface">
    <h2 class="quick-title">{{ t('record.interestsTitle') }}</h2>
    <p class="quick-hint">
      <Interp :text="t('suggest.quickHint')">
        <template #link>
          <a :href="link('record')">{{ t('nav.record') }}</a>
        </template>
      </Interp>
    </p>
    <TopicChips :model-value="profile.interests" :topics="topics" @update:model-value="setInterests" />
    <button v-if="count > 0 && profile.interests.length > 0" class="quick-below" type="button" @click="scrollToList">
      {{ t('suggest.below', { n: count }) }}
    </button>
  </section>
</template>

<style scoped>
.quick {
  display: grid;
  gap: 14px;
  padding: 22px 24px;
}

.quick-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.quick-hint {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.quick-below {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
</style>
