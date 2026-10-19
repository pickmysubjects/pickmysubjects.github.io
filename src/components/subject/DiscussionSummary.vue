<script setup lang="ts">
import { computed } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import type { DiscussionSummary } from '@/engine'
import { discussionLabels } from '@/i18n/discussion'
import { pickLocalized } from '@/i18n/localized'
import { useI18n } from '@/i18n'

/** What students say in public places: one short block per source, labelled, never scored, always linked. */
const props = defineProps<{ discussions: DiscussionSummary[] }>()
const { t, locale } = useI18n()
const blocks = computed(() => props.discussions.filter((d) => d.points.length).map((d) => ({ d, ...discussionLabels(t.value, d) })))
</script>

<template>
  <section v-if="blocks.length" class="discussion">
    <h2 class="discussion-title"><MessagesSquare :size="18" aria-hidden="true" /> {{ t('subject.discussTitle') }}</h2>
    <p class="discussion-note">{{ t('subject.discussNote') }}</p>
    <div v-for="b in blocks" :key="b.d.source" class="discussion-block">
      <h3 class="discussion-source">{{ b.source }}</h3>
      <ul class="discussion-points">
        <li v-for="(p, i) in b.d.points" :key="i">{{ pickLocalized(p, locale) }}</li>
      </ul>
      <a class="discussion-link" :href="b.d.url" target="_blank" rel="noopener nofollow">{{ b.read }}</a>
    </div>
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
  font-size: 0.9375rem;
  font-weight: 650;
}

.discussion-note {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.discussion-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.55;
}

.discussion-block {
  display: grid;
  gap: 6px;
}

.discussion-block + .discussion-block {
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.discussion-source {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.discussion-link {
  justify-self: start;
  font-size: 0.8125rem;
}
</style>
