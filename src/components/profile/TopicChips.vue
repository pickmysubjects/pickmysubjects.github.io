<script setup lang="ts">
import { computed } from 'vue'
import { TOPIC_GROUPS } from '@/utils/topicGroups'
import { useI18n } from '@/i18n'

/** Interest chips, grouped by area; only topics that some subject in the data covers. */
const interests = defineModel<string[]>({ required: true })
const props = defineProps<{ topics: string[] }>()
const { t, locale } = useI18n()

const groups = computed(() => {
  const known = new Set(props.topics)
  const grouped = new Set(TOPIC_GROUPS.flatMap((g) => g.topics as string[]))
  const byName = (a: string, b: string) => t.value(`topic.${a}`).localeCompare(t.value(`topic.${b}`), locale.value)
  const out = TOPIC_GROUPS.map((g) => ({ id: g.id, topics: (g.topics as string[]).filter((x) => known.has(x)).sort(byName) }))
  // A topic added to the schema but not to a group still shows up.
  const rest = props.topics.filter((x) => !grouped.has(x)).sort(byName)
  if (rest.length) out.push({ id: 'other', topics: rest })
  return out.filter((g) => g.topics.length > 0)
})

function toggle(topic: string): void {
  interests.value = interests.value.includes(topic) ? interests.value.filter((x) => x !== topic) : [...interests.value, topic]
}
</script>

<template>
  <div class="groups">
    <div v-for="g in groups" :key="g.id" class="group" role="group" :aria-label="t(`topicGroup.${g.id}`)">
      <h3 class="group-name">{{ t(`topicGroup.${g.id}`) }}</h3>
      <div class="chips">
        <button
          v-for="topic in g.topics"
          :key="topic"
          type="button"
          class="pick"
          :aria-pressed="interests.includes(topic)"
          @click="toggle(topic)"
        >
          {{ t(`topic.${topic}`) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups {
  display: grid;
  gap: 14px;
}

.group {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  gap: 8px 14px;
  align-items: start;
}

.group-name {
  padding-top: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pick {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  font: inherit;
  font-size: 0.875rem;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pick:hover {
  border-color: var(--ink-faint);
}

.pick[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 640px) {
  .group {
    grid-template-columns: 1fr;
  }

  .group-name {
    padding-top: 0;
  }
}
</style>
