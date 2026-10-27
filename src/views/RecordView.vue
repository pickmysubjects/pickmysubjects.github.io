<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, shallowRef } from 'vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import TopicChips from '@/components/profile/TopicChips.vue'
import SuggestionPreview from '@/components/profile/SuggestionPreview.vue'
import WamGoal from '@/components/profile/WamGoal.vue'
import DegreeCard from '@/components/profile/DegreeCard.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import CareerGoalPicker from '@/components/profile/CareerGoalPicker.vue'
import GradeShare from '@/components/profile/GradeShare.vue'
import WorkHours from '@/components/profile/WorkHours.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PhoneMoreLinks from '@/components/layout/PhoneMoreLinks.vue'
import { planName } from '@/components/plans/planName'
import { usePlans } from '@/composables/usePlans'
import { ArrowRight, Check, Download, Upload } from 'lucide-vue-next'
import { usePlan } from '@/composables/usePlan'
import { link } from '@/composables/useView'
import { downloadBackup, restoreBackup } from '@/utils/backup'
import { useGradeShare } from '@/composables/useGradeShare'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

const { data, subjectList, topics } = useDataset()
const { profile, wam, setResults, setCredit, setSkills, setInterests } = useProfile()

const results = computed({ get: () => profile.value.results, set: setResults })
const credit = computed({ get: () => profile.value.credit ?? [], set: setCredit })
const skills = computed({ get: () => profile.value.skills, set: setSkills })
const interests = computed({ get: () => profile.value.interests, set: setInterests })
const { t } = useI18n()
const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
const ratedSkills = computed(() => Object.keys(profile.value.skills).length)
const { setupChosen } = usePlan()
// Strengths, interests and goal are the open plan's: say which one.
const { active: activePlan } = usePlans()
const forPlan = computed(() => t.value('plans.forPlan', { name: planName(t.value, activePlan.value) }))
const restoreFailed = shallowRef(false)
// Opened from "Credit or exemptions?" in the results header.
const creditOpen = shallowRef(false)
// Subjects with a mark not yet shared: a quiet nudge in the summary, beside where they were entered.
const gradeShare = useGradeShare()
async function onRestore(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  restoreFailed.value = !restoreBackup(await file.text())
  // Saved state is read when the app starts, so reload to pick up the restored copy.
  if (!restoreFailed.value) location.reload()
}

// The four things that drive suggestions, for the summary card.
// Each line jumps to its section and ticks once it has something in it.
const filled = computed(() => [
  { key: 'record.degreeTitle', n: -1, done: setupChosen.value, href: '#sec-degree' },
  { key: 'record.sumSubjects', n: results.value.length, done: results.value.length > 0, href: '#sec-results' },
  { key: 'record.sumSkills', n: ratedSkills.value, done: ratedSkills.value > 0, href: '#sec-strengths' },
  { key: 'record.sumInterests', n: interests.value.length, done: interests.value.length > 0, href: '#sec-strengths' },
  { key: 'record.secGoal', n: -1, done: Boolean(profile.value.career), href: '#sec-goal' },
])
const doneCount = computed(() => filled.value.filter((f) => f.done).length)
</script>

