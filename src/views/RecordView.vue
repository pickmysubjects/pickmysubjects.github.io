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
import { ArrowRight, Check, Download, Upload } from 'lucide-vue-next'
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
// Each step's state, shown on its label: done, or (step 1 only) the one to do first.
const steps = computed(() => [
  { n: 1, key: 'record.step1', done: setupChosen.value },
  { n: 2, key: 'record.step2', done: results.value.length > 0 },
  { n: 3, key: 'record.step3', done: ratedSkills.value > 0 },
  { n: 4, key: 'record.step4', done: interests.value.length > 0 },
])

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
</script>

<template>
  <div class="record">
    <section class="record-intro">
      <h1 class="record-title">{{ t('record.title') }}</h1>
      <p class="record-lede">{{ t('record.lede') }}</p>
      <!-- At a glance: what's filled in so far. UniMelb shows the official WAM; this one only feeds predictions. -->
      <ul class="summary">
        <li v-if="wam !== null">{{ t('record.sumWam', { wam }) }} <a :href="link('guide')">{{ t('guide.wamWhat') }}</a></li>
        <li :class="{ empty: !results.length }">{{ t('record.sumSubjects', { n: results.length }) }}</li>
        <li :class="{ empty: !ratedSkills }">{{ t('record.sumSkills', { n: ratedSkills }) }}</li>
        <li :class="{ empty: !interests.length }">{{ t('record.sumInterests', { n: interests.length }) }}</li>
      </ul>
    </section>

    <div class="record-layout">
      <div class="record-main">
        <section class="block">
          <h2 class="block-step" :class="{ done: steps[0]!.done }">
            <span class="block-num" aria-hidden="true"><Check v-if="steps[0]!.done" :size="14" /><template v-else>1</template></span>
            {{ t('record.step1') }}
            <span v-if="steps[0]!.done" class="block-state">{{ t('record.stepDone') }}</span>
            <span v-else class="block-state first">{{ t('record.stepFirst') }}</span>
          </h2>
          <div class="block-card surface">
            <DegreeCard class="flat" />
            <div class="block-part"><GoalPicker :note="t('record.goalNote')" /></div>
            <div class="block-part"><WorkHours /></div>
          </div>
        </section>

        <section class="block">
          <h2 class="block-step" :class="{ done: steps[1]!.done }">
            <span class="block-num" aria-hidden="true"><Check v-if="steps[1]!.done" :size="14" /><template v-else>2</template></span>
            {{ t('record.step2') }}
            <span v-if="steps[1]!.done" class="block-state">{{ t('record.stepDone') }}</span>
          </h2>
          <div class="block-card surface">
            <ResultsEditor v-model="results" :subjects="data.subjects" :options="options" />
          </div>
          <GradeShare />
        </section>

        <section class="block">
          <h2 class="block-step" :class="{ done: steps[2]!.done }">
            <span class="block-num" aria-hidden="true"><Check v-if="steps[2]!.done" :size="14" /><template v-else>3</template></span>
            {{ t('record.step3') }}
            <span v-if="steps[2]!.done" class="block-state">{{ t('record.stepDone') }}</span>
          </h2>
          <SkillsEditor v-model:skills="skills" />
        </section>

        <section class="block">
          <h2 class="block-step" :class="{ done: steps[3]!.done }">
            <span class="block-num" aria-hidden="true"><Check v-if="steps[3]!.done" :size="14" /><template v-else>4</template></span>
            {{ t('record.step4') }}
            <span v-if="steps[3]!.done" class="block-state">{{ t('record.stepDone') }}</span>
          </h2>
          <div class="block-card surface">
            <TopicChips v-model="interests" :topics="topics" :first-groups="3" />
          </div>
        </section>

        <p class="next">
          <a class="button button-accent" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
        </p>
      </div>

      <aside class="record-side">
        <SuggestionPreview />
        <WamGoal v-if="wam !== null" />
        <section class="backup surface">
          <div>
            <h2 class="backup-title">{{ t('record.backupTitle') }}</h2>
            <p class="backup-text">{{ t('record.backupText') }}</p>
            <p v-if="restoreFailed" class="backup-bad" role="alert">{{ t('record.restoreFailed') }}</p>
          </div>
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
  </div>
</template>

<style scoped>
.record {
  padding-top: 32px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  max-width: 1180px;
}

.record-lede {
  margin: 8px 0 0;
  color: var(--ink-soft);
}

.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.summary li {
  padding: 5px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-fill);
}

.summary li.empty {
  font-weight: 500;
  color: var(--ink-soft);
  border-style: dashed;
  background: none;
}

.summary a {
  margin-left: 4px;
  font-weight: 500;
}

/* Main column of numbered steps; a side column with live suggestions and tools. */
.record-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  gap: 28px;
  align-items: start;
}

.record-main {
  display: grid;
  gap: 28px;
  min-width: 0;
}

/* Not sticky: the column (suggestions, WAM goal, backup) is often taller than the screen, and a
   sticky column that tall hides its lower part until the page is scrolled to the very end. */
.record-side {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.block {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.block-step {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
}

.block-num {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
  background: var(--overprint);
  border-radius: 999px;
}

.block-step.done .block-num {
  background: var(--good, #2e8b57);
}

.block-state {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--good, #2e8b57);
}

.block-state.first {
  color: var(--overprint);
}

.block-card {
  display: grid;
  gap: 22px;
  min-width: 0;
  padding: 20px 22px;
}

/* The step label above already names these cards: their own headings stay for screen readers only. */
.block :deep(#results-title),
.block :deep(#skills-title) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Whatever sits in a step card stays within its width (a wide table scrolls inside instead). */
.block-card > :deep(*) {
  min-width: 0;
}

/* The degree card sits flat inside step 1's card. */
.block-card :deep(.flat) {
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.block-part {
  min-width: 0;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.block-part :deep(.goal-label),
.block-part :deep(.work-label) {
  margin-bottom: 6px;
  font-size: 1rem;
  font-weight: 650;
  color: var(--ink);
}

.block-part :deep(.seg) {
  max-width: 520px;
}

.next {
  display: flex;
  justify-content: flex-end;
  margin: 0;
}

.backup {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
}

.backup-title {
  font-size: 1rem;
  font-weight: 650;
}

.backup-text {
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.backup-bad {
  margin-top: 6px;
  font-weight: 600;
  color: var(--bad);
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* One column: the steps first, then suggestions and tools. */
@media (max-width: 960px) {
  .record-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .record-side {
    position: static;
  }
}
</style>
