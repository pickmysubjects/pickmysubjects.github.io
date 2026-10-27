<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, type Component } from 'vue'
import { ArrowLeft, Check, Link } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { GUIDE_CHECKED, GUIDE_TAGS, type GuidePageSlug } from '@/utils/guideSections'
import { KEY_DATES_CHECKED } from '@/utils/keyDates'

/**
 * The top of every guide page: a wide glass band with the title and a short lede on one side and
 * the section's own illustration on the other, then a meta row (when the facts were last checked,
 * two or three tags that jump to the topics students come for, and a copy-link button).
 * The overview has no back link and no tags.
 */
const props = defineProps<{ slug: GuidePageSlug | null; title: string; lede: string; full?: string }>()
const { t, locale } = useI18n()

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
const tags = computed(() => (props.slug ? GUIDE_TAGS[props.slug] : []))

const checked = computed(() => {
  const d = new Date(`${props.slug === 'key-dates' ? KEY_DATES_CHECKED : GUIDE_CHECKED}T00:00:00Z`)
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-AU' : locale.value, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d)
})

const copied = shallowRef(false)
let timer = 0
async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(location.origin + location.pathname)
    copied.value = true
    clearTimeout(timer)
    timer = window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    // No clipboard (an old browser or a blocked permission): the address bar still has the link.
  }
}
</script>

<template>
  <header class="hero surface">
    <div class="hero-text">
      <a v-if="slug" class="hero-back" :href="link('guide/')"><ArrowLeft :size="15" aria-hidden="true" />{{ t('guide.nav') }}</a>
      <p v-else class="hero-back hero-eyebrow">{{ t('guide.nav') }}</p>
      <h1 class="hero-title">{{ title }}</h1>
      <p class="hero-lede">{{ lede }}<InfoTip v-if="full" :text="full" /></p>
      <div class="hero-meta">
        <span class="meta-date">{{ t('guide.updated', { date: checked }) }}</span>
        <ul v-if="tags.length" class="meta-tags">
          <li v-for="tag in tags" :key="tag.key">
            <a v-if="tag.anchor" class="tag" :href="`#${tag.anchor}`">{{ t(tag.key) }}</a>
            <span v-else class="tag">{{ t(tag.key) }}</span>
          </li>
        </ul>
        <button type="button" class="meta-copy" @click="copy">
          <component :is="copied ? Check : Link" :size="14" aria-hidden="true" />
          <span aria-live="polite">{{ copied ? t('shortlist.copied') : t('shortlist.copyLink') }}</span>
        </button>
      </div>
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

.hero-lede {
  max-width: 52ch;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ink-soft);
  text-wrap: pretty;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 6px;
  font-size: var(--fs-meta);
  color: var(--ink-faint);
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 3px 11px;
  font-weight: var(--fw-medium);
  color: var(--ink-soft);
  text-decoration: none;
  border: 1px solid var(--card-edge);
  border-radius: 999px;
  background: var(--tile-fill);
}

a.tag:hover {
  color: var(--accent);
  background: var(--glass-fill-hover);
}

.meta-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 11px;
  font-size: var(--fs-meta);
  font-weight: var(--fw-medium);
  color: var(--accent);
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
}

.meta-copy:hover {
  background: var(--glass-fill-hover);
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

  .hero-lede {
    font-size: 1rem;
  }
}
</style>
