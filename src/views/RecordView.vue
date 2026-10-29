<script setup lang="ts">
import InfoTip from '@/components/InfoTip.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import GuideToc from '@/components/guide/GuideToc.vue'
import DetailHero from '@/components/browse/DetailHero.vue'
import ResultsEditor from '@/components/profile/ResultsEditor.vue'
import SkillsEditor from '@/components/profile/SkillsEditor.vue'
import TopicChips from '@/components/profile/TopicChips.vue'
import SuggestionPreview from '@/components/profile/SuggestionPreview.vue'
import DegreeCard from '@/components/profile/DegreeCard.vue'
import GoalPicker from '@/components/profile/GoalPicker.vue'
import CareerGoalPicker from '@/components/profile/CareerGoalPicker.vue'
import GradeShare from '@/components/profile/GradeShare.vue'
import WorkHours from '@/components/profile/WorkHours.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PhoneMoreLinks from '@/components/layout/PhoneMoreLinks.vue'
import { planName } from '@/components/plans/planName'
import { usePlans } from '@/composables/usePlans'
import { ArrowRight } from 'lucide-vue-next'
import { usePlan } from '@/composables/usePlan'
import { link } from '@/composables/useView'
import { downloadBackup, restoreBackup } from '@/utils/backup'
import { useDataset } from '@/composables/useDataset'
import { useProfile } from '@/composables/useProfile'
import { creditPoints, isFail } from '@/engine'
import { useI18n } from '@/i18n'
import { termLabel } from '@/i18n/format'

/**
 * My record: the key numbers in the hero (points passed, WAM, target WAM), then the degree, the
 * marks, what the open plan wants (strengths, interests, goal), and at the foot sharing grades and
 * the backup. The record is shared by every plan; the profile below the plan switcher is the plan's.
 */
const { data, subjectList, topics } = useDataset()
const { profile, wam, setResults, setCredit, setSkills, setInterests, setTargetWam } = useProfile()
const art = () => import('@/components/profile/art/ArtRecord.vue')
const miniArt = () => import('@/components/profile/art/MiniRecord.vue')
// The target WAM lives on the record; the WAM calculator reads and sets the same one.
function onTarget(e: Event): void {
  const raw = (e.target as HTMLInputElement).value
  const n = Number(raw)
  setTargetWam(raw === '' || !Number.isFinite(n) ? undefined : Math.min(100, Math.max(0, n)))
}

const results = computed({ get: () => profile.value.results, set: setResults })
const credit = computed({ get: () => profile.value.credit ?? [], set: setCredit })
const skills = computed({ get: () => profile.value.skills, set: setSkills })
const interests = computed({ get: () => profile.value.interests, set: setInterests })
const { t } = useI18n()
const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
const ratedSkills = computed(() => Object.keys(profile.value.skills).length)
const { setupChosen, terms: planTerms, courseCheck, unstale } = usePlan()
// Old saved data: unmarked record copies go back to their semesters as planned (once).
unstale()
// The open plan in one line, or the way to make one.
const planFact = computed(() => {
  const last = [...planTerms.value].reverse().find((x) => x.subjects.length)
  if (!setupChosen.value || !last) return t.value('record.planNone')
  const statuses = courseCheck.value.statuses
  return t.value('record.planSome', {
    name: planName(t.value, activePlan.value),
    term: termLabel(t.value, last),
    met: statuses.filter((x) => x.status === 'ok').length,
    total: statuses.length,
  })
})
// Each subject passed counts once, however many attempts; credit for study elsewhere counts too.
const pointsPassed = computed(() => {
  const passed = new Set(profile.value.results.filter((r) => !isFail(r)).map((r) => r.code))
  return [...passed].reduce((n, c) => n + (data.value.subjects[c]?.points ?? 0), 0) + creditPoints(profile.value.credit)
})
// Strengths, interests and goal are the open plan's: say which one.
const { active: activePlan } = usePlans()
const forPlan = computed(() => t.value('plans.forPlan', { name: planName(t.value, activePlan.value) }))
const restoreFailed = shallowRef(false)
// Opened from "Credit or exemptions?" in the results header.
const creditOpen = shallowRef(false)

