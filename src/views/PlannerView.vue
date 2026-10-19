<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed, shallowRef } from 'vue'
import { CircleCheck, Pencil, RotateCcw, TriangleAlert, ChevronDown } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import SubjectPeek from '@/components/planner/SubjectPeek.vue'
import RuleLegend from '@/components/planner/RuleLegend.vue'
import PlanProgress from '@/components/planner/PlanProgress.vue'
import PlanHowBuilt from '@/components/planner/PlanHowBuilt.vue'
import PlanIssues from '@/components/planner/PlanIssues.vue'
import PlanPrint, { type PrintTerm } from '@/components/planner/PlanPrint.vue'
import Interp from '@/components/Interp.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PlanCompare from '@/components/plans/PlanCompare.vue'
import { PASS_MARK, informalPicks, isFail, passedCodes, planComponentIds, planRoles, type PlanTerm } from '@/engine'
import { Printer, Share2 } from 'lucide-vue-next'
import { decodePlan, encodePlan } from '@/utils/sharePlan'
import { go, useView } from '@/composables/useView'
import { useProfile } from '@/composables/useProfile'
import { useDataset } from '@/composables/useDataset'
import { usePlan, type PlanSetup } from '@/composables/usePlan'
import { usePlanStress } from '@/composables/usePlanStress'
import { pastTerms } from '@/utils/pastTerms'
import RatePrompt from '@/components/rating/RatePrompt.vue'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'
import { issueText, termLabel } from '@/i18n/format'

// The wizard copies the setup once, so it restarts when the dataset is switched.
const { data, subjectList, name: dataName } = useDataset()
const plan = usePlan()
const { profile, setConfirmed, setResults } = useProfile()
const { t } = useI18n()

const editing = shallowRef(false)
// Two plans side by side, in place of the board.
const comparing = shallowRef(false)

// A plan someone shared: /plan?share=… (packed into the link, no server).
const { query } = useView()
const shared = computed(() => {
  const code = query.value.get('share')
  return code ? decodePlan(code) : null
})
function importShared(): void {
  if (!shared.value) return
  plan.importPlan(shared.value.setup, shared.value.terms)
  editing.value = false
  go('plan')
}

const copied = shallowRef(false)
async function share(): Promise<void> {
  const url = new URL(link(`plan?share=${encodePlan(plan.setup.value, plan.terms.value)}`), location.href).href
  try {
    if (navigator.share) await navigator.share({ title: 'PickMySubjects', url })
    else await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    // Cancelled, or the clipboard is blocked: show the link so it can be copied by hand.
    window.prompt(t.value('plan.share'), url)
  }
}

function printPlan(): void {
  window.print()
}
const extraTermsOnVisa = computed(
  () => plan.setup.value.international === true && plan.notes.value.some((n) => typeof n !== 'string' && n.key === 'extraTerms'),
)
const peek = shallowRef<string | null>(null)
// Nothing in "Me" says what the student finds hard (no skills rated, no marks): the plan
// can't keep their weak spots apart, so point there (it's optional).
const profileEmpty = computed(
  () => Object.keys(profile.value.skills).length === 0 && !profile.value.results.some((r) => r.mark !== undefined),
)
// The student's completed subjects, in the semesters they were taken, shown before the plan.
const past = computed(() => pastTerms(profile.value.results))
// Weak spots the degree leans on every semester: said once here, not on each semester.
const { stress } = usePlanStress()
const unavoidable = computed(() =>
  stress.value.unavoidable.map((u) => t.value('stress.unavoidable', { skill: t.value(`skill.${u.skill}`), total: u.total, perTerm: u.perTerm })),
)
// A first visit shows only the questions; the board and its checks come once there's a plan.
// A shared link shows its import banner instead.
// Subjects the student failed: where the plan repeats them, or that it doesn't (an elective can be swapped).
const failed = computed(() =>
  profile.value.results
    // Passed on a later attempt: nothing left to say about the earlier fail.
    .filter((r) => isFail(r) && !profile.value.results.some((x) => x.code === r.code && !isFail(x)))
    .map((r) => {
      const at = plan.terms.value.find((term) => term.subjects.includes(r.code))
      return { code: r.code, term: at ? termLabel(t.value, at) : null }
    }),
)
const showWizard = computed(
  () => editing.value || (!plan.setupChosen.value && !shared.value),
)

