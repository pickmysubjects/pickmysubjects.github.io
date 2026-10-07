<script setup lang="ts">
import { computed } from 'vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'

const { data, subjectList, topics } = useDataset()
const { profile, wam, setResults, setSkills, setInterests } = useProfile()

const results = computed({ get: () => profile.value.results, set: setResults })
const skills = computed({ get: () => profile.value.skills, set: setSkills })
const interests = computed({ get: () => profile.value.interests, set: setInterests })
const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
</script>

<template>
  <div class="record">
    <section class="record-intro">
      <h1 class="record-title">My record</h1>
      <p class="record-lede">
        What you've done and what you're good at. It's saved only in this browser — there's no account and nothing is
        uploaded.
      </p>
      <p class="wam">
        <span class="wam-label">WAM</span>
        <span class="wam-value">{{ wam ?? '—' }}</span>
        <span class="wam-note">credit-point weighted, from the marks you've entered</span>
      </p>
    </section>
    <div class="record-body">
      <ResultsEditor v-model="results" :subjects="data.subjects" :options="options" />
      <SkillsEditor v-model:skills="skills" v-model:interests="interests" :topics="topics" />
    </div>
  </div>
</template>

<style scoped>
.record {
  display: grid;
  gap: 24px;
  max-width: 1100px;
}

.record-title {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.record-lede {
  margin: 8px 0 0;
  color: var(--ink-soft);
}

.wam {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 14px 0 0;
}

.wam-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}

.wam-value {
  font-family: var(--font-code);
  font-size: 2rem;
  font-weight: 600;
  color: var(--overprint);
}

.wam-note {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.record-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

@media (max-width: 860px) {
  .record-body {
    grid-template-columns: 1fr;
  }
}
</style>
