<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { link } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { GUIDE_CATEGORIES, type GuideCategory } from '@/utils/guideSections'

/** The guide's sections as a slim switch, the same look as the steps under "Me". */
const props = defineProps<{ current: GuideCategory | 'overview' }>()
const { t } = useI18n()
// On a phone the bar scrolls sideways: keep the current section in view.
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
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  border-radius: 12px;
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
  border-radius: 9px;
}

.step:hover {
  color: var(--ink);
}

.step[aria-current='page'] {
  font-weight: 650;
  color: var(--ink);
  background: var(--glass-fill-hover);
  box-shadow: var(--glass-shadow);
}

@media (max-width: 420px) {
  .step {
    padding: 6px 10px;
  }
}
</style>
