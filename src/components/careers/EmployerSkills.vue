<script setup lang="ts">
import { computed } from 'vue'
import { CLUBS } from '@/content/clubs'
import { suggestClubs } from '@/engine/clubs'
import { passedCodes, standingOf } from '@/engine/recommend'
import { buildSkillTree, employerSkills } from '@/engine/skillTree'
import { skillPicks } from '@/engine/skillPicks'
import { link } from '@/composables/useView'
import { useDataset, useOutcomes, useResume } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

/**
 * A job's skills as employers list them (yourcareer.gov.au), each beside what the student has
 * to show for it: the subjects done that show it, or, for one they don't have yet, the subjects in
 * their plan that will give it to them, else a few they could add. Skills built outside class point
 * to the clubs that suit them. Before any subject is on the record, just the list.
 */
const props = defineProps<{ skills: readonly string[] }>()
const { t } = useI18n()
const { data, course } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

const done = computed(() => passedCodes(profile.value.results))
const planned = computed(() => plan.plan.value.terms.flatMap((term) => term.subjects))
// Learning outcomes (in English) count too: they load with each subject's area.
const outcomes = useOutcomes(done)
const resumeOf = useResume(done)
const rows = computed(() => employerSkills(props.skills, buildSkillTree(done.value, data.value, resumeOf), data.value, (c) => outcomes(c).map((o) => o.en)))
const shown = computed(() => rows.value.filter((r) => r.codes.length).length)

const standing = computed(() => standingOf(profile.value, data.value, planned.value))
const picks = computed(() =>
  Object.fromEntries(
    rows.value
      .filter((r) => !r.codes.length && !r.outsideClass)
      .map((r) => [r.skill, skillPicks(r.skill, { data: data.value, course: course.value, done: done.value, planned: planned.value, standing: standing.value })]),
  ),
)
const outside = computed(() => rows.value.filter((r) => r.outsideClass).map((r) => r.skill))
const clubs = computed(() =>
  outside.value.length
    ? suggestClubs(CLUBS, { interests: profile.value.interests, course: plan.setupChosen.value ? course.value : undefined, codes: [...done.value, ...planned.value], data: data.value }, 3)
    : [],
)
const title = (c: string) => data.value.subjects[c]?.title ?? ''
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
        <span v-else-if="r.outsideClass" class="none">{{ t('employerSkills.outside') }}</span>
        <span v-else-if="picks[r.skill]?.planned.length" class="planned">
          {{ t('employerSkills.inPlan') }}
          <a v-for="c in picks[r.skill]!.planned" :key="c" class="code" :href="link(`subject/${c}/`)">{{ c }}</a>
        </span>
        <span v-else-if="picks[r.skill]?.picks.length" class="picks">
          <span class="none">{{ t('employerSkills.teaches') }}</span>
          <span v-for="c in picks[r.skill]!.picks" :key="c" class="pick">
            <a class="code" :href="link(`subject/${c}/`)" :title="title(c)">{{ c }}</a>
            <a class="add" :href="link(`plan?add=${c}`)">{{ t('employerSkills.add') }}</a>
          </span>
        </span>
        <span v-else class="none">{{ t('employerSkills.notYet') }}</span>
      </li>
    </ul>
    <p v-if="clubs.length" class="clubs">
      {{ t('employerSkills.outsideClubs') }}
      <a v-for="c in clubs" :key="c.club.slug" class="club" :href="link(`clubs/${c.club.slug}`)">{{ c.club.name }}</a>
    </p>
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

.planned,
.picks {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.pick {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.add,
.club {
  color: var(--accent);
  font-size: var(--fs-small);
  font-weight: 600;
  text-decoration: none;
}

.add:hover,
.club:hover {
  color: var(--ink);
}

.clubs {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 10px 0 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