const options = computed(() => subjectList.value.map((s) => ({ code: s.code, title: s.title })))
// Which planned subjects the degree or major insists on, shown as a tag on each card.
const roles = computed(() => {
  const { course, courseYear } = plan.setup.value
  const r = planRoles(data.value, course, courseYear, planComponentIds(plan.plan.value).filter((id): id is string => !!id))
  const out: Record<string, 'required' | 'option'> = {}
  for (const c of r.required) out[c] = 'required'
  for (const c of r.options) out[c] = 'option'
  return out
})
const rules = computed(() => plan.course.value?.rules ?? [])
const allIssues = computed(() => [...plan.termIssues.value, ...plan.courseCheck.value.issues])

const problems = computed(() => allIssues.value.filter((i) => i.severity === 'error').length)
// Say what the problems are right under the status, not only in the collapsed details.
// Problems if there are any, otherwise the things that can't be checked yet.
const problemTexts = computed(() => {
  const severity = problems.value ? 'error' : 'warning'
  return allIssues.value
    .filter((i) => i.severity === severity)
    .map((i) => ({
      text: issueText(t.value, i, rules.value, plan.courseCheck.value.statuses, data.value.subjects, plan.setup.value.course),
      // Conditions only the student can check (a VCE score, a test): let them say they meet it.
      confirm: i.kind === 'prereq-unknown' ? i.subject : undefined,
    }))
})
const hasConfirmable = computed(() => problemTexts.value.some((p) => p.confirm))
const unknowns = computed(
  () =>
    plan.courseCheck.value.statuses.filter((s) => s.status === 'unknown').length +
    plan.termIssues.value.filter((i) => i.severity === 'warning').length,
)
const majorTitle = computed(() => {
  const field = plan.setup.value.field
  const major =
    data.value.components.find((c) => c.id === plan.setup.value.major)?.title ??
    (field ? t.value('wizard.fieldUndecided', { field: t.value(`majorGroup.${field}`) }) : t.value('wizard.notSure'))
  const second = plan.plan.value.major2 ? data.value.components.find((c) => c.id === plan.plan.value.major2)?.title : undefined
  const spec = data.value.components.find((c) => c.id === plan.setup.value.specialisation)?.title
  const minor = (plan.setup.value.minors ?? []).map((id) => data.value.components.find((c) => c.id === id)?.title).filter(Boolean).join(' + ')
  const main = [major, second, spec].filter(Boolean).join(' + ')
  const key = informalPicks(data.value, plan.setup.value.minors) ? 'plans.informalLine' : 'plans.minorLine'
  return minor ? `${main} · ${t.value(key, { title: minor })}` : main
})
const summary = computed(() =>
  t.value('wizard.summary', {
    course: plan.course.value?.title ?? plan.setup.value.course,
    term: termLabel(t.value, { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }),
    major: majorTitle.value,
  }),
)

function finishWizard(setup: PlanSetup): void {
  if (!plan.updateSetup(setup)) plan.generate()
  editing.value = false
}
// The plan's semester for the subject open in the peek, if it's in the plan.
const peekTerm = computed(() => {
  const i = plan.terms.value.findIndex((x) => x.subjects.includes(peek.value ?? ''))
  return i >= 0 ? { index: i, term: plan.terms.value[i] as PlanTerm } : null
})
const { shouldPrompt } = useRated()
const rateNext = shallowRef<string | null>(null)
// Done with a planned subject: it moves to My record, in the semester it was planned for.
function markDone(code: string, mark: number | undefined): void {
  const where = peekTerm.value
  if (!where) return
  const { year, period } = where.term
  // An earlier fail stays: both attempts are on the transcript and count in the WAM.
  setResults([...profile.value.results.filter((r) => r.code !== code || isFail(r)), { code, year, period, ...(mark === undefined ? {} : { mark }) }])
  plan.removeSubject(where.index, code)
  // Just finished it: offer to rate it, once per subject.
  if (shouldPrompt(code)) rateNext.value = code
}
// The plan and My record disagree: a planned subject is already passed, or a semester holds
// more than its load once its recorded subjects are counted. (A part-done semester the plan
// carries on in is fine: its done and planned subjects share the column.) Names the semester.
const recordOverlap = computed(() => {
  const passed = new Set(passedCodes(profile.value.results))
  const load = plan.course.value?.standardLoad ?? 50
  const pts = (c: string) => data.value.subjects[c]?.points ?? 12.5
  for (const term of plan.terms.value) {
    if (term.subjects.some((c) => passed.has(c))) return termLabel(t.value, term)
    const recorded = profile.value.results
      .filter((r) => r.year === term.year && r.period === term.period && passed.has(r.code))
      .reduce((sum, r) => sum + pts(r.code), 0)
    if (recorded > 0 && recorded + term.subjects.reduce((sum, c) => sum + pts(c), 0) > load) return termLabel(t.value, term)
  }
  return null
})
// Something on the board: planned subjects, or ones already on My record (a finished degree has
// only those). The checks, the progress and the printout show for either.
const onBoard = computed(() => !plan.isEmpty.value || profile.value.results.length > 0)

