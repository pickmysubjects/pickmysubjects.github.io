<script setup lang="ts">
import { offerInstall } from '@/utils/install'
import { computed, shallowRef, watch } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'
import SegmentedControl from '@/components/SegmentedControl.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import CareerGoalPicker from '@/components/profile/CareerGoalPicker.vue'
import { careerTarget } from '@/engine/careerPaths'
import type { CareerLang } from '@/engine/careers'
import { passedCodes } from '@/engine/recommend'
import { courseworkLines, resumeLineKey, resumeText } from '@/engine/skillTree'
import { useDataset } from '@/composables/useDataset'
import { useEmployerMatch } from '@/composables/useEmployerMatch'
import { usePlan } from '@/composables/usePlan'
import { useProfile } from '@/composables/useProfile'
import { link, useView } from '@/composables/useView'
import { useI18n } from '@/i18n'
import { localTitle, pickLocalized } from '@/i18n/localized'
import { cleanShortlist } from '@/utils/sanitize'

/**
 * The resume tool: the subjects on the left (the record's passed ones by default, with the plan's
 * too if asked, plus or minus any picked here), and on the right what they add up to as a resume
 * section in English: technical skills, skills and each subject's coursework lines, every line
 * ticked or not for the copy. With a career goal, how many of the skills employers list for that
 * job the subjects show, and how to show the rest. Subjects added or removed here live in the
 * address (?add=…&drop=…), so a link shares the same page; nothing is written to the record.
 */
const { t, locale } = useI18n()
const { data } = useDataset()
const { profile } = useProfile()
const plan = usePlan()
const { query } = useView()

const done = computed(() => passedCodes(profile.value.results, data.value.subjects))
const planned = computed(() => plan.plan.value.terms.flatMap((term) => term.subjects).filter((c) => !done.value.includes(c)))
const scope = shallowRef<'done' | 'all'>('done')
const scopes = computed(() => [
  { value: 'done' as const, label: t.value('skillTree.done', { n: done.value.length }) },
  { value: 'all' as const, label: t.value('skillTree.withPlan', { n: done.value.length + planned.value.length }) },
])
const base = computed(() => (scope.value === 'all' ? [...done.value, ...planned.value] : done.value))

// Picked on this page only: added to, or taken from, the record's subjects.
const fromQuery = (key: string) => cleanShortlist((query.value.get(key) ?? '').split(','))
const added = shallowRef<string[]>(fromQuery('add'))
const dropped = shallowRef<string[]>(fromQuery('drop'))
const codes = computed(() =>
  [...base.value.filter((c) => !dropped.value.includes(c)), ...added.value.filter((c) => !base.value.includes(c))].filter((c) => data.value.subjects[c]),
)
// The empty state's line, around its link to My record (where it goes in the sentence differs by language).
const emptyText = computed(() => {
  const [before = '', after = ''] = t.value('resume.empty').split('{link}')
  return [before, after]
})
const edited = computed(() => added.value.length > 0 || dropped.value.length > 0)

function keepInAddress(): void {
  const q = new URLSearchParams(location.search)
  for (const [key, list] of [['add', added.value], ['drop', dropped.value]] as const) {
    if (list.length) q.set(key, list.join(','))
    else q.delete(key)
  }
  const search = q.toString().replace(/%2C/g, ',')
  history.replaceState(history.state, '', location.pathname + (search ? `?${search}` : '') + location.hash)
}
function add(code: string): void {
  if (dropped.value.includes(code)) dropped.value = dropped.value.filter((c) => c !== code)
  else if (!codes.value.includes(code)) added.value = [...added.value, code]
  keepInAddress()
}
function remove(code: string): void {
  if (added.value.includes(code)) added.value = added.value.filter((c) => c !== code)
  else dropped.value = [...dropped.value, code]
  keepInAddress()
}
function reset(): void {
  added.value = []
  dropped.value = []
  keepInAddress()
}
const titleOf = (c: string) => {
  const s = data.value.subjects[c]
  return s ? localTitle(s, locale.value) || s.title : c
}

