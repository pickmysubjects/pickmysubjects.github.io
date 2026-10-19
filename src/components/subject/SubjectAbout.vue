<script setup lang="ts">
import { computed } from 'vue'
import type { Localized, Subject } from '@/engine'
import { pickLocalized } from '@/i18n/localized'
import { useI18n } from '@/i18n'

/** The gist of a subject: what it's about and what you can do after it (the assessment has its own panel). */
const props = defineProps<{ subject: Subject }>()
const { t, locale } = useI18n()
const about = computed(() => props.subject.about)
const pick = (x: Localized) => pickLocalized(x, locale.value)
</script>

<template>
  <section v-if="about" class="about">
    <div class="about-row">
      <h2 class="about-label">{{ t('subject.aboutLearn') }}</h2>
      <p class="about-learn">{{ pick(about.learn) }}</p>
    </div>
    <div class="about-row">
      <h2 class="about-label">{{ t('subject.aboutOutcomes') }}</h2>
      <ul class="about-list">
        <li v-for="(o, i) in about.outcomes" :key="i">{{ pick(o) }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.about {
  /* One grid for both rows, so the text lines up after the longest label in any language. */
  display: grid;
  grid-template-columns: minmax(96px, max-content) minmax(0, 1fr);
  gap: 14px 16px;
  align-items: baseline;
}

.about-row {
  display: contents;
}

.about-label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.about-learn {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.55;
}

.about-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  font-size: 0.9375rem;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .about {
    grid-template-columns: 1fr;
    row-gap: 4px;
  }

  .about-label:not(:first-child) {
    margin-top: 10px;
  }
}
</style>