<template>
  <div class="record">
    <header class="intro">
      <h1 class="page-title">{{ t('record.title') }}</h1>
      <p class="lede">{{ t('record.ledeShort') }}<InfoTip :text="t('record.lede')" /></p>
    </header>

    <div class="layout">
      <!-- At a glance: the WAM (from the marks here; UniMelb's transcript is the official one) and what's filled in. -->
      <div class="main">
        <section class="sec surface" aria-labelledby="sec-degree">
          <header class="sec-head">
            <h2 id="sec-degree" class="sec-title">{{ t('record.degreeTitle') }}</h2>
            <span v-if="!setupChosen" class="sec-state">{{ t('record.stepFirst') }}</span>
          </header>
          <DegreeCard />
        </section>

        <section class="sec surface" aria-labelledby="sec-results">
          <header class="sec-head">
            <h2 id="sec-results" class="sec-title">{{ t('record.step2') }}</h2>
            <span v-if="wam !== null" class="sec-badge">{{ t('record.sumWam', { wam }) }}</span>
            <button class="sec-link" type="button" data-testid="credit-entry" @click="creditOpen = true">{{ t('record.creditEntry') }}</button>
          </header>
          <ResultsEditor v-model="results" v-model:credit="credit" v-model:credit-open="creditOpen" :subjects="data.subjects" :options="options" />
          <GradeShare class="sec-part" />
        </section>

        <!-- Plan A/B: right above what each plan keeps for itself (strengths, interests, goal). -->
        <div class="plans">
          <PlanSwitcher no-compare />
          <p class="hint">{{ t('plans.prefsNoteShort') }}<InfoTip :text="t('plans.prefsNote')" /></p>
        </div>

        <section class="sec surface" aria-labelledby="sec-strengths">
          <header class="sec-head">
            <h2 id="sec-strengths" class="sec-title">{{ t('record.secStrengths') }}</h2>
            <span class="for-plan">{{ forPlan }}</span>
          </header>
          <p class="prompt">{{ t('record.prompt.skillsPrompt') }} <span class="prompt-count">{{ ratedSkills ? t('record.prompt.rated', { n: ratedSkills }) : t('record.prompt.noneYet') }}</span></p>
          <SkillsEditor v-model:skills="skills" />
          <div class="sec-part">
            <h3 class="sub">{{ t('record.step4') }}</h3>
            <p class="prompt">{{ t('record.prompt.interestsPrompt') }} <span class="prompt-count">{{ interests.length ? t('record.prompt.picked', { n: interests.length }) : t('record.prompt.noneYet') }}</span></p>
            <TopicChips v-model="interests" :topics="topics" :first-groups="3" />
          </div>
        </section>

        <section class="sec surface" aria-labelledby="sec-goal">
          <header class="sec-head">
            <h2 id="sec-goal" class="sec-title">{{ t('record.secGoal') }}</h2>
            <span class="for-plan">{{ forPlan }}</span>
          </header>
          <p class="prompt">{{ t('record.prompt.goalPrompt') }}</p>
          <GoalPicker :note="t('record.goalNote')" />
          <div class="sec-part"><CareerGoalPicker /></div>
          <div class="sec-part"><WorkHours /></div>
        </section>

        <section class="sec surface" aria-labelledby="sec-wam">
          <header class="sec-head">
            <h2 id="sec-wam" class="sec-title">{{ t('wamGoal.title') }}</h2>
          </header>
          <WamGoal />
        </section>

        <p class="next-phone">
          <a class="button button-accent" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
        </p>
      </div>

      <aside class="side">
      <section class="summary surface" :aria-label="t('record.summaryTitle')">
        <p class="summary-title">{{ t('record.summaryTitle') }}</p>
        <p class="wam">
          <span class="wam-label">WAM</span>
          <span v-if="wam !== null" class="wam-value">{{ wam }}</span>
          <span v-else class="wam-none">{{ t('record.noMarks') }}</span>
          <a class="wam-what" :href="link('guide/basics/#wam')">{{ t('guide.wamWhat') }}</a>
        </p>
        <div class="progress" aria-hidden="true"><span :style="{ width: `${(doneCount / filled.length) * 100}%` }" /></div>
        <ul class="counts">
          <li v-for="f in filled" :key="f.key" :class="{ empty: !f.done }">
            <a :href="f.href">
              <span class="tick"><Check v-if="f.done" :size="12" :stroke-width="3" aria-hidden="true" /></span>
              {{ f.n < 0 ? t(f.key) : t(f.key, { n: f.n }) }}
            </a>
          </li>
        </ul>
        <p v-if="gradeShare.ready.value && gradeShare.shareable.value.length" class="summary-extra">
          <a href="#share-title">{{ t('record.shareNudge') }}</a>
          <InfoTip>{{ t('grades.what') }} <a :href="link('privacy')">{{ t('grades.privacy') }}</a></InfoTip>
        </p>
        <p class="summary-extra"><a href="#sec-backup">{{ t('record.backupLink') }}</a></p>
        <a class="button button-accent summary-next" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
      </section>

      <SuggestionPreview class="suggest" />

      <section class="backup surface" aria-labelledby="sec-backup">
        <h2 id="sec-backup" class="backup-title">{{ t('record.backupTitle') }}</h2>
        <p class="hint">{{ t('record.backupTextShort') }}<InfoTip :text="t('record.backupText')" /></p>
        <p v-if="restoreFailed" class="bad" role="alert">{{ t('record.restoreFailed') }}</p>
        <div class="backup-actions">
          <button class="button button-quiet" type="button" @click="downloadBackup">
            <Download :size="16" aria-hidden="true" /> {{ t('record.backup') }}
          </button>
          <label class="button button-quiet">
            <Upload :size="16" aria-hidden="true" /> {{ t('record.restore') }}
            <input class="visually-hidden" type="file" accept="application/json,.json" @change="onRestore" />
          </label>
        </div>
      </section>
      </aside>
    </div>
    <PhoneMoreLinks />
  </div>
</template>

<style scoped>
.record {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--page-top);
  min-width: 0;
}

.lede {
  margin: var(--space-2) 0 0;
  max-width: 62ch;
  color: var(--ink-soft);
}