// The plan's career goal and the skills employers list for it.
const goal = computed(() => (profile.value.career ? careerTarget(data.value, profile.value.career) : undefined))
const goalName = computed(() => (goal.value ? (goal.value.names[t.value('careerLang') as CareerLang] ?? goal.value.names.en) : ''))
const goalSkills = computed(() => goal.value?.occupation?.skills ?? [])
const { tree, rows, shown, picks, clubs, outcomes, outcomesEn, resumeOf } = useEmployerMatch(goalSkills, codes)
const matched = computed(() => rows.value.filter((r) => r.codes.length))
const missing = computed(() => rows.value.filter((r) => !r.codes.length))
const firstOutside = computed(() => missing.value.find((r) => r.outsideClass)?.skill)
// The subjects that show a skill the job asks for: a copy tailored to it keeps only these.
const relevant = computed(() => [...new Set(matched.value.flatMap((r) => r.codes))])

// Skills, most-backed first; a very long list folds after the first few rows.
const FIRST_SKILLS = 24
const allSkills = shallowRef(false)
const shownSkills = computed(() => (allSkills.value ? tree.value.specialist : tree.value.specialist.slice(0, FIRST_SKILLS)))
const saidOnly = computed(() => tree.value.tools.some((x) => x.studentsOnly))

// Each subject's English resume lines (else its outcomes in English), with a tick for the copy;
// what it teaches in the page's language sits behind "What it covers".
const coursework = computed(() =>
  tree.value.subjects
    .map((code) => ({ code, lines: courseworkLines(code, outcomesEn, resumeOf), covers: outcomes(code).map((o) => pickLocalized(o, locale.value)) }))
    .filter((x) => x.lines.length),
)
// "What it covers" only adds something when it isn't the same English lines again.
const coversShown = (x: { code: string; covers: string[] }) => x.covers.length > 0 && (locale.value !== 'en' || !!resumeOf(x.code)?.lines.length)
const skip = shallowRef<ReadonlySet<string>>(new Set())
function toggle(key: string, on: boolean): void {
  const next = new Set(skip.value)
  if (on) next.delete(key)
  else next.add(key)
  skip.value = next
}

const copied = shallowRef<'' | 'goal' | 'all'>('')
async function copy(which: 'goal' | 'all'): Promise<void> {
  const text = resumeText(tree.value, data.value, outcomesEn, { resumeOf, skip: skip.value, focus: which === 'goal' ? relevant.value : undefined })
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => (copied.value = ''), 2500)
  } catch {
    copied.value = ''
  }
}
// An answer on screen is a good moment to offer the app.
watch(() => codes.value.length > 0, (on) => on && offerInstall())
</script>