// The printout: every semester in order, done subjects (with marks) and planned ones together.
const printTerms = computed<PrintTerm[]>(() => {
  const order = (y: number, p: string) => y * 10 + ['summer', 'semester-1', 'winter', 'semester-2'].indexOf(p)
  const by = new Map<string, PrintTerm>()
  const at = (year: number | null, period: PlanTerm['period'] | null) => {
    const key = `${year}|${period}`
    if (!by.has(key)) by.set(key, { year, period, items: [] })
    return by.get(key) as PrintTerm
  }
  for (const r of past.value.undated) at(null, null).items.push({ code: r.code, mark: r.mark, state: r.failed ? 'failed' : 'done' })
  for (const term of past.value.terms) for (const r of term.results) at(term.year, term.period).items.push({ code: r.code, mark: r.mark, state: r.failed ? 'failed' : 'done' })
  for (const term of plan.terms.value) {
    const slot = at(term.year, term.period)
    for (const c of term.subjects) slot.items.push({ code: c, state: 'planned' })
  }
  // An empty semester left at the end of the plan prints as nothing.
  return [...by.values()].filter((x) => x.items.length > 0).sort((a, b) => (a.year === null ? -1 : b.year === null ? 1 : order(a.year, a.period as string) - order(b.year, b.period as string)))
})
</script>

