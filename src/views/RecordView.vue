<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import TopicChips from '@/components/profile/TopicChips.vue'
import SuggestionPreview from '@/components/profile/SuggestionPreview.vue'
import WamGoal from '@/components/profile/WamGoal.vue'
import DegreeCard from '@/components/profile/DegreeCard.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import GradeShare from '@/components/profile/GradeShare.vue'
import WorkHours from '@/components/profile/WorkHours.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import { planName } from '@/components/plans/planName'
import { usePlans } from '@/composables/usePlans'
import { ArrowRight, Download, Upload } from 'lucide-vue-next'
import { usePlan } from '@/composables/usePlan'
import { link } from '@/composables/useView'
import { downloadBackup, restoreBackup } from '@/utils/backup'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { useI18n } from '@/i18n'

const { data, subjectList, topics } = useDataset()
const { profile, wam, setResults, setSkills, setInterests } = useProfile()

const results = computed({ get: () => profile.value.results, set: setResults })
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
const filled = computed(() => [
  { key: 'record.sumSubjects', n: results.value.length },
  { key: 'record.sumSkills', n: ratedSkills.value },
  { key: 'record.sumInterests', n: interests.value.length },
])
</script>

<template>
  <div class="record">
    <header class="intro">
      <h1 class="page-title">{{ t('record.title') }}</h1>
      <p class="lede">{{ t('record.lede') }}</p>
    </header>

    <div class="layout">
      <!-- At a glance: the WAM (from the marks here; UniMelb's transcript is the official one) and what's filled in. -->
      <section class="summary surface" :aria-label="t('record.summaryTitle')">
        <p class="summary-title">{{ t('record.summaryTitle') }}</p>
        <p class="wam">
          <span class="wam-label">WAM</span>
          <span v-if="wam !== null" class="wam-value">{{ wam }}</span>
          <span v-else class="wam-none">{{ t('record.noMarks') }}</span>
          <a class="wam-what" :href="link('guide')">{{ t('guide.wamWhat') }}</a>
        </p>
        <ul class="counts">
          <li v-for="f in filled" :key="f.key" :class="{ empty: !f.n }">{{ t(f.key, { n: f.n }) }}</li>
        </ul>
        <a class="button button-accent summary-next" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
      </section>

      <div class="main">
        <section class="sec surface" aria-labelledby="sec-degree">
          <header class="sec-head">
            <h2 id="sec-degree" class="sec-title">{{ t('record.degreeTitle') }}</h2>
            <span v-if="!setupChosen" class="sec-state">{{ t('record.stepFirst') }}</span>
          </header>
          <DegreeCard />
          <div class="plans">
            <PlanSwitcher no-compare />
            <p class="hint">{{ t('plans.prefsNote') }}</p>
          </div>
        </section>

        <section class="sec surface" aria-labelledby="sec-results">
          <header class="sec-head">
            <h2 id="sec-results" class="sec-title">{{ t('record.step2') }}</h2>
            <span v-if="wam !== null" class="sec-badge">{{ t('record.sumWam', { wam }) }}</span>
          </header>
          <ResultsEditor v-model="results" :subjects="data.subjects" :options="options" />
          <GradeShare class="sec-part" />
        </section>

        <section class="sec surface" aria-labelledby="sec-strengths">
          <header class="sec-head">
            <h2 id="sec-strengths" class="sec-title">{{ t('record.secStrengths') }}</h2>
            <span class="for-plan">{{ forPlan }}</span>
          </header>
          <SkillsEditor v-model:skills="skills" />
          <div class="sec-part">
            <h3 class="sub">{{ t('record.step4') }}</h3>
            <TopicChips v-model="interests" :topics="topics" :first-groups="3" />
          </div>
        </section>

        <section class="sec surface" aria-labelledby="sec-goal">
          <header class="sec-head">
            <h2 id="sec-goal" class="sec-title">{{ t('record.secGoal') }}</h2>
            <span class="for-plan">{{ forPlan }}</span>
          </header>
          <GoalPicker :note="t('record.goalNote')" />
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

      <SuggestionPreview class="suggest" />

      <section class="backup surface" aria-labelledby="sec-backup">
        <h2 id="sec-backup" class="backup-title">{{ t('record.backupTitle') }}</h2>
        <p class="hint">{{ t('record.backupText') }}</p>
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
    </div>
  </div>
</template>

<style scoped>
.record {
  display: grid;
  gap: var(--space-5);
  padding-top: 32px;
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
  grid-template-rows: auto auto auto 1fr;
  grid-template-areas:
    'main summary'
    'main suggest'
    'main backup'
    'main .';
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

.sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
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
  background: var(--accent);
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
  padding-top: var(--space-4);
  border-top: 1px solid var(--line);
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
  color: var(--ink-faint);
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

.counts .empty {
  font-weight: 400;
  color: var(--ink-faint);
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
    grid-template-rows: none;
    grid-template-areas:
      'summary'
      'main'
      'suggest'
      'backup';
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
</style>
