<script setup lang="ts">
import { SKILLS, type Skill } from '@/engine'
import { useI18n } from '@/i18n'

const skills = defineModel<Partial<Record<Skill, number>>>('skills', { required: true })
const interests = defineModel<string[]>('interests', { required: true })
defineProps<{ topics: string[] }>()
const { t } = useI18n()

// Two tap-to-toggle groups instead of eleven 1–5 dropdowns: strong = 5, weak = 1.
const STRONG = 5
const WEAK = 1

function toggle(skill: Skill, level: number): void {
  const next = { ...skills.value }
  if (next[skill] === level) delete next[skill]
  else next[skill] = level
  skills.value = next
}

function toggleInterest(topic: string): void {
  interests.value = interests.value.includes(topic)
    ? interests.value.filter((x) => x !== topic)
    : [...interests.value, topic]
}
</script>

<template>
  <section class="skills" aria-labelledby="skills-title">
    <h2 id="skills-title" class="section-title">{{ t('record.strongAt') }}</h2>
    <div class="chips" role="group" :aria-label="t('record.strongAt')">
      <button
        v-for="s in SKILLS"
        :key="`s-${s}`"
        type="button"
        class="pick pick-strong"
        :aria-pressed="skills[s] === STRONG"
        @click="toggle(s, STRONG)"
      >
        {{ t(`skill.${s}`) }}
      </button>
    </div>

    <h2 class="section-title gap">{{ t('record.weakAt') }}</h2>
    <div class="chips" role="group" :aria-label="t('record.weakAt')">
      <button
        v-for="s in SKILLS"
        :key="`w-${s}`"
        type="button"
        class="pick pick-weak"
        :aria-pressed="skills[s] === WEAK"
        @click="toggle(s, WEAK)"
      >
        {{ t(`skill.${s}`) }}
      </button>
    </div>

    <h2 class="section-title gap">{{ t('record.interestsTitle') }}</h2>
    <div class="chips" role="group" :aria-label="t('record.interests')">
      <button
        v-for="topic in topics"
        :key="topic"
        type="button"
        class="pick pick-strong"
        :aria-pressed="interests.includes(topic)"
        @click="toggleInterest(topic)"
      >
        {{ t(`topic.${topic}`) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.section-title {
  margin-bottom: 12px;
  font-size: 1.05rem;
  font-weight: 650;
}

.gap {
  margin-top: 26px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pick {
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.pick:hover {
  border-color: var(--ink-faint);
}

.pick-strong[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.pick-weak[aria-pressed='true'] {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 600;
}

.hint {
  margin-top: 18px;
  font-size: 0.85rem;
  color: var(--ink-faint);
}
</style>
