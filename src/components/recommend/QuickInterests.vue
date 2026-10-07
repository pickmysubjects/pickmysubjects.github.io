<script setup lang="ts">
import { computed } from 'vue'
import Interp from '@/components/Interp.vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/** First visit: a couple of taps on interests is enough to get real suggestions. */
defineProps<{ count: number }>()
const { topics } = useDataset()
const { profile, setInterests } = useProfile()
const { t, locale } = useI18n()

const sorted = computed(() =>
  [...topics.value].sort((a, b) => t.value(`topic.${a}`).localeCompare(t.value(`topic.${b}`), locale.value)),
)

// On a phone the list starts below the chips, out of sight.
function scrollToList(): void {
  document.getElementById('suggestions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggle(topic: string): void {
  const current = profile.value.interests
  setInterests(current.includes(topic) ? current.filter((x) => x !== topic) : [...current, topic])
}
</script>

<template>
  <section class="quick surface">
    <h2 class="quick-title">{{ t('record.interestsTitle') }}</h2>
    <p class="quick-hint">
      <Interp :text="t('suggest.quickHint')">
        <template #link>
          <a href="#/record">{{ t('nav.record') }}</a>
        </template>
      </Interp>
    </p>
    <div class="quick-chips" role="group" :aria-label="t('record.interests')">
      <button
        v-for="topic in sorted"
        :key="topic"
        type="button"
        class="chip quick-chip"
        :aria-pressed="profile.interests.includes(topic)"
        @click="toggle(topic)"
      >
        {{ t(`topic.${topic}`) }}
      </button>
    </div>
    <button v-if="count > 0 && profile.interests.length > 0" class="quick-below" type="button" @click="scrollToList">
      {{ t('suggest.below', { n: count }) }}
    </button>
  </section>
</template>

<style scoped>
.quick {
  display: grid;
  gap: 10px;
  padding: 20px 22px;
}

.quick-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.quick-hint {
  font-size: 0.92rem;
  color: var(--ink-soft);
}

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-chip {
  color: var(--ink);
  cursor: pointer;
}

.quick-chip:hover {
  border-color: var(--accent);
}

.quick-chip[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
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
