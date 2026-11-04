<script setup lang="ts">
import { computed } from 'vue'
import { passedCodes } from '@/engine/recommend'
import { buildSkillTree, employerSkills } from '@/engine/skillTree'
import { link } from '@/composables/useView'
import { useDataset, useOutcomes, useResume } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * A job's skills as employers list them (yourcareer.gov.au), each beside what the student has
 * to show for it: the subjects done that show it, nothing yet, or a skill built outside class.
 * Before any subject is on the record, just the list.
 */
const props = defineProps<{ skills: readonly string[] }>()
const { t } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()

const done = computed(() => passedCodes(profile.value.results))
// Learning outcomes (in English) count too: they load with each subject's area.
const outcomes = useOutcomes(done)
const resumeOf = useResume(done)
const rows = computed(() => employerSkills(props.skills, buildSkillTree(done.value, data.value, resumeOf), data.value, (c) => outcomes(c).map((o) => o.en)))
const shown = computed(() => rows.value.filter((r) => r.codes.length).length)
</script>

<template>
  <ul v-if="!done.length" class="chips">
    <li v-for="x in skills" :key="x" class="chip">{{ x }}</li>
  </ul>
  <div v-else class="match">
    <p class="match-sum">{{ t('employerSkills.sum', { n: shown, total: skills.length }) }}</p>
    <ul class="rows">
      <li v-for="r in rows" :key="r.skill" class="row" :class="{ has: r.codes.length }">
        <span class="skill">{{ r.skill }}</span>
        <span v-if="r.codes.length" class="codes">
          <a v-for="c in r.codes" :key="c" class="code" :href="link(`subject/${c}/`)">{{ c }}</a>
        </span>
        <span v-else class="none">{{ r.outsideClass ? t('employerSkills.outside') : t('employerSkills.notYet') }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chips .chip {
  color: var(--ink);
}

.match-sum {
  margin: 0 0 6px;
  font-weight: 600;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: minmax(9em, 16em) 1fr;
  align-items: baseline;
  gap: 4px 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.skill {
  color: var(--ink-soft);
}

.has .skill {
  color: var(--ink);
  font-weight: 600;
}

.codes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--accent);
  text-decoration: none;
}

.code:hover {
  text-decoration: underline;
}

.none {
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
