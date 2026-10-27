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
// The one service each page most wants remembered (shown large), per topic.
const PULL: Record<string, string> = { systems: 'email', wellbeing: 'caps' }
// A page with one long list (systems) lists each service in "On this page".
const tocEach = topics.length === 1
</script>

<template>
  <GuideItem v-for="id in topics" :id="id" :key="id" :title="t(`guide.svcTopic.${id}.title`)" :short="t(`guide.svcTopic.${id}.short`)">
    <GuideServiceList :topic="id" :pull="PULL[id]" :toc="tocEach" />
  </GuideItem>
</template>
