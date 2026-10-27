<script setup lang="ts">
import { useI18n } from '@/i18n'
import GuideItem from './GuideItem.vue'
import GuideServiceList from './GuideServiceList.vue'
import { GUIDE_TOPICS, type GuideCategory } from '@/utils/guideSections'
import { isServiceTopic, SYSTEM_TOPICS } from '@/utils/guideServices'

// A guide category made only of service lists ("systems" and "life", see utils/guideSections).
const props = defineProps<{ category: GuideCategory }>()
const { t } = useI18n()
const topics = GUIDE_TOPICS[props.category].filter(isServiceTopic)
// Each system is a section a student looks for by name, so each gets its line in "On this page".
const tocEach = (id: string) => (SYSTEM_TOPICS as readonly string[]).includes(id)
</script>

<template>
  <GuideItem v-for="id in topics" :id="id" :key="id" :title="t(`guide.svcTopic.${id}.title`)" :short="t(`guide.svcTopic.${id}.short`)">
    <GuideServiceList :topic="id" :toc="tocEach(id)" />
  </GuideItem>
</template>
