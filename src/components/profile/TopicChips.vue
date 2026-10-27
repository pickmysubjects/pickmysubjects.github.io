<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, Plus } from 'lucide-vue-next'
import { courseFocus } from '@/engine'
import { TOPIC_GROUPS } from '@/utils/topicGroups'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

/** Interest chips, grouped by area; only topics that some subject in the data covers. */
const interests = defineModel<string[]>({ required: true })
const props = defineProps<{ topics: string[]; firstGroups?: number }>()
const { t, locale } = useI18n()
const { data, course } = useDataset()

const groups = computed(() => {
  const known = new Set(props.topics)
  const grouped = new Set(TOPIC_GROUPS.flatMap((g) => g.topics as string[]))
  const byName = (a: string, b: string) => t.value(`topic.${a}`).localeCompare(t.value(`topic.${b}`), locale.value)
  const out = TOPIC_GROUPS.map((g) => ({ id: g.id, topics: (g.topics as string[]).filter((x) => known.has(x)).sort(byName) }))
  // A topic added to the schema but not to a group still shows up.
  const rest = props.topics.filter((x) => !grouped.has(x)).sort(byName)
  if (rest.length) out.push({ id: 'other', topics: rest })
  // Fields the student's own degree covers most come first.
  const weight = courseFocus(data.value, course.value).topics
  const size = (g: { topics: string[] }) => g.topics.reduce((n, x) => n + (weight.get(x) ?? 0), 0)
  return out.filter((g) => g.topics.length > 0).sort((a, b) => size(b) - size(a))
})

// Optionally only the first few fields (and any with a pick in them); the rest a tap away.
const showAll = shallowRef(false)
const shown = computed(() =>
  showAll.value || !props.firstGroups ? groups.value : groups.value.filter((g, i) => i < props.firstGroups! || g.topics.some((x) => interests.value.includes(x))),
)
const hidden = computed(() => groups.value.length - shown.value.length)

function toggle(topic: string): void {
  interests.value = interests.value.includes(topic) ? interests.value.filter((x) => x !== topic) : [...interests.value, topic]
}
</script>

<template>
  <div class="groups">
    <div v-for="g in shown" :key="g.id" class="group" role="group" :aria-label="t(`topicGroup.${g.id}`)">
      <h3 class="group-name">{{ t(`topicGroup.${g.id}`) }}</h3>
      <div class="chips">
        <button
          v-for="topic in g.topics"
          :key="topic"
          type="button"
          class="pick toggle-chip"
          :aria-pressed="interests.includes(topic)"
          @click="toggle(topic)"
        >
          <component :is="interests.includes(topic) ? Check : Plus" :size="15" :stroke-width="2.5" class="toggle-icon" aria-hidden="true" />
          {{ t(`topic.${topic}`) }}
        </button>
      </div>
    </div>
    <button v-if="firstGroups && (hidden > 0 || showAll)" type="button" class="more" @click="showAll = !showAll">
      {{ showAll ? t('record.fewerTopics') : t('record.moreTopics', { n: hidden }) }}
    </button>
  </div>
</template>

<style scoped>
.groups {
  display: grid;
  gap: 14px;
}

/* The field's name above its chips: long names ("Engineering, health & agriculture") never
   squeeze into a narrow column. */
.group {
  display: grid;
  gap: var(--space-2);
}

.group-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}


.more {
  justify-self: start;
  padding: 6px 0;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--overprint);
  background: none;
  border: 0;
  cursor: pointer;
}
</style>
