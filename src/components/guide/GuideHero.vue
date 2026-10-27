<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import type { GuidePageSlug } from '@/utils/guideSections'

/**
 * The top of every guide page: a wide glass band with the title on one side and the section's
 * own illustration on the other. The overview has no back link.
 */
const props = defineProps<{ slug: GuidePageSlug | null; title: string }>()
const { t } = useI18n()

// Each illustration is its own small chunk, loaded with the page that shows it.
const ART: Record<GuidePageSlug | 'overview', () => Promise<Component>> = {
  overview: () => import('./art/ArtOverview.vue'),
  basics: () => import('./art/ArtBasics.vue'),
  systems: () => import('./art/ArtSystems.vue'),
  enrolling: () => import('./art/ArtEnrolling.vue'),
  semester: () => import('./art/ArtSemester.vue'),
  life: () => import('./art/ArtLife.vue'),
  international: () => import('./art/ArtInternational.vue'),
  help: () => import('./art/ArtHelp.vue'),
  'key-dates': () => import('./art/ArtKeyDates.vue'),
}
const art = computed(() => defineAsyncComponent(ART[props.slug ?? 'overview']))
</script>

<template>
  <header class="hero surface">
    <div class="hero-text">
      <a v-if="slug" class="hero-back" :href="link('guide/')"><ArrowLeft :size="15" aria-hidden="true" />{{ t('guide.nav') }}</a>
      <p v-else class="hero-back hero-eyebrow">{{ t('guide.nav') }}</p>
      <h1 class="hero-title">{{ title }}</h1>
    </div>
    <div class="hero-art" aria-hidden="true">
      <component :is="art" />
    </div>
  </header>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
  align-items: center;
  gap: 32px;
  padding: 32px 40px 32px 48px;
  overflow: hidden;
}

.hero-text {
  display: grid;
  align-content: center;
  gap: 14px;
  min-width: 0;
}

.hero-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--accent);
  text-decoration: none;
}

a.hero-back:hover {
  text-decoration: underline;
}

.hero-eyebrow {
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hero-title {
  font-size: clamp(1.75rem, 1.35rem + 1.5vw, 2.5rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  /* Chinese, Japanese, Korean: break at punctuation, not inside a word. */
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.hero-art {
  position: relative;
  align-self: stretch;
  display: grid;
  place-items: center;
  min-height: 200px;
}

.hero-art > :deep(*) {
  width: 100%;
  max-width: 360px;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 280px);
    gap: 20px;
    padding: 32px 28px;
  }
}

/* Phones: the picture on top, smaller, then the words. */
@media (max-width: 640px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 8px;
    min-height: 0;
    padding: 20px 20px 22px;
    border-radius: 24px;
  }

  .hero-art {
    order: -1;
    min-height: 0;
    margin: -8px auto -4px;
    width: min(100%, 230px);
  }

  .hero-text {
    gap: 10px;
  }
}
</style>
