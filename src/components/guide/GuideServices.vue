<script setup lang="ts">
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import GuideServiceList from './GuideServiceList.vue'
import { GUIDE_TOPICS, type GuideCategory } from '@/utils/guideSections'
import { isServiceTopic } from '@/utils/guideServices'

// A guide category made only of service lists ("systems" and "life", see utils/guideSections).
const props = defineProps<{ category: GuideCategory }>()
const { t } = useI18n()
const topics = GUIDE_TOPICS[props.category].filter(isServiceTopic)
</script>

<template>
  <div class="list surface">
    <GuideItem
      v-for="(id, i) in topics"
      :id="id"
      :key="id"
      :title="t(`guide.svcTopic.${id}.title`)"
      :short="t(`guide.svcTopic.${id}.short`)"
      :open="i === 0"
    >
      <GuideServiceList :topic="id" />
    </GuideItem>
  </div>
</template>
