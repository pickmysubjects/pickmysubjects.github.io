<script setup lang="ts">
import { SKILLS, type Skill } from '@/engine'
import { useI18n } from '@/i18n'

const skills = defineModel<Partial<Record<Skill, number>>>('skills', { required: true })
const { t } = useI18n()

// One row per skill with two toggles instead of eleven 1–5 dropdowns: strong = 5, weak = 1.
const STRONG = 5
const WEAK = 1

function toggle(skill: Skill, level: number): void {
  const next = { ...skills.value }
  if (next[skill] === level) delete next[skill]
  else next[skill] = level
  skills.value = next
}
</script>

<template>
  <section class="card surface" aria-labelledby="skills-title">
    <header class="card-head">
      <h2 id="skills-title" class="card-title">{{ t('record.skillsTitle') }}</h2>
      <p class="card-hint">{{ t('record.skillsHint') }}</p>
    </header>
    <ul class="skill-list">
      <li v-for="s in SKILLS" :key="s" class="skill">
        <span class="skill-name">{{ t(`skill.${s}`) }}</span>
        <span class="skill-toggles" role="group" :aria-label="t(`skill.${s}`)">
          <button type="button" class="toggle toggle-good" :aria-pressed="skills[s] === STRONG" @click="toggle(s, STRONG)">
            {{ t('record.good') }}
          </button>
          <button type="button" class="toggle toggle-hard" :aria-pressed="skills[s] === WEAK" @click="toggle(s, WEAK)">
            {{ t('record.harder') }}
          </button>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 650;
}

.card-hint {
  margin-top: 4px;
  font-size: 0.88rem;
  color: var(--ink-soft);
}

.skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--line);
  font-size: 0.92rem;
}

.skill-toggles {
  display: flex;
  gap: 4px;
  flex: none;
}

.toggle {
  padding: 3px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  font: inherit;
  font-size: 0.78rem;
  color: var(--ink-soft);
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--ink-faint);
}

.toggle-good[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.toggle-hard[aria-pressed='true'] {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 600;
}
</style>