<template>
  <div class="planner">
    <section class="intro">
      <h1 class="page-title">{{ t('plan.title') }}</h1>
      <template v-if="showWizard">
        <p class="page-lede">{{ t('plan.ledeShort') }}</p>
        <a class="guide-link" :href="link('guide')">{{ t('guide.planLink') }}</a>
      </template>
    </section>

    <PlanSwitcher v-if="!shared && !comparing" @compare="comparing = true; editing = false" />
    <PlanCompare v-if="comparing && !shared" @close="comparing = false" />

    <PlanWizard
      v-if="showWizard && !comparing"
      :key="dataName"
      :setup="plan.setup.value"
      :courses="data.courses.filter((c) => c.listed)"
      :components="data.components"
      :cancellable="!plan.isEmpty.value"
      @done="finishWizard"
      @cancel="editing = false"
    />

    <section v-if="shared" class="shared surface" role="status">
      <p class="shared-text">{{ t('plan.sharedText', { n: shared.terms.reduce((sum, x) => sum + x.subjects.length, 0) }) }}</p>
      <p v-if="!plan.isEmpty.value" class="shared-warn">{{ t('plan.sharedReplace') }}</p>
      <div class="shared-actions">
        <button class="button button-accent" type="button" @click="importShared">{{ t('plan.sharedImport') }}</button>
        <button class="button button-quiet" type="button" @click="go('plan')">{{ t('plan.sharedDismiss') }}</button>
      </div>
    </section>

    <template v-else-if="!showWizard && !comparing">
      <section class="bar">
        <p class="bar-summary">{{ summary }}</p>
        <div class="bar-actions">
          <button class="button button-quiet" type="button" @click="editing = true">
            <Pencil :size="16" aria-hidden="true" /> {{ t('wizard.edit') }}
          </button>
          <button class="button button-quiet" type="button" @click="share">
            <Share2 :size="16" aria-hidden="true" /> {{ copied ? t('plan.copied') : t('plan.share') }}
          </button>
          <button class="button button-quiet" type="button" @click="printPlan">
            <Printer :size="16" aria-hidden="true" /> {{ t('plan.print') }}
          </button>
          <button class="button button-quiet" type="button" @click="plan.generate()">
            <RotateCcw :size="16" aria-hidden="true" /> {{ t('plan.rebuild') }}
          </button>
        </div>
      </section>

      <!-- The record now reaches into the plan's own semesters (filled in after the plan was made). -->
      <p v-if="recordOverlap" class="started">
        {{ t('plan.recordOverlap', { term: recordOverlap }) }}
        <button class="button button-quiet" type="button" @click="plan.generate()">{{ t('plan.rebuild') }}</button>
      </p>

      <p v-if="profileEmpty" class="started">
        <Interp :text="t('plan.fillRecord')">
          <template #record>
            <a :href="link('record')">{{ t('nav.record') }}</a>
          </template>
        </Interp>
      </p>

      <p v-for="u in unavoidable" :key="u" class="started">{{ u }}</p>

      <p v-if="extraTermsOnVisa" class="started">{{ t('plan.extraTermsVisa') }}</p>

      <ul v-if="failed.length" class="failed">
        <li v-for="f in failed" :key="f.code">
          {{ f.term ? t('plan.failedRetake', { code: f.code, term: f.term }) : t('plan.failedNotPlanned', { code: f.code }) }}
        </li>
        <li class="failed-more"><a :href="link('guide')">{{ t('guide.failTitle') }}</a></li>
      </ul>

      <section v-if="onBoard" class="status" :class="problems ? 'status-bad' : unknowns ? 'status-warn' : 'status-good'" role="status">
        <component :is="problems || unknowns ? TriangleAlert : CircleCheck" :size="22" aria-hidden="true" />
        <div>
          <p class="status-title">
            <template v-if="problems">{{ t('plan.statusProblems', { n: problems }) }}</template>
            <template v-else-if="unknowns">{{ t('plan.statusUnknown', { n: unknowns }) }}</template>
            <template v-else>{{ t('plan.statusOk') }}</template>
          </p>
          <ul v-if="problemTexts.length" class="status-list">
            <li v-for="(p, i) in problemTexts.slice(0, 5)" :key="i">
              {{ p.text }}
              <button v-if="p.confirm" class="confirm" type="button" @click="setConfirmed(p.confirm, true)">
                {{ t('plan.iMeetThis') }}
              </button>
            </li>
          </ul>
          <p v-if="hasConfirmable" class="status-hint">{{ t('plan.confirmHint') }}</p>
        </div>
      </section>

      <RatePrompt v-if="rateNext" :key="rateNext" :code="rateNext" @close="rateNext = null" />

      <PlanProgress v-if="onBoard" :statuses="plan.courseCheck.value.statuses" :rules="rules" />
      <PlanMap
        class="map"
        :terms="plan.terms.value"
        :subjects="data.subjects"
        :issues="plan.termIssues.value"
        :course="plan.setup.value.course"
        :load="plan.course.value?.standardLoad ?? 50"
        :options="options"
        :roles="roles"
        :past="past"
        @add="plan.addSubject"
        @remove="plan.removeSubject"
        @move="plan.moveSubject"
        @add-term="plan.addTerm()"
        @add-term-at="(year, period) => plan.addTermAt(year, period)"
        @remove-term="(i) => plan.removeTerm(i)"
        @open="peek = $event"
        @remove-last-term="plan.removeLastTerm()"
      />

      <SubjectPeek
        v-if="peek"
        :key="peek"
        :code="peek"
        :subject="data.subjects[peek]"
        :subjects="data.subjects"
        :have="[...plan.plannedCodes.value, ...plan.plan.value.completed]"
        :course="plan.setup.value.course"
        :year="plan.terms.value[0]?.year ?? new Date().getFullYear()"
        :done="plan.plan.value.completed"
        @close="peek = null"
        @open="peek = $event"
        @swap="(from, to) => plan.swapSubject(from, to)"
        :done-term="peekTerm ? termLabel(t, peekTerm.term) : undefined"
        :pass-fail="data.subjects[peek]?.passFail"
        @mark-done="(m) => markDone(peek as string, m)"
      />

      <details class="details surface">
        <summary class="details-summary">
          <span>{{ t('plan.details') }}</span>
          <ChevronDown :size="18" aria-hidden="true" class="details-chevron" />
        </summary>
        <div class="details-body">
          <!-- How to read the board and the census-date reminder live here, not above the plan. -->
          <div class="details-info">
            <p>{{ t('plan.hint') }} {{ t('plan.tagLegend') }}</p>
            <p>
              {{ t('plan.censusLine') }}
              <a :href="link('guide')">{{ t('guide.datesTitle') }}</a>
            </p>
          </div>
          <div class="details-pair">
            <RuleLegend class="details-card" :statuses="plan.courseCheck.value.statuses" :rules="rules" :title="plan.course.value?.title ?? ''" />
            <PlanIssues class="details-card" :issues="allIssues" :rules="rules" :statuses="plan.courseCheck.value.statuses" />
          </div>
          <PlanHowBuilt
            v-if="plan.notes.value.length || plan.unplaced.value.length"
            :notes="plan.notes.value"
            :rules="rules"
            :unplaced="plan.unplaced.value"
            @open="peek = $event"
          />
        </div>
      </details>
    </template>
    <PlanPrint
      v-if="!showWizard && !comparing && onBoard"
      class="print-only"
      :summary="summary"
      :terms="printTerms"
      :subjects="data.subjects"
      :roles="roles"
      :notes="problemTexts.map((p) => p.text)"
    />
  </div>
