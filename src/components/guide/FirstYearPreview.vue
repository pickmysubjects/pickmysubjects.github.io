<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import firstYears from '@/generated/first-year.json'
import type { FirstYearSlot } from '@/engine/firstYear'
import { latestDataYear } from '@/engine/dataYear'
import { link } from '@/composables/useView'
import { useDataset } from '@/composables/useDataset'
import { useI18n } from '@/i18n'

/**
 * A degree's first year before a major is chosen, as the planner lays it out (worked out when the
 * data is built): the set subjects and the options it takes from a choice by name, and each
 * elective as the kind the student picks for themselves.
 */
const YEARS = firstYears as unknown as Record<string, [FirstYearSlot[], FirstYearSlot[]]>
const { t } = useI18n()
const { data, course } = useDataset()

const courses = computed(() =>
  Object.keys(YEARS)
    .map((code) => ({ code, title: data.value.courses.find((c) => c.code === code)?.title ?? code }))
    .sort((a, b) => a.title.localeCompare(b.title)),
)
const pick = shallowRef(course.value in YEARS ? course.value : 'B-SCI')
const semesters = computed(() => YEARS[pick.value] ?? [[], []])
const year = computed(() => latestDataYear(data.value.subjects))
const title = (code: string) => data.value.subjects[code]?.title ?? ''
// Year-long subjects sit in semester 1 and run on through semester 2 (Oral Health's first year).
const yearLong = computed(() => semesters.value[0].some((s) => s.kind !== 'elective' && data.value.subjects[s.code]?.yearLong))
</script>

<template>
  <div class="fy">
    <label class="fy-pick">
      <span class="fy-label">{{ t('guide.ns.degree') }}</span>
      <select v-model="pick" class="select-glass">
        <option v-for="c in courses" :key="c.code" :value="c.code">{{ c.title }}</option>
      </select>
    </label>

    <div class="fy-sems">
      <section v-for="(slots, i) in semesters" :key="i" class="fy-sem" :aria-label="t(i === 0 ? 'guide.ns.sem1' : 'guide.ns.sem2')">
        <h3 class="fy-sem-title">{{ t(i === 0 ? 'guide.ns.sem1' : 'guide.ns.sem2') }}</h3>
        <p v-if="!slots.length && yearLong" class="fy-note">{{ t('guide.ns.yearLong') }}</p>
        <ul class="fy-list">
          <li v-for="(s, j) in slots" :key="j" class="fy-slot" :class="s.kind">
            <template v-if="s.kind === 'elective'">
              <span class="fy-name">{{ t(`guide.ns.elective.${s.category}`) }}</span>
              <span class="fy-note">
                {{ t('guide.ns.yourPick') }}<template v-if="s.example">{{ t('guide.ns.forExample') }}<a class="code" :href="link(`subject/${s.example}`)">{{ s.example }}</a></template>
              </span>
            </template>
            <template v-else>
              <a class="fy-name" :href="link(`subject/${s.code}`)"><span class="code">{{ s.code }}</span> {{ title(s.code) }}</a>
              <span v-if="s.kind === 'choice'" class="fy-note">{{ t('guide.ns.oneOf') }}</span>
            </template>
          </li>
        </ul>
      </section>
    </div>

    <p class="note">{{ t('guide.ns.firstYearNote', { year }) }}</p>
    <p class="actions">
      <a class="button button-accent" :href="link('plan/')">{{ t('guide.ns.planIt') }}</a>
      <a class="button button-quiet" :href="link('subjects/first-semester/')">{{ t('tools.firstSem') }}</a>
    </p>
  </div>
</template>

<style scoped>
.fy {
  display: grid;
  gap: 16px;
}

.fy-pick {
  display: grid;
  gap: 6px;
  max-width: 420px;
}

.fy-label {
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--ink-soft);
}

.fy-sems {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.fy-sem {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--inset-fill);
}

.fy-sem-title {
  margin: 0 0 6px;
  font-size: var(--fs-small);
  font-weight: 650;
  color: var(--ink-soft);
}

.fy-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fy-slot {
  display: grid;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.fy-slot:last-child {
  border-bottom: 0;
}

.fy-name {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}

a.fy-name:hover {
  color: var(--accent);
}

/* An elective isn't a set subject: quieter, so the set ones stand out. */
.elective .fy-name {
  color: var(--ink-soft);
  font-weight: 500;
}

.fy-note {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  color: var(--accent);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}

@media (max-width: 640px) {
  .fy-sems {
    grid-template-columns: 1fr;
  }
}
</style>
