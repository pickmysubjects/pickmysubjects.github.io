<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'
import { SERVICE_TOPICS, type GuideService, type ServiceTopic } from '@/utils/guideServices'

/**
 * One guide topic that is a list of official systems or services: a tile each with the name
 * (linked), one line, and ⓘ for more. `pull` marks the one service the page most wants a student
 * to remember; `toc` gives each tile an anchor and a line in "On this page".
 */
const props = defineProps<{ topic: ServiceTopic; pull?: string; toc?: boolean }>()
const { t } = useI18n()
const items = computed<readonly GuideService[]>(() => SERVICE_TOPICS[props.topic])
</script>

<template>
  <ul class="services">
    <li
      v-for="s in items"
      :id="toc ? `svc-${s.id}` : undefined"
      :key="s.id"
      class="service"
      :class="{ pulled: s.id === pull }"
      :data-toc="toc ? t(`guide.svc.${s.id}.name`) : undefined"
      :data-toc-sub="toc ? '' : undefined"
    >
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
  scroll-margin-top: 96px;
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

/* The page's key service: across the whole row, its line set large on an accent rule. */
.pulled {
  grid-column: 1 / -1;
  padding: 16px 20px 18px;
  border-color: transparent;
  border-left: 3px solid var(--accent-fill);
  border-radius: 4px 16px 16px 4px;
  background: var(--inset-fill);
}

.pulled .what {
  font-size: 1.125rem;
  font-weight: var(--fw-semibold);
  line-height: 1.5;
  color: var(--ink);
}
</style>
