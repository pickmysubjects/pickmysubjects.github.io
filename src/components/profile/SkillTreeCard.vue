<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import EmployerSkills from '@/components/careers/EmployerSkills.vue'
import { careerTarget } from '@/engine/careerPaths'
import type { CareerLang } from '@/engine/careers'
import { passedCodes } from '@/engine/recommend'
import { buildSkillTree, resumeText } from '@/engine/skillTree'
import { link } from '@/composables/useView'
import { useDataset, useOutcomes, useResume } from '@/composables/useDataset'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'
import { pickLocalized } from '@/i18n/localized'

/**
 * What the student can put on a resume from their subjects: tools, core abilities and what each
 * subject taught, every line with the subjects behind it. Subjects done, or with the plan too.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()
const plan = usePlan()

const done = computed(() => passedCodes(profile.value.results))
const planned = computed(() => plan.plan.value.terms.flatMap((term) => term.subjects).filter((c) => !done.value.includes(c)))
const scope = shallowRef<'done' | 'all'>('done')
const codes = computed(() => (scope.value === 'all' ? [...done.value, ...planned.value] : done.value))
// Specialist skills and resume lines come with each subject's detail, loaded as the list changes.
const resumeOf = useResume(codes)
const tree = computed(() => buildSkillTree(codes.value, data.value, resumeOf))

const outcomes = useOutcomes(codes)
const lines = (code: string) => outcomes(code).map((o) => pickLocalized(o, locale.value))

// Long records: the first few subjects, the rest a tap away.
const FIRST = 4
const showAll = shallowRef(false)
const shownSubjects = computed(() => (showAll.value ? tree.value.subjects : tree.value.subjects.slice(0, FIRST)))
// Specialist skills: the ones most subjects back first, the rest a tap away (the copy has them all).
const FIRST_SKILLS = 8
const allSkills = shallowRef(false)
const shownSkills = computed(() => (allSkills.value ? tree.value.specialist : tree.value.specialist.slice(0, FIRST_SKILLS)))

const scopes = computed(() => [
  { value: 'done' as const, label: t.value('skillTree.done', { n: done.value.length }) },
  { value: 'all' as const, label: t.value('skillTree.withPlan', { n: done.value.length + planned.value.length }) },
])

// The plan's career goal, read against the skills employers list for that job.
const goal = computed(() => (profile.value.career ? careerTarget(data.value, profile.value.career) : undefined))
const goalName = computed(() => (goal.value ? (goal.value.names[t.value('careerLang') as CareerLang] ?? goal.value.names.en) : ''))

const copied = shallowRef(false)
async function copy(): Promise<void> {
  const text = resumeText(tree.value, data.value, (c) => outcomes(c).map((o) => o.en), resumeOf)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="tree">
    <SegmentedControl v-if="planned.length" v-model="scope" class="tree-scope" :options="scopes" :label="t('skillTree.scope')" />

    <p v-if="!tree.subjects.length" class="tree-empty">{{ t('skillTree.empty') }}</p>
    <template v-else>
      <div v-if="tree.tools.length" class="part">
        <h3 class="part-title">{{ t('skillTree.tools') }}</h3>
        <ul class="rows">
          <li v-for="tool in tree.tools" :key="tool.name" class="row">
            <span class="row-name">{{ tool.name }}</span>
            <span class="row-codes">
              <a v-for="c in tool.codes" :key="c" class="code" :href="link(`subject/${c}/`)">{{ c }}</a>
              <span v-if="tool.studentsOnly" class="said">{{ t('skillTree.studentsSay') }}</span>
            </span>
          </li>
        </ul>
      </div>

      <div v-if="tree.specialist.length" class="part">
        <h3 class="part-title">{{ t('skillTree.specialist') }}</h3>
        <ul class="rows">
          <li v-for="x in shownSkills" :key="x.name" class="row">
            <span class="row-name" lang="en">{{ x.name }}</span>
            <span class="row-codes">
              <a v-for="c in x.codes" :key="c" class="code" :href="link(`subject/${c}/`)">{{ c }}</a>
            </span>
          </li>
        </ul>
        <button v-if="tree.specialist.length > FIRST_SKILLS" class="more" type="button" @click="allSkills = !allSkills">
          {{ allSkills ? t('skillTree.fewer') : t('skillTree.allSkills', { n: tree.specialist.length }) }}
        </button>
      </div>

      <div class="part">
        <h3 class="part-title">{{ t('skillTree.learned') }}</h3>
        <ul class="learned">
          <li v-for="c in shownSubjects" :key="c" class="learned-item">
            <a class="learned-name" :href="link(`subject/${c}/`)"><span class="code">{{ c }}</span> {{ data.subjects[c]?.title }}</a>
            <ul v-if="lines(c).length" class="outcomes">
              <li v-for="(line, i) in lines(c)" :key="i">{{ line }}</li>
            </ul>
            <div v-if="resumeOf(c)?.lines.length" class="resume-lines">
              <span class="resume-label">{{ t('skillTree.resumeLines') }}</span>
              <p v-for="(line, i) in resumeOf(c)!.lines" :key="i" lang="en">{{ line }}</p>
            </div>
          </li>
        </ul>
        <button v-if="tree.subjects.length > FIRST" class="more" type="button" @click="showAll = !showAll">
          {{ showAll ? t('skillTree.fewer') : t('skillTree.all', { n: tree.subjects.length }) }}
        </button>
      </div>

      <div class="part">
        <h3 class="part-title">{{ goal ? t('skillTree.forGoal', { career: goalName }) : t('skillTree.goal') }}</h3>
        <template v-if="goal?.occupation?.skills.length">
          <EmployerSkills :skills="goal.occupation.skills" />
          <a class="source" :href="goal.occupation.url" target="_blank" rel="noopener">{{ t('skillTree.goalSource') }}</a>
        </template>
        <p v-else-if="goal" class="tree-empty">{{ t('skillTree.goalNoList') }}</p>
        <p v-else class="tree-empty"><a class="source" href="#sec-goal">{{ t('skillTree.pickGoal') }}</a></p>
      </div>

      <div class="actions">
        <button class="button button-quiet" type="button" @click="copy">{{ copied ? t('skillTree.copied') : t('skillTree.copy') }}</button>
        <p class="note">{{ t('skillTree.note') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tree {
  display: grid;
  gap: 18px;
}

.tree-scope {
  justify-self: start;
}

.tree-empty {
  margin: 0;
  color: var(--ink-soft);
}

.part-title {
  margin: 0 0 6px;
  font-size: var(--fs-small);
  font-weight: 650;
  color: var(--ink-soft);
}

.rows,
.learned,
.outcomes {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The ability or tool, then the subjects behind it right beside it (not pushed to the far edge). */
.row {
  display: grid;
  grid-template-columns: minmax(9em, 14em) 1fr;
  align-items: baseline;
  gap: 4px 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.row-name {
  font-weight: 600;
}

.row-codes {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}

.code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--accent);
  text-decoration: none;
}

a.code:hover {
  text-decoration: underline;
}

.said {
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  color: var(--ink-soft);
  font-size: 0.75rem;
}

.learned-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.learned-item:last-child {
  border-bottom: 0;
}

.learned-name {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}

.learned-name:hover {
  color: var(--accent);
}

.outcomes {
  margin-top: 4px;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: 1.5;
}

/* A hanging dot: a line that wraps lines up under the text, not under the dot. */
.outcomes li {
  padding-left: 0.9em;
  text-indent: -0.9em;
}

.outcomes li::before {
  content: '· ';
}

.resume-lines {
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  font-size: var(--fs-small);
  line-height: 1.5;
}

.resume-label {
  display: block;
  margin-bottom: 2px;
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.resume-lines p {
  margin: 0;
}

/* Two resume lines are two separate bullets on a resume, so keep them apart. */
.resume-lines p + p {
  margin-top: 6px;
}

.more {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.more:hover {
  text-decoration: underline;
}

.source {
  display: inline-block;
  margin-top: 6px;
  color: var(--accent);
  font-size: var(--fs-small);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.note {
  flex: 1 1 18em;
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