<template>
  <div class="rt" :class="{ 'is-empty': !codes.length }">
    <aside class="rt-side surface" :aria-label="t('resume.subjects')">
      <section class="side-part" aria-labelledby="rt-subjects">
        <div class="side-head">
          <h2 id="rt-subjects" class="side-title">{{ t('resume.subjects') }}</h2>
          <span v-if="codes.length" class="side-count">{{ codes.length }}</span>
          <button v-if="edited" class="text-link side-reset" type="button" @click="reset">{{ t('resume.reset') }}</button>
        </div>
        <SegmentedControl v-if="planned.length" v-model="scope" class="side-scope" :options="scopes" :label="t('skillTree.scope')" />
        <ul v-if="codes.length" class="subj-list">
          <li v-for="c in codes" :key="c" class="subj" :class="{ 'is-added': added.includes(c) }" :title="titleOf(c)">
            <span class="subj-code">{{ c }}</span>
            <button class="subj-x" type="button" :aria-label="t('resume.remove', { code: c })" @click="remove(c)"><X :size="14" :stroke-width="2.5" aria-hidden="true" /></button>
          </li>
        </ul>
        <SubjectSearch class="side-search" select compact :placeholder="t('resume.add')" @pick="add" />
        <p v-if="!codes.length" class="side-note">
          {{ emptyText[0] }}<a class="text-link" :href="link('record/')">{{ t('resume.emptyLink') }}</a>{{ emptyText[1] }}
        </p>
        <p v-else class="side-note">{{ t('resume.pageOnly') }}</p>
      </section>
      <section class="side-part side-goal">
        <CareerGoalPicker no-hint />
      </section>
    </aside>

    <div v-if="codes.length" class="rt-main">
      <!-- The goal: how much of what employers list the subjects show, then what's still missing. -->
      <section v-if="goal" class="surface rt-match" aria-labelledby="rt-match">
        <template v-if="goalSkills.length">
          <h2 id="rt-match" class="match-title">{{ t('resume.match', { career: goalName, n: shown, total: goalSkills.length }) }}</h2>
          <div class="match-bar" role="progressbar" :aria-valuenow="shown" aria-valuemin="0" :aria-valuemax="goalSkills.length" :aria-labelledby="'rt-match'">
            <span :style="{ width: `${(shown / goalSkills.length) * 100}%` }" />
          </div>
          <ul v-if="matched.length" class="match-chips" :aria-label="t('resume.shown')">
            <li v-for="r in matched" :key="r.skill" class="match-chip" :title="r.codes.join(', ')">{{ r.skill }}</li>
          </ul>
          <div v-if="missing.length" class="miss">
            <h3 class="part-title">{{ t('resume.missing') }}</h3>
            <ul class="miss-list">
              <li v-for="r in missing" :key="r.skill" class="miss-row">
                <span class="miss-skill">{{ r.skill }}</span>
                <span class="miss-hint">
                  <template v-if="r.outsideClass">
                    {{ t('employerSkills.outside') }}
                    <!-- The clubs that suit the student, once, beside the first skill built outside class. -->
                    <span v-if="r.skill === firstOutside && clubs.length" class="miss-clubs">
                      <a v-for="c in clubs" :key="c.club.slug" class="text-link" :href="link(`clubs/${c.club.slug}`)">{{ c.club.name }}</a>
                    </span>
                  </template>
                  <template v-else-if="picks[r.skill]?.planned.length">
                    {{ t('employerSkills.inPlan') }}
                    <a v-for="c in picks[r.skill]!.planned" :key="c" class="code-link" :href="link(`subject/${c}/`)" :title="titleOf(c)">{{ c }}</a>
                  </template>
                  <template v-else-if="picks[r.skill]?.picks.length">
                    {{ t('employerSkills.teaches') }}
                    <a v-for="c in picks[r.skill]!.picks" :key="c" class="code-link" :href="link(`subject/${c}/`)" :title="titleOf(c)">{{ c }}</a>
                  </template>
                  <template v-else>{{ t('employerSkills.notYet') }}</template>
                </span>
              </li>
            </ul>
          </div>
          <a v-if="goal.occupation?.url" class="match-source" :href="goal.occupation.url" target="_blank" rel="noopener">{{ t('resume.source') }}</a>
        </template>
        <template v-else>
          <h2 id="rt-match" class="match-title">{{ goalName }}</h2>
          <p class="match-none">{{ t('skillTree.goalNoList') }}</p>
        </template>
      </section>

      <!-- The resume section itself: only English that can go straight onto a resume. -->
      <article class="surface rt-sheet" aria-labelledby="rt-sheet">
        <header class="sheet-head">
          <div class="sheet-heading">
            <h2 id="rt-sheet" class="sheet-title">{{ t('resume.sheet') }}</h2>
            <p class="sheet-note">{{ t('resume.note') }}</p>
          </div>
          <div class="sheet-actions">
            <button v-if="relevant.length" class="button button-quiet" type="button" @click="copy('goal')">
              {{ copied === 'goal' ? t('skillTree.copied') : t('skillTree.copyFor', { career: goalName }) }}
            </button>
            <button class="button button-accent" type="button" @click="copy('all')">
              {{ copied === 'all' ? t('skillTree.copied') : t('resume.copySelected') }}
            </button>
          </div>
        </header>

        <section v-if="tree.tools.length" class="sheet-part" aria-labelledby="rt-tech">
          <h3 id="rt-tech" class="part-title">{{ t('resume.tech') }}</h3>
          <p class="tech" lang="en">
            <template v-for="(tool, i) in tree.tools" :key="tool.name"
              ><span v-if="tool.studentsOnly" class="said" tabindex="0" :title="`${t('resume.studentsSay')} (${tool.codes.join(', ')})`">{{ tool.name }}</span
              ><span v-else :title="tool.codes.join(', ')">{{ tool.name }}</span
              ><template v-if="i < tree.tools.length - 1">, </template></template
            >
          </p>
          <p v-if="saidOnly" class="said-key"><span class="said-mark" aria-hidden="true" />{{ t('resume.studentsSay') }}</p>
        </section>

        <section v-if="tree.specialist.length" class="sheet-part" aria-labelledby="rt-skills">
          <h3 id="rt-skills" class="part-title">{{ t('resume.skills') }}</h3>
          <ul class="skill-chips" lang="en">
            <li v-for="x in shownSkills" :key="x.name" class="skill-chip" :title="x.codes.join(', ')">{{ x.name }}</li>
          </ul>
          <button v-if="tree.specialist.length > FIRST_SKILLS" class="text-link more" type="button" @click="allSkills = !allSkills">
            {{ allSkills ? t('skillTree.fewer') : t('skillTree.allSkills', { n: tree.specialist.length }) }}
          </button>
        </section>

        <section v-if="coursework.length" class="sheet-part" aria-labelledby="rt-coursework">
          <h3 id="rt-coursework" class="part-title">{{ t('resume.coursework') }}</h3>
          <div class="cw-list">
            <div v-for="x in coursework" :key="x.code" class="cw">
              <h4 class="cw-title" lang="en">
                <a class="cw-name" :href="link(`subject/${x.code}/`)">{{ data.subjects[x.code]?.title }}</a>
                <span class="cw-code">{{ x.code }}</span>
              </h4>
              <ul class="cw-lines">
                <li v-for="(line, i) in x.lines" :key="i">
                  <label class="cw-line" :class="{ 'is-off': skip.has(resumeLineKey(x.code, i)) }">
                    <input class="cw-check" type="checkbox" :checked="!skip.has(resumeLineKey(x.code, i))" @change="toggle(resumeLineKey(x.code, i), ($event.target as HTMLInputElement).checked)" />
                    <span class="cw-text" lang="en">{{ line }}</span>
                  </label>
                </li>
              </ul>
              <details v-if="coversShown(x)" class="covers">
                <summary class="covers-toggle">{{ t('resume.covers') }}<ChevronDown :size="14" aria-hidden="true" class="covers-icon" /></summary>
                <ul class="covers-list">
                  <li v-for="(line, i) in x.covers" :key="i">{{ line }}</li>
                </ul>
              </details>
            </div>
          </div>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* Phones and tablets: one column, the subjects first. Wide screens: the subjects in a sticky panel
   on the left, the goal and the resume section beside it. */