// "On this page", as on the guide: the page's sections by their headings' ids. Grade sharing only
// shows when there is something to share, so a row is listed only while its heading is on the page.
const TOC = [
  { id: 'sec-degree', key: 'record.degreeTitle', sub: false },
  { id: 'sec-results', key: 'record.step2', sub: false },
  { id: 'sec-plans', key: 'record.tocPlans', sub: false },
  { id: 'sec-strengths', key: 'record.secStrengths', sub: true },
  { id: 'sec-goal', key: 'record.secGoal', sub: true },
  { id: 'share-title', key: 'menu.gradeShare', sub: false },
  { id: 'sec-backup', key: 'record.backupLink', sub: false },
] as const
const body = useTemplateRef<HTMLElement>('body')
const present = shallowRef<string[]>([])
function look(): void {
  const ids = TOC.filter((i) => document.getElementById(i.id)).map((i) => i.id)
  if (ids.join() !== present.value.join()) present.value = ids
}
const tocItems = computed(() => TOC.filter((i) => present.value.includes(i.id)).map((i) => ({ id: i.id, title: t.value(i.key), sub: i.sub })))
let mo: MutationObserver | null = null
let lookFrame = 0
onMounted(() => {
  nextTick(look)
  if (!body.value) return
  mo = new MutationObserver(() => {
    cancelAnimationFrame(lookFrame)
    lookFrame = requestAnimationFrame(look)
  })
  mo.observe(body.value, { childList: true, subtree: true })
})
onBeforeUnmount(() => {
  mo?.disconnect()
  cancelAnimationFrame(lookFrame)
})

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
    <DetailHero :title="t('record.title')" :art="art">
      <p class="lede">{{ t('record.ledeShort') }}<InfoTip :text="t('record.lede')" /></p>
      <dl class="stats">
        <div class="stat">
          <dt>{{ t('record.statPoints') }}</dt>
          <dd class="stat-num">{{ pointsPassed }}</dd>
        </div>
        <div class="stat">
          <dt>WAM <InfoTip><a :href="link('guide/basics/#wam')">{{ t('guide.wamWhat') }}</a></InfoTip></dt>
          <dd class="stat-num">{{ wam ?? '–' }}</dd>
        </div>
        <div class="stat">
          <dt><label for="target-wam">{{ t('wamGoal.target') }}</label></dt>
          <dd>
            <input id="target-wam" class="input stat-input" type="number" inputmode="decimal" min="0" max="100" step="1" :value="profile.targetWam ?? ''" @change="onTarget" />
          </dd>
        </div>
        <div class="stat stat-plan">
          <dt>{{ t('record.statPlan') }}</dt>
          <dd><a class="stat-link" :href="link('plan')">{{ planFact }}<ArrowRight :size="15" aria-hidden="true" /></a></dd>
        </div>
      </dl>
    </DetailHero>

    <div class="record-article">
      <div class="record-toc">
        <GuideToc :items="tocItems" :art="miniArt" />
      </div>
      <div ref="body" class="record-body">
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
            <span class="sec-links">
              <button class="sec-link" type="button" data-testid="credit-entry" @click="creditOpen = true">{{ t('record.creditEntry') }}</button>
              <a class="sec-link" :href="link('tools/wam/')">{{ t('wamCalc.open') }}</a>
            </span>
          </header>
          <ResultsEditor v-model="results" v-model:credit="credit" v-model:credit-open="creditOpen" :subjects="data.subjects" :options="options" />
        </section>

        <!-- Plan A/B: right above what each plan keeps for itself (strengths, interests, goal). -->
        <div class="plans">
          <h2 id="sec-plans" class="visually-hidden">{{ t('record.tocPlans') }}</h2>
          <PlanSwitcher no-compare />
          <p class="hint">{{ t('plans.prefsNoteShort') }}<InfoTip :text="t('plans.prefsNote')" /></p>
        </div>

        <div class="pair">
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

          <div class="col">
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
            <SuggestionPreview />
            <a class="button button-accent next" :href="link('plan')">{{ t('record.next') }} <ArrowRight :size="16" aria-hidden="true" /></a>
          </div>
        </div>

        <div class="foot">
          <GradeShare class="foot-card" />
          <section class="foot-card backup surface" aria-labelledby="sec-backup">
            <h2 id="sec-backup" class="foot-title">{{ t('record.backupLink') }} <InfoTip :text="t('record.backupText')" /></h2>
            <p v-if="restoreFailed" class="bad" role="alert">{{ t('record.restoreFailed') }}</p>
            <div class="backup-actions">
              <button class="button button-quiet" type="button" @click="downloadBackup">{{ t('record.backup') }}</button>
              <label class="button button-quiet">
                {{ t('record.restore') }}
                <input class="visually-hidden" type="file" accept="application/json,.json" @change="onRestore" />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
    <PhoneMoreLinks />
  </div>
