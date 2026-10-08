<script setup lang="ts">
import { computed } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import type { DiscussionSummary } from '@/engine'
import { useI18n } from '@/i18n'

/** What students say on a public review site: clearly labelled, never scored, always linked. */
const props = defineProps<{ discussion: DiscussionSummary }>()
const { t, locale } = useI18n()
const chinese = computed(() => locale.value === 'zh-CN' || locale.value === 'zh-TW')
const years = computed(() =>
  props.discussion.from === props.discussion.to ? String(props.discussion.to) : `${props.discussion.from}–${props.discussion.to}`,
)
</script>

<template>
  <section class="discussion">
    <h2 class="discussion-title"><MessagesSquare :size="18" aria-hidden="true" /> {{ t('subject.discussTitle') }}</h2>
    <p class="discussion-note">{{ t('subject.discussNote') }}</p>
    <ul class="discussion-points">
      <li v-for="(p, i) in discussion.points" :key="i">{{ chinese ? p.zh : p.en }}</li>
    </ul>
    <p class="discussion-source">
      {{ t('subject.discussSource', { n: discussion.reviews, years, source: discussion.source }) }}
      · <a :href="discussion.url" target="_blank" rel="noopener nofollow">{{ t('subject.discussRead') }}</a>
    </p>
  </section>
</template>

<style scoped>
.discussion {
  display: grid;
  gap: 10px;
}

.discussion-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 650;
}

.discussion-note {
  font-size: 0.82rem;
  color: var(--ink-faint);
}

.discussion-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.55;
}

.discussion-source {
  font-size: 0.82rem;
  color: var(--ink-soft);
}
</style>