/* Desktop: the steps in the main column, summary, suggestions and backup beside them.
   Phones: the summary first, then the steps, then suggestions and backup. */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
  grid-template-areas: 'main side';
  gap: var(--space-5) var(--space-6);
  align-items: start;
}

.main {
  grid-area: main;
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.summary {
  grid-area: summary;
}

.suggest {
  grid-area: suggest;
}

.backup {
  grid-area: backup;
}

/* One card per section, one heading style; whatever a component brings as its own card or
   heading is folded into the section so there is never a box in a box. */
.sec {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
}

@media (max-width: 640px) {
  .sec {
    padding: var(--space-4);
  }
}

.sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.sec-link {
  margin-inline-start: auto;
  padding: 4px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.sec-link:hover {
  text-decoration: underline;
}

.summary-extra {
  margin: 0;
  font-size: 0.875rem;
}

.summary-extra a {
  color: var(--accent);
}

/* Jump targets from the summary clear the sticky header. */
:deep(#share-title),
#sec-backup {
  scroll-margin-top: 96px;
}

.sec-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.3;
}

.sec-state,
.sec-badge,
.for-plan {
  align-self: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.sec-state {
  background: var(--accent-fill);
  color: var(--accent-ink);
}

.sec-badge {
  background: var(--good-soft);
  color: var(--good);
  font-family: var(--font-code);
}

.for-plan {
  background: var(--accent-soft);
  color: var(--ink);
}

.sec > :deep(*),
.sec-part > :deep(*) {
  min-width: 0;
}

.sec :deep(.surface) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* The section heading already names these; their own headings stay for screen readers only. */
.sec :deep(:is(#degree-title, #skills-title, #goal-title)) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.sec :deep(.degree-icon) {
  display: none;
}

.sec-part {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
}

.sec-part:empty {
  display: none;
}

/* Three steps per section: the section title, then a question as a label (body size, muted),
   then its control. */
.sub,
.sec :deep(:is(.goal-label, .work-label, .share-title)) {
  margin: 0;
  padding: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.sec :deep(:is(.goal-hint, .work-hint)) {
  max-width: 60ch;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.sec :deep(.seg) {
  max-width: 560px;
}

.plans {
  display: grid;
  gap: var(--space-2);
}

.hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.summary {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5);
}


/* The three sidebar cards share one padding and one title style. */
.summary-title,
.backup-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  color: var(--ink);
}

.wam {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 0;
}

.wam-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ink-soft);
}

.wam-value {
  font-family: var(--font-code);
  font-size: 2.25rem;
  font-weight: 600;
  line-height: 1;
  color: var(--ink);
}

.wam-none {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.wam-what {
  font-size: 0.8125rem;
}

.counts {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
  font-weight: 600;
}

.counts a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  margin-inline: -8px;
  border-radius: 10px;
  color: var(--ink);
  text-decoration: none;
}

.counts a:hover {
  background: var(--accent-soft);
}

.tick {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--good);
  color: #fff;
}

.counts .empty a {
  font-weight: 450;
  color: var(--ink-soft);
}

.counts .empty .tick {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--ink) 28%, transparent);
}

.progress {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 9%, transparent);
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  transition: width 0.4s ease;
}

/* Desktop: the summary rides along while the long form scrolls. */
.side {
  grid-area: side;
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

@media (min-width: 961px) {
  .side {
    position: sticky;
    top: 80px;
  }

  .side > * {
    grid-area: auto;
  }
}

.sec {
  scroll-margin-top: 88px;
}

.summary-next {
  justify-self: start;
  margin-top: var(--space-2);
}

.backup {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
}

.bad {
  margin: 0;
  font-weight: 600;
  color: var(--bad);
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.next-phone {
  display: none;
  margin: 0;
}

@media (max-width: 960px) {
  .next-phone {
    display: flex;
    justify-content: flex-end;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'summary'
      'main'
      'suggest'
      'backup';
  }

  .side {
    display: contents;
  }

  /* On a phone the summary is a compact strip; the plan link comes after the steps instead. */
  .summary {
    gap: var(--space-2);
    padding: var(--space-4);
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--space-4);
  }

  .summary-title,
  .summary-next {
    display: none;
  }
}

@media (max-width: 560px) {
  .sec,
  .backup {
    padding: var(--space-4);
  }
}

/* Light glass: a deeper green keeps the badge at AA. */
@media (prefers-color-scheme: light) {
  .sec-badge {
    color: #146c3e;
  }
}

/* What to do in a section, with how much is picked so far. */
.prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 0;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.prompt-count {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.8125rem;
}
</style>