</template>

<style scoped>
.record {
  display: grid;
  gap: var(--space-5);
  padding-top: var(--space-4);
  min-width: 0;
}

/* The guide's layout (GuideView): "On this page" in a 232px column beside the sections; one
   column, the fold on top, at 960px and below. */
.record-article {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.record-toc {
  align-self: stretch;
}

.record-body {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.record-body :is(h2[id]) {
  scroll-margin-top: 96px;
}

@media (max-width: 960px) {
  .record-article {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}

.lede {
  margin: 0;
  color: var(--ink-soft);
}

/* The plan's line: a link, the size of the labels' text, not a big number. */
.stat-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
  font-weight: var(--fw-bold);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.stat-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* The hero's key numbers: one row, each a label over its number. */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-6);
  margin: var(--space-2) 0 0;
}

.stat {
  display: grid;
  gap: 2px;
  align-content: start;
}

.stat dt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-small);
  font-weight: var(--fw-semibold);
  color: var(--ink-soft);
}

.stat dd {
  margin: 0;
}

.stat-num {
  font-family: var(--font-code);
  font-size: 2rem;
  font-weight: 600;
  line-height: 44px;
  color: var(--ink);
}

.stat-input {
  width: 5.5em;
  min-height: 44px;
  font-family: var(--font-code);
  font-size: 1.25rem;
  font-weight: 600;
}

/* One card per section, one heading style; whatever a component brings as its own card or
   heading is folded into the section so there is never a box in a box. */
.sec {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
  scroll-margin-top: 88px;
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

.sec-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-4);
  margin-inline-start: auto;
}

.sec-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  cursor: pointer;
}

.sec-link:hover {
  text-decoration: underline;
}

.sec-state,
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
.sec :deep(:is(.goal-label, .work-label)) {
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

/* Strengths, then the goal, stacked in the one main column. */
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
}

.col {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.next {
  justify-self: end;
}

/* Sharing grades and the backup: small cards side by side at the foot. */
.foot {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: var(--space-5);
}

.foot-card {
  min-width: 0;
  padding: var(--space-5);
}

.foot-card :deep(#share-title) {
  scroll-margin-top: 96px;
}

.backup {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  scroll-margin-top: 96px;
}

.foot-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
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
}

@media (max-width: 640px) {
  .record,
  .record-body {
    gap: var(--space-4);
  }

  .record {
    padding-top: var(--space-3);
  }

  .sec,
  .foot-card {
    padding: var(--space-4);
  }

  .stats {
    gap: var(--space-3) var(--space-5);
  }

  .next {
    justify-self: stretch;
    justify-content: center;
  }
}
</style>