.rt {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

@media (min-width: 961px) {
  .rt {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: var(--space-5);
  }

  .rt-side {
    position: sticky;
    top: 88px;
    max-height: calc(100vh - 112px);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }

  /* Nothing to show yet: the panel's search is the whole page. */
  .rt.is-empty {
    grid-template-columns: minmax(0, 520px);
  }
}

/* ---------- Left panel ---------- */
.rt-side {
  display: grid;
  align-content: start;
  min-width: 0;
  padding: var(--space-5);
}

.side-part {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.side-goal {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.side-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 28px;
}

.side-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  line-height: 1.3;
}

.side-count {
  min-width: 24px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 600;
  line-height: 20px;
  text-align: center;
}

.side-reset {
  margin-inline-start: auto;
}

.side-scope {
  width: 100%;
}

/* Equal columns, so the codes line up row under row. */
.subj-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A subject: its code, and an × to take it off this page. */
.subj {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  min-width: 0;
  height: 32px;
  padding: 0 4px 0 12px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--field-fill);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 60%);
}

/* Added here, not from the record: tinted, so it's clear what this page changed. */
.subj.is-added {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: var(--accent-soft);
}

.subj-code {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink);
}

.subj-x {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.subj-x:hover {
  background: var(--inset-fill);
  color: var(--ink);
}

.subj-x:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.side-search {
  min-width: 0;
}

/* The panel's controls share its full width, so their edges line up. */
.side-goal :deep(.search) {
  max-width: none;
}

/* The goal's label as this panel's second heading, the same as "Subjects". */
.side-goal :deep(.career-label) {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  line-height: 1.3;
  color: var(--ink);
}

/* The chosen goal in a narrow panel: Clear as a round × (its word stays its accessible name). */
.side-goal :deep(.chosen .clear) {
  width: 44px;
  padding: 0;
  gap: 0;
  font-size: 0;
}

.side-note {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-meta);
  line-height: 1.5;
}

/* Text actions: accent, semibold, no underline until hovered. */
.text-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: var(--fs-small);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.text-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.side-note .text-link {
  font-size: inherit;
}

/* ---------- Main column ---------- */
.rt-main {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.part-title {
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* The goal strip. */
.rt-match {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5) var(--space-6);
}

.match-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  line-height: 1.4;
}

.match-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 10%, transparent);
}

.match-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent-fill);
}

.match-chips,
.skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.match-chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--good-soft);
  color: var(--good);
  font-size: var(--fs-meta);
  font-weight: 600;
  line-height: 1.4;
}

