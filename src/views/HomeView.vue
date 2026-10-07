<script setup lang="ts">
import { computed } from 'vue'
import { Route, Sparkles } from 'lucide-vue-next'
import SubjectSearch from '@/components/SubjectSearch.vue'
import DataNotice from '@/components/DataNotice.vue'
import HeroPreview from '@/components/home/HeroPreview.vue'
import BentoFeatures from '@/components/home/BentoFeatures.vue'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'
import { exampleSubjects } from '@/utils/showcase'

const { t } = useI18n()
const { subjectList } = useDataset()

const examples = computed(() => exampleSubjects(subjectList.value, 3).map((s) => s.code))

function focusSearch(): void {
  const input = document.querySelector<HTMLInputElement>('.stage .search-input')
  input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  input?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="home">
    <section class="stage">
      <div class="stage-copy">
        <p class="eyebrow stage-eyebrow">{{ t('home.eyebrow') }}</p>
        <h1 class="stage-title">{{ t('home.title') }}</h1>
        <p class="stage-lede">{{ t('home.lede') }}</p>
        <SubjectSearch class="stage-search" />
        <p v-if="examples.length" class="stage-try">
          {{ t('home.tryLabel') }}
          <a v-for="c in examples" :key="c" class="try-chip code" :href="`#/subject/${c}`">{{ c }}</a>
        </p>
        <p class="stage-cta">
          <a class="button button-accent" href="#/plan"><Route :size="18" aria-hidden="true" /> {{ t('home.cardPlan') }}</a>
          <a class="button button-quiet" href="#/recommend"><Sparkles :size="18" aria-hidden="true" /> {{ t('home.cardForYou') }}</a>
        </p>
      </div>
      <HeroPreview class="stage-art" />
    </section>

    <DataNotice />

    <BentoFeatures @search="focusSearch" />
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 28px;
  padding-top: 24px;
}

/* A rounded "stage" with a soft gradient mesh, like a product hero. */
.stage {
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  align-items: center;
  gap: 24px;
  padding: 64px 56px;
  border-radius: 36px;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(60% 80% at 0% 0%, #ffd6e8 0%, transparent 60%),
    radial-gradient(55% 70% at 100% 10%, #dcd8ff 0%, transparent 60%),
    radial-gradient(60% 80% at 80% 100%, #ffe6d2 0%, transparent 60%),
    linear-gradient(180deg, #fff7fb, #f6f4ff);
  border: 1px solid rgb(255 255 255 / 80%);
  box-shadow: 0 40px 80px -40px rgb(90 30 90 / 30%);
}

@media (prefers-color-scheme: dark) {
  .stage {
    background:
      radial-gradient(60% 80% at 0% 0%, #4a1a3a 0%, transparent 60%),
      radial-gradient(55% 70% at 100% 10%, #24255a 0%, transparent 60%),
      radial-gradient(60% 80% at 80% 100%, #3d2617 0%, transparent 60%),
      linear-gradient(180deg, #17121a, #121320);
    border-color: rgb(255 255 255 / 8%);
  }
}

.stage-copy {
  display: grid;
  gap: 18px;
}

.stage-eyebrow {
  color: var(--accent);
}

.stage-title {
  font-size: clamp(2.4rem, 5.2vw, 4.2rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.02;
}

.stage-lede {
  max-width: 46ch;
  font-size: 1.1rem;
  color: var(--ink-soft);
}

.stage-search {
  max-width: 520px;
  margin-top: 6px;
}

.stage-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.stage-try {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--ink-faint);
}

.try-chip {
  padding: 4px 11px;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 80%);
  background: rgb(255 255 255 / 55%);
  backdrop-filter: blur(8px);
  font-size: 0.8rem;
  color: var(--ink);
  text-decoration: none;
}

.try-chip:hover {
  color: var(--accent);
}

@media (max-width: 860px) {
  .stage {
    grid-template-columns: 1fr;
    padding: 36px 22px 24px;
    border-radius: 28px;
  }
}
</style>
