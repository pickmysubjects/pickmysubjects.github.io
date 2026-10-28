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
/* A low band: the title on the left, the page's scene across the right, fading out under the title. */
.hero {
  position: relative;
  display: grid;
  align-items: center;
  min-height: 150px;
  padding: 18px 36px;
  overflow: hidden;
}

.hero-text {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  gap: 8px;
  max-width: min(100%, 680px);
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
  font-size: clamp(1.5rem, 1.2rem + 1.1vw, 2.125rem);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  /* Chinese, Japanese, Korean: break at punctuation, not inside a word. */
  word-break: keep-all;
  overflow-wrap: anywhere;
}

/* The scene keeps its proportions, anchored bottom right; its left end fades to nothing, so
   nothing busy ever sits behind the words. */
.hero-art {
  position: absolute;
  top: 4px;
  right: 20px;
  bottom: 2px;
  width: min(58%, 640px);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);
  mask-image: linear-gradient(to right, transparent, #000 34%);
}

.hero-art > :deep(*) {
  width: 100%;
  height: 100%;
}

@media (max-width: 960px) {
  .hero-art {
    width: 52%;
  }
}

/* Phones: a shorter band; the scene smaller, still behind the right end only. */
@media (max-width: 640px) {
  .hero {
    min-height: 96px;
    padding: 14px 16px;
    border-radius: 20px;
  }

  .hero-text {
    gap: 4px;
    max-width: 72%;
  }

  .hero-art {
    top: 18px;
    right: 4px;
    width: 46%;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 45%);
    mask-image: linear-gradient(to right, transparent, #000 45%);
  }
}
</style>