.miss {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.miss-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A missing skill and how to show it: two aligned columns, one row each. */
.miss-row {
  display: grid;
  grid-template-columns: minmax(8em, 15em) minmax(0, 1fr);
  align-items: baseline;
  gap: 2px var(--space-4);
  padding: 8px 0;
  border-top: 1px solid var(--line);
}

.miss-skill {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.miss-clubs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  width: 100%;
}

.miss-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.code-link {
  font-family: var(--font-code);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.code-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.match-source {
  justify-self: start;
  color: var(--ink-soft);
  font-size: var(--fs-caption);
  text-decoration: none;
}

.match-source:hover {
  color: var(--accent);
  text-decoration: underline;
}

.match-none {
  margin: 0;
  color: var(--ink-soft);
}

/* The resume section: a sheet of paper on the glass, text at a comfortable reading width. */
.rt-sheet {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
  padding: var(--space-6);
  background: color-mix(in srgb, var(--card-solid) 92%, transparent);
}

/* Text at a reading width; the dividers run the card's full width. */
.tech,
.said-key,
.skill-chips,
.cw-title,
.cw-lines,
.covers {
  max-width: 760px;
}

.sheet-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3) var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--line);
}

.sheet-heading {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 16em;
}

.sheet-title {
  margin: 0;
  font-size: var(--fs-h2);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
}

.sheet-note {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-small);
}

.sheet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sheet-part {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.tech {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
}

/* Named only by students: a dotted underline, with the reason on hover and in the key below. */
.said {
  text-decoration: underline dotted color-mix(in srgb, var(--ink) 55%, transparent);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 4px;
  cursor: help;
}

.said:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 3px;
}

.said-key {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--fs-meta);
}

.said-mark {
  flex: none;
  width: 18px;
  border-bottom: 1.5px dotted color-mix(in srgb, var(--ink) 55%, transparent);
}

.skill-chip {
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 3%, transparent);
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--ink);
}

.more {
  justify-self: start;
}

.cw-list {
  display: grid;
}

.cw {
  display: grid;
  gap: 6px;
  padding: var(--space-4) 0;
  border-top: 1px solid var(--line);
}

.cw:first-child {
  padding-top: 0;
  border-top: 0;
}

.cw:last-child {
  padding-bottom: 0;
}

/* The subject as a small heading: its English title, the code after it in muted type. */
.cw-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.4;
}

.cw-name {
  color: var(--ink);
  text-decoration: none;
}

.cw-name:hover {
  color: var(--accent);
}

.cw-code {
  font-family: var(--font-code);
  font-size: var(--fs-meta);
  font-weight: 500;
  color: var(--ink-faint);
}

.cw-lines {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* One resume line with its tick: the box on the first line's centre, wrapped text under the text. */
.cw-line {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  padding: 4px 0;
  cursor: pointer;
}

.cw-check {
  width: 18px;
  height: 18px;
  /* Centred on the first line of text (1.55 × 15px line box). */
  margin: calc((1.55em - 18px) / 2) 0 0;
  font-size: var(--fs-small);
  accent-color: var(--accent-fill);
  cursor: pointer;
}

.cw-text {
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink);
}

.cw-line.is-off .cw-text {
  color: var(--ink-faint);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--ink) 30%, transparent);
}

.covers {
  margin-left: 28px;
}

.covers-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.covers-toggle::-webkit-details-marker {
  display: none;
}

.covers-icon {
  transition: transform 0.15s;
}

.covers[open] .covers-icon {
  transform: rotate(180deg);
}

.covers-list {
  display: grid;
  gap: 2px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  color: var(--ink-soft);
  font-size: var(--fs-small);
  line-height: 1.5;
}

/* A hanging dot: a wrapped line lines up under the text, not under the dot. */
.covers-list li {
  padding-left: 0.9em;
  text-indent: -0.9em;
}

.covers-list li::before {
  content: '· ';
}

/* Phones: full-width actions, roomier taps. */
@media (max-width: 640px) {
  .rt-side,
  .rt-match,
  .rt-sheet {
    padding: var(--space-4);
  }

  .side-goal {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
  }

  .miss-row {
    grid-template-columns: minmax(0, 1fr);
  }

  /* The main copy first. */
  .sheet-actions {
    flex-direction: column-reverse;
    width: 100%;
  }

  .sheet-actions .button {
    flex: 1 1 100%;
  }
}

/* Fingers: every control at least 44px. */
@media (pointer: coarse), (max-width: 640px) {
  .subj {
    height: 44px;
    padding: 0 2px 0 12px;
  }

  .subj-x {
    width: 40px;
    height: 40px;
  }

  .side-reset,
  .more,
  .covers-toggle {
    min-height: 44px;
  }

  .covers-toggle {
    display: inline-flex;
  }

  .cw-line {
    padding: 8px 0;
  }
}
</style>
