<script setup lang="ts">
import { computed } from 'vue'
import type { Subject } from '@/engine'
import { useI18n } from '@/i18n'
import { summariseAssessment } from '@/utils/assessment'

/** The gist of a subject: what it's about, what you can do after it, and what you'll be doing. */
const props = defineProps<{ subject: Subject }>()
const { t, locale } = useI18n()
const chinese = computed(() => locale.value === 'zh-CN' || locale.value === 'zh-TW')
const about = computed(() => props.subject.about)
const pick = (x: { en: string; zh: string }) => (chinese.value ? x.zh : x.en)
// "What you do" straight from the assessment: the parts by weight.
const work = computed(() =>
  (summariseAssessment(props.subject.assessment)?.parts ?? []).map((p) => `${t.value(`assess.kind.${p.kind}`)} ${p.weight}%`).join(' · '),
)
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
    <div v-if="work" class="about-row">
      <h2 class="about-label">{{ t('subject.aboutWork') }}</h2>
      <p class="about-work">{{ work }}</p>
    </div>
  </section>
</template>

<style scoped>
.about {
  display: grid;
  gap: 14px;
}

.about-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 4px 16px;
  align-items: baseline;
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

.about-work {
  margin: 0;
  font-size: 0.9375rem;
}

@media (max-width: 560px) {
  .about-row {
    grid-template-columns: 1fr;
  }
}
</style>
