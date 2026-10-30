<script setup lang="ts">
import { computed } from 'vue'
import { MessagesSquare } from 'lucide-vue-next'
import { DISCUSSION_SECTIONS, type DiscussionSummary } from '@/engine'
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
    <!-- Inside "What students say": each source's own line is the heading, no second title. -->
    <div v-for="b in blocks" :key="b.d.source" class="discussion-block">
      <h3 class="discussion-source"><MessagesSquare :size="16" aria-hidden="true" /> {{ b.source }}</h3>
      <template v-if="b.d.sections">
        <template v-for="k in DISCUSSION_SECTIONS" :key="k">
          <div v-if="b.d.sections[k]" class="discussion-part">
            <h4 class="discussion-part-label">{{ t(`subject.discussPart.${k}`) }}</h4>
            <ul class="discussion-points">
              <li v-for="(p, i) in b.d.sections[k]" :key="i">{{ pickLocalized(p, locale) }}</li>
            </ul>
          </div>
        </template>
      </template>
      <ul v-else class="discussion-points">
        <li v-for="(p, i) in b.d.points" :key="i">{{ pickLocalized(p, locale) }}</li>
      </ul>
      <a class="discussion-link" :href="b.d.url" target="_blank" rel="noopener nofollow">{{ b.read }}</a>
    </div>
    <p class="discussion-note">{{ t('subject.discussNote') }}</p>
  </section>
</template>

<style scoped>
.discussion {
  display: grid;
  gap: 10px;
}

.discussion-note {
  font-size: var(--fs-small);
  color: var(--ink-soft);
}

.discussion-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  line-height: 1.55;
}

.discussion-part {
  display: grid;
  gap: 4px;
}

.discussion-part-label {
  margin: 4px 0 0;
  font-size: var(--fs-small);
  font-weight: 600;
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--ink-soft);
}

.discussion-link {
  justify-self: start;
  font-size: var(--fs-small);
}
</style>
