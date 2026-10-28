<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'
import type { GuideService } from '@/utils/guideServices'
import GuideCallout from './GuideCallout.vue'
import GuideSee from './GuideSee.vue'

/**
 * One official system or service as a short section of its own: its icon and name, what it is,
 * what you do there, the one thing to know the first time, and the official page. `toc` lists it
 * in "On this page" under its topic.
 */
const props = defineProps<{ service: GuideService; toc?: boolean }>()
const { t } = useI18n()
const s = computed(() => props.service)
const key = (field: string) => `guide.svc.${s.value.id}.${field}`
const does = computed(() => Array.from({ length: s.value.section?.does ?? 0 }, (_, i) => t.value(key(`does.${i}`))))
</script>

<template>
  <section :id="`svc-${s.id}`" class="svc" :aria-labelledby="`svc-${s.id}-name`" :data-toc="toc ? t(key('name')) : undefined" :data-toc-sub="toc ? '' : undefined">
    <header class="svc-head">
      <span class="svc-icon" aria-hidden="true"><component :is="s.section?.icon" :size="20" /></span>
      <h3 :id="`svc-${s.id}-name`" class="svc-name">{{ t(key('name')) }}</h3>
      <p class="svc-what">{{ t(key('text')) }}<InfoTip v-if="s.more" :text="t(key('more'))" /></p>
    </header>
    <ul v-if="does.length" class="plain svc-does">
      <li v-for="(d, i) in does" :key="i">{{ d }}</li>
    </ul>
    <GuideCallout v-if="s.section?.tip" :kind="s.key ? 'pull' : 'tip'">{{ t(key('tip')) }}</GuideCallout>
    <p class="svc-links">
      <a class="ext" :href="s.href" target="_blank" rel="noopener">{{ t('guide.svcLink', { name: t(key('name')) }) }}<ExternalLink :size="13" aria-hidden="true" /></a>
      <GuideSee v-if="s.see" :to="s.see" />
    </p>
  </section>
</template>

<style scoped>
.svc {
  display: grid;
  gap: 14px;
  min-width: 0;
  scroll-margin-top: 96px;
}

/* A thin rule between sections of one topic. */
.svc + .svc {
  padding-top: 24px;
  border-top: 1px solid var(--divider);
}

/* The icon tile beside the name; the line under the name lines up with the name. */
.svc-head {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 14px;
  row-gap: 2px;
  align-items: center;
}

.svc-icon {
  display: grid;
  grid-row: span 2;
  align-self: start;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-fill) 12%, var(--tile-fill));
}

.svc-name {
  font-size: 1.125rem;
  font-weight: var(--fw-bold);
  line-height: 1.3;
}

.svc-what {
  color: var(--ink-soft);
  line-height: 1.55;
}

.svc-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  font-size: var(--fs-small);
}

@media (max-width: 640px) {
  .svc + .svc {
    padding-top: 20px;
  }

  .svc-head {
    grid-template-columns: 36px minmax(0, 1fr);
    column-gap: 12px;
  }

  .svc-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
}
</style>
