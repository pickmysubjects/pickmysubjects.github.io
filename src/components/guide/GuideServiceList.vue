<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import InfoTip from '@/components/InfoTip.vue'
import { useI18n } from '@/i18n'
import { SERVICE_TOPICS, type GuideService, type ServiceTopic } from '@/utils/guideServices'

// One guide topic that is a list of official systems or services: name (linked), one line, ⓘ for more.
const props = defineProps<{ topic: ServiceTopic }>()
const { t } = useI18n()
const items = computed<readonly GuideService[]>(() => SERVICE_TOPICS[props.topic])
</script>

<template>
  <ul class="services">
    <li v-for="s in items" :key="s.id">
      <a class="ext" :href="s.href" target="_blank" rel="noopener"><strong>{{ t(`guide.svc.${s.id}.name`) }}</strong><ExternalLink :size="13" aria-hidden="true" /></a>
      <span class="what">{{ t(`guide.svc.${s.id}.text`) }}<InfoTip v-if="s.more" :text="t(`guide.svc.${s.id}.more`)" /></span>
    </li>
  </ul>
</template>

<style scoped>
.services {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.services li {
  display: grid;
  gap: 2px;
}

.what {
  color: var(--ink-soft);
}
</style>
