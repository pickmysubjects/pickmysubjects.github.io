<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'
import { SERVICE_TOPICS, type GuideService, type ServiceTopic } from '@/utils/guideServices'
import GuideServiceSection from './GuideServiceSection.vue'

/**
 * One guide topic that is a list of official systems or services: first the ones with a section
 * of their own, then a tile each for the rest (the name, linked, one line, and ⓘ for more).
 * `toc` lists each section in "On this page".
 */
const props = defineProps<{ topic: ServiceTopic; toc?: boolean }>()
const { t } = useI18n()
const items = computed<readonly GuideService[]>(() => SERVICE_TOPICS[props.topic])
const sections = computed(() => items.value.filter((s) => s.section))
const tiles = computed(() => items.value.filter((s) => !s.section))
</script>

<template>
  <GuideServiceSection v-for="s in sections" :key="s.id" :service="s" :toc="toc" />
  <ul v-if="tiles.length" class="services">
    <li v-for="s in tiles" :key="s.id" class="service">
      <a class="name" :href="s.href" target="_blank" rel="noopener">{{ t(`guide.svc.${s.id}.name`) }}<ExternalLink :size="13" aria-hidden="true" class="name-icon" /></a>
      <p class="what">{{ t(`guide.svc.${s.id}.text`) }}<InfoTip v-if="s.more" :text="t(`guide.svc.${s.id}.more`)" /></p>
    </li>
  </ul>
</template>

<style scoped>
.services {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.service {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 14px 16px 16px;
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  background: var(--tile-fill);
}

/* Tiles after a section: a little air above them. */
.svc + .services {
  margin-top: 8px;
}

.name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-weight: var(--fw-bold);
  line-height: 1.35;
  color: var(--accent);
  text-decoration: none;
}

.name:hover {
  text-decoration: underline;
}

.name-icon {
  flex: none;
  opacity: 0.75;
}

.what {
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink-soft);
}
</style>