</template>

<style scoped>
.planner {
  display: grid;
  gap: 20px;
  padding-top: 32px;
}

/* Everything but the board stays at the usual reading width; the board takes the full screen. */
.planner > :not(.map) {
  width: 100%;
  max-width: calc(var(--shell) - 40px);
  margin-inline: auto;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.bar-summary {
  font-size: 1.05rem;
  font-weight: 600;
}

.bar-actions {
  display: flex;
  gap: 8px;
}

.bar-actions .button {
  white-space: nowrap;
}

.intro {
  display: grid;
  gap: 6px;
}

.guide-link {
  justify-self: start;
  font-size: 0.9375rem;
  color: var(--accent);
}

/* Phones: the four actions as a tidy 2 × 2 grid instead of squeezed pills. */
@media (max-width: 720px) {
  .bar-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
}

.started {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: var(--accent-soft);
  font-size: 0.9375rem;
}

.failed {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 12px 16px 12px 32px;
  font-size: 0.9375rem;
  background: var(--bad-soft);
  border-radius: var(--radius);
}

.failed-more {
  list-style: none;
  margin-left: -16px;
}

.failed-more a {
  color: var(--bad);
}

.status {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
}

.status > svg {
  flex-shrink: 0;
}

.status-good {
  background: var(--good-soft);
  color: var(--good);
}

.status-warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.status-bad {
  background: var(--bad-soft);
  color: var(--bad);
}

.status-title {
  font-weight: 650;
}

.hint {
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.status-list {
  display: grid;
  gap: 4px;
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 0.9375rem;
  color: var(--ink);
}

.status-text {
  margin-top: 2px;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.details {
  padding: 0 22px;
}

.details-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

.details-summary::-webkit-details-marker {
  display: none;
}

.details-chevron {
  flex: none;
  color: var(--ink-faint);
  transition: transform 0.15s;
}

.details[open] .details-chevron {
  transform: rotate(180deg);
}

/* One column: rules and checks side by side only when there's room for both. */
.details-body {
  display: grid;
  gap: 20px;
  padding: 4px 0 22px;
}

.details-info {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  font-size: 0.875rem;
  color: var(--ink-soft);
}

.details-info p {
  margin: 0;
}

.details-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  align-items: start;
  gap: 16px;
}

.details-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--glass-edge);
  border-radius: 16px;
  background: var(--glass-fill);
}

/* Folded parts inside (met rules, assumption notes) share one look: a chevron, not the browser triangle. */
.details-body :deep(details > summary) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-soft);
  cursor: pointer;
  list-style: none;
}

.details-body :deep(details > summary::-webkit-details-marker) {
  display: none;
}

.details-body :deep(details > summary::before) {
  content: '';
  flex: none;
  width: 6px;
  height: 6px;
  margin: 0 4px 0 2px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.15s;
}

.details-body :deep(details[open] > summary::before) {
  transform: rotate(45deg);
}




.confirm {
  margin-left: 6px;
  padding: 1px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: none;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: inherit;
  cursor: pointer;
}

.status-hint {
  margin-top: 6px;
  font-size: 0.875rem;
  opacity: 0.85;
}
.shared {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
}

.shared-text {
  font-weight: 600;
}

.shared-warn {
  font-size: 0.9375rem;
  color: var(--warn);
}

.shared-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Printing (or saving as PDF): only the print layout, not the screen page. */
@media print {
  .planner > :not(.print-only) {
    display: none !important;
  }

  .planner {
    display: block;
    padding-top: 0;
  }
}
</style>
