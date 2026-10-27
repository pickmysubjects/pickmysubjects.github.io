<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { GUIDE_CATEGORIES, type GuideCategory } from '@/utils/guideSections'

/** The guide's sections as a slim switch, the same look as the steps under "Me". */
const props = defineProps<{ current: GuideCategory | 'overview' }>()
const { t } = useI18n()
// When the sections don't fit (phones, narrow windows) the bar is one row that scrolls sideways:
// keep the current section in view, with faded edges hinting there is more.
const nav = useTemplateRef<HTMLElement>('nav')
async function reveal(): Promise<void> {
  await nextTick()
  const el = nav.value?.querySelector<HTMLElement>('[aria-current="page"]')
  if (el && nav.value) nav.value.scrollLeft = el.offsetLeft - (nav.value.clientWidth - el.offsetWidth) / 2
}
onMounted(reveal)
watch(() => props.current, reveal)
</script>

<template>
  <nav ref="nav" class="steps" :aria-label="t('guide.subnav')">
    <a class="step" :href="link('guide/')" :aria-current="current === 'overview' ? 'page' : undefined">{{ t('guide.overview') }}</a>
    <a
      v-for="c in GUIDE_CATEGORIES"
      :key="c"
      class="step"
      :href="link(`guide/${c}/`)"
      :aria-current="current === c ? 'page' : undefined"
    >{{ t(`guide.cat.${c}.nav`) }}</a>
  </nav>
</template>

<style scoped>
.steps {
  position: relative;
  display: flex;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  border: 1px solid var(--glass-edge);
  background: var(--seg-fill);
  box-shadow: var(--float-rim);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  /* Not a full capsule: on a phone the sections wrap onto two rows. 22px = pill radius + 3px padding. */
  border-radius: 22px;
}

.steps::-webkit-scrollbar {
  display: none;
}

.step {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 38px;
  padding: 6px 14px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
  white-space: nowrap;
  text-decoration: none;
  border-radius: 999px;
}

.step:hover {
  color: var(--ink);
}

.step[aria-current='page'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--pill-raised);
}

/* Phones: still one row, scrolling sideways, with the edges faded so the cut-off reads as "more". */
@media (max-width: 640px) {
  .steps {
    width: 100%;
    border-radius: 999px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
    scroll-padding-inline: 24px;
  }

  .step {
    min-height: 36px;
    padding: 5px 12px;
  }

  .step:first-child {
    margin-left: 10px;
  }

  .step:last-child {
    margin-right: 10px;
  }
}
</style>
