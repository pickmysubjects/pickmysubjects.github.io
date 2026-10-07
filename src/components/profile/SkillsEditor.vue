<script setup lang="ts">
import { SKILLS, type Skill } from '@/engine'

const skills = defineModel<Partial<Record<Skill, number>>>('skills', { required: true })
const interests = defineModel<string[]>('interests', { required: true })
defineProps<{ topics: string[] }>()

const names: Record<Skill, string> = {
  programming: 'Programming',
  algorithms: 'Algorithms',
  maths: 'Maths',
  statistics: 'Statistics',
  data: 'Working with data',
  systems: 'Computer systems',
  writing: 'Essay writing',
  presentation: 'Presenting',
  lab: 'Lab work',
  design: 'Design',
  business: 'Business',
}

function setSkill(skill: Skill, raw: string): void {
  const next = { ...skills.value }
  if (raw === '') delete next[skill]
  else next[skill] = Number(raw)
  skills.value = next
}

function toggle(topic: string): void {
  interests.value = interests.value.includes(topic)
    ? interests.value.filter((t) => t !== topic)
    : [...interests.value, topic]
}

function value(event: Event): string {
  return (event.target as HTMLSelectElement).value
}
</script>

<template>
  <section class="skills" aria-labelledby="skills-title">
    <h2 id="skills-title" class="section-title">How strong are you at…</h2>
    <p class="hint">Be honest — this only changes your own suggestions, and it never leaves this browser.</p>
    <div class="skill-grid">
      <label v-for="s in SKILLS" :key="s" class="field">
        {{ names[s] }}
        <select class="select" :value="skills[s] ?? ''" @change="setSkill(s, value($event))">
          <option value="">Not sure</option>
          <option value="1">1 · Weak</option>
          <option value="2">2</option>
          <option value="3">3 · OK</option>
          <option value="4">4</option>
          <option value="5">5 · Strong</option>
        </select>
      </label>
    </div>

    <h2 class="section-title interests-title">What do you want to learn about?</h2>
    <div class="chips" role="group" aria-label="Interests">
      <button
        v-for="t in topics"
        :key="t"
        type="button"
        class="chip"
        :aria-pressed="interests.includes(t)"
        @click="toggle(t)"
      >
        {{ t.replace(/-/g, ' ') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 800;
}

.hint {
  margin: 4px 0 12px;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px 14px;
}

.interests-title {
  margin: 22px 0 10px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 5px 11px;
  border: 1px solid var(--contour);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 0.85rem;
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  border-color: var(--overprint);
  background: var(--overprint-tint);
  color: var(--overprint);
  font-weight: 600;
}
</style>
