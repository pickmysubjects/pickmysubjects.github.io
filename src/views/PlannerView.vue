<script setup lang="ts">
import { link } from '@/composables/useView'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { CircleCheck, Pencil, RotateCcw, TriangleAlert, ChevronDown } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import SubjectPeek from '@/components/planner/SubjectPeek.vue'
import RuleLegend from '@/components/planner/RuleLegend.vue'
import PlanRequirements from '@/components/planner/PlanRequirements.vue'
import SubjectTimeline from '@/components/planner/SubjectTimeline.vue'
import PlanHowBuilt from '@/components/planner/PlanHowBuilt.vue'
import PlanIssues from '@/components/planner/PlanIssues.vue'
import PlanPrint, { type PrintTerm } from '@/components/planner/PlanPrint.vue'
import Interp from '@/components/Interp.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PlanCompare from '@/components/plans/PlanCompare.vue'
import { informalPicks, isFail, passedCodes, planComponentIds, planRoles, planRules, recordedLoads, termLoad, type PlanTerm } from '@/engine'
import { diplomaTitle } from '@/composables/usePlanCompare'
import { Printer, Share2 } from 'lucide-vue-next'
import { decodePlan, encodePlan } from '@/utils/sharePlan'
import { boardEdges, countsToward } from '@/utils/planBoard'
import { cloneJson } from '@/utils/clone'
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

const STUDENT_SITE = 'https://students.unimelb.edu.au/'
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

// Which planned subjects the degree or major insists on, shown as a tag on each card.
const roleSets = computed(() => {
  const { course, courseYear } = plan.setup.value
  return planRoles(data.value, course, courseYear, planComponentIds(plan.plan.value).filter((id): id is string => !!id))
})
const roles = computed(() => {
  const r = roleSets.value
  const out: Record<string, 'required' | 'option'> = {}
  for (const c of r.required) out[c] = 'required'
  for (const c of r.options) out[c] = 'option'
  return out
})
// The degree's own rules (its progress meters), and those with the diploma's after them.
const rules = computed(() => plan.course.value?.rules ?? [])
const allRules = computed(() => planRules(data.value, plan.plan.value))
const allIssues = computed(() => [...plan.termIssues.value, ...plan.courseCheck.value.issues])

const problems = computed(() => allIssues.value.filter((i) => i.severity === 'error').length)
// Say what the problems are right under the status, not only in the collapsed details.
// Problems if there are any, otherwise the things that can't be checked yet.
const problemTexts = computed(() => {
  const severity = problems.value ? 'error' : 'warning'
  return allIssues.value
    .filter((i) => i.severity === severity)
    .map((i) => ({
      text: issueText(t.value, i, allRules.value, plan.courseCheck.value.statuses, data.value.subjects, plan.setup.value.course),
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
  const diploma = diplomaTitle(data.value, plan.setup.value)
  return [main, minor ? t.value(key, { title: minor }) : '', diploma ? t.value('plans.diplomaLine', { title: diploma }) : ''].filter(Boolean).join(' · ')
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
// Notes beside the status (shown when the line is opened).
const noteCount = computed(() => Number(profileEmpty.value) + unavoidable.value.length + Number(extraTermsOnVisa.value) + failed.value.length)
// A term has begun once its first month has: only then can a subject in it be marked done.
const START_MONTH = { summer: 0, 'semester-1': 2, winter: 5, 'semester-2': 6 } as const
const begun = (term: PlanTerm) => new Date() >= new Date(term.year, START_MONTH[term.period], 1)
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
// The board's focus: a selected subject (its timeline lights up) or a requirement (its subjects do).
const board = useTemplateRef<InstanceType<typeof PlanMap>>('board')
const selected = shallowRef<string | null>(null)
const ruleFocus = shallowRef<string | null>(null)
// Closing the subject window also clears its timeline, so the board is back to normal in one step.
function closePeek(): void {
  peek.value = null
  selected.value = null
}
function select(code: string | null): void {
  selected.value = code
  if (code) ruleFocus.value = null
}
function focusRule(id: string | null): void {
  ruleFocus.value = id
  if (id) selected.value = null
}
const edges = computed(() => boardEdges(plan.terms.value, past.value, data.value.subjects))
// Where each subject sits, for the timeline: its planned term, or "Done".
const whereOf = computed(() => {
  const out: Record<string, string> = {}
  for (const r of profile.value.results) if (!isFail(r)) out[r.code] = t.value('plan.pastTag')
  for (const term of plan.terms.value) for (const c of term.subjects) out[c] = termLabel(t.value, term)
  return out
})
const boardCodes = computed(() => [...passedCodes(profile.value.results), ...plan.plannedCodes.value])
const majorSubjects = computed(() => new Set([...roleSets.value.required, ...roleSets.value.options]))
// Each requirement's subjects, counted automatically (nothing to tag).
const members = computed(() => {
  const out: Record<string, string[]> = {}
  for (const rule of allRules.value) {
    out[rule.id] = boardCodes.value.filter((c) => countsToward(rule, c, data.value.subjects, plan.setup.value.course, majorSubjects.value))
  }
  return out
})
const ruleCodes = computed(() => (ruleFocus.value ? new Set(members.value[ruleFocus.value] ?? []) : null))

// Every change on the board can be taken back once, from a short note at the bottom.
const undo = shallowRef<{ text: string; terms: PlanTerm[] } | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | undefined
function change(text: string, act: () => void): void {
  const before = cloneJson(plan.terms.value)
  act()
  undo.value = { text, terms: before }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => (undo.value = null), 8000)
}
function undoLast(): void {
  if (!undo.value) return
  plan.restoreTerms(undo.value.terms)
  undo.value = null
}
onBeforeUnmount(() => clearTimeout(undoTimer))
const labelAt = (i: number) => {
  const term = plan.terms.value[i]
  return term ? termLabel(t.value, term) : ''
}
function onAdd(i: number, code: string): void {
  change(t.value('plan.didAdd', { code, term: labelAt(i) }), () => plan.addSubject(i, code))
}
function onReplace(i: number, from: string, to: string): void {
  change(t.value('plan.didSwap', { from, to }), () => plan.replaceSubject(i, from, to))
  if (selected.value === from) selected.value = to
}
function onRemove(i: number, code: string): void {
  change(t.value('plan.didRemove', { code }), () => plan.removeSubject(i, code))
  if (selected.value === code) selected.value = null
}
function onMove(code: string, from: number, to: number): void {
  if (from === to) return
  change(t.value('plan.didMove', { code, term: labelAt(to) }), () => plan.moveSubject(code, from, to))
}

// The plan and My record disagree: a planned subject is already passed, or a semester holds
// more than its load once its recorded subjects are counted. (A part-done semester the plan
// carries on in is fine: its done and planned subjects share the column.) Names the semester.
const recordOverlap = computed(() => {
  const passed = new Set(passedCodes(profile.value.results))
  const load = plan.course.value?.standardLoad ?? 50
  for (const term of plan.terms.value) {
    if (term.subjects.some((c) => passed.has(c))) return termLabel(t.value, term)
    // Year-long subjects: half their points on each of their semesters.
    const recorded = recordedLoads(profile.value.results.filter((r) => passed.has(r.code)), data.value)[`${term.year}|${term.period}`] ?? 0
    const i = plan.terms.value.indexOf(term)
    if (recorded > 0 && recorded + termLoad(plan.terms.value, i, data.value) > load) return termLabel(t.value, term)
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
        <p class="page-lede">{{ t('plan.ledeShort') }} <a class="guide-link" :href="link('guide')">{{ t('guide.nav') }} →</a></p>
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

      <!-- The plan's status and every note about it, as one slim line that opens. Problems open it by themselves. -->
      <details v-if="onBoard" class="status glass" :class="problems ? 'status-bad' : unknowns ? 'status-warn' : 'status-good'" :open="problems > 0">
        <summary class="status-line" role="status">
          <component :is="problems || unknowns ? TriangleAlert : CircleCheck" :size="18" aria-hidden="true" />
          <span class="status-title">
            <template v-if="problems">{{ t('plan.statusProblems', { n: problems }) }}</template>
            <template v-else-if="unknowns">{{ t('plan.statusUnknown', { n: unknowns }) }}</template>
            <template v-else>{{ t('plan.statusOk') }}</template>
          </span>
          <span v-if="noteCount" class="status-more">{{ t('plan.moreNotes', { n: noteCount }) }}</span>
          <ChevronDown :size="16" aria-hidden="true" class="status-chevron" />
        </summary>
        <div class="status-body">
          <ul v-if="problemTexts.length" class="status-list">
            <li v-for="(p, i) in problemTexts.slice(0, 5)" :key="i" class="status-item">
              <span>{{ p.text }}</span>
              <button v-if="p.confirm" class="button button-quiet confirm" type="button" @click="setConfirmed(p.confirm, true)">
                {{ t('plan.iMeetThis') }}
              </button>
            </li>
          </ul>
          <p v-if="hasConfirmable" class="status-hint">{{ t('plan.confirmHint') }}</p>
          <p v-if="profileEmpty" class="status-hint">
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
            <li class="failed-more"><a :href="link('guide/semester/#fail')">{{ t('guide.failTitle') }}</a></li>
          </ul>
        </div>
      </details>

      <RatePrompt v-if="rateNext" :key="rateNext" :code="rateNext" @close="rateNext = null" />

      <div class="workspace">
        <div class="workspace-main">
          <PlanRequirements
            v-if="onBoard"
            :statuses="plan.courseCheck.value.statuses"
            :rules="allRules"
            :degree-rules="rules"
            :members="members"
            :active="ruleFocus"
            @focus="focusRule"
          />
          <p class="draft">
            {{ t('plan.draftNote') }}
            <a :href="STUDENT_SITE" target="_blank" rel="noopener">{{ t('plan.draftLink') }}</a>
          </p>
          <SubjectTimeline
            v-if="selected"
            class="timeline-bar"
            bar
            :code="selected"
            :edges="edges"
            :where-of="whereOf"
            @select="select"
            @open="peek = $event"
            @clear="select(null)"
          />
          <PlanMap
            ref="board"
            :terms="plan.terms.value"
            :subjects="data.subjects"
            :issues="plan.termIssues.value"
            :course="plan.setup.value.course"
            :load="plan.course.value?.standardLoad ?? 50"
            :roles="roles"
            :option-set="roleSets.options"
            :past="past"
            :edges="edges"
            :selected="selected"
            :rule-codes="ruleCodes"
            @add="onAdd"
            @replace="onReplace"
            @remove="onRemove"
            @move="onMove"
            @add-term="plan.addTerm()"
            @add-term-at="(year, period) => plan.addTermAt(year, period)"
            @remove-term="(i) => plan.removeTerm(i)"
            @open="peek = $event"
            @select="select"
            @remove-last-term="plan.removeLastTerm()"
          />
        </div>
      </div>

      <div v-if="undo" class="undo" role="status">
        <span>{{ undo.text }}</span>
        <button class="undo-button" type="button" @click="undoLast">{{ t('plan.undo') }}</button>
      </div>

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
        @close="closePeek"
        @open="peek = $event"
        @swap="(from, to) => plan.swapSubject(from, to)"
        :done-term="peekTerm && begun(peekTerm.term) ? termLabel(t, peekTerm.term) : undefined"
        :pass-fail="data.subjects[peek]?.passFail"
        @mark-done="(m) => markDone(peek as string, m)"
        :planned="!!peekTerm"
        @swap-it="board?.openSwap(peek as string)"
        @move-it="board?.openMove(peek as string)"
        @remove-it="peekTerm && onRemove(peekTerm.index, peek as string)"
      >
        <SubjectTimeline :code="peek" :edges="edges" :where-of="whereOf" @select="peek = $event" />
      </SubjectPeek>

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
              <a :href="link('guide/key-dates/')">{{ t('guide.datesTitle') }}</a>
            </p>
          </div>
          <div class="details-pair">
            <RuleLegend class="details-card" :statuses="plan.courseCheck.value.statuses" :rules="allRules" :title="plan.course.value?.title ?? ''" />
            <PlanIssues class="details-card" :issues="allIssues" :rules="allRules" :statuses="plan.courseCheck.value.statuses" />
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
.planner > :not(.workspace, dialog) {
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
  white-space: nowrap;
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

/* The shared glass card; only the icon and the one-line verdict carry the tone. */
.status {
  padding: 0 var(--space-4);
  border-radius: var(--radius-lg);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  cursor: pointer;
  list-style: none;
}

.status-line::-webkit-details-marker {
  display: none;
}

.status-line > svg {
  flex-shrink: 0;
}

.status-more {
  font-size: 0.8125rem;
  opacity: 0.8;
}

.status-chevron {
  margin-left: auto;
  transition: transform 0.15s;
}

.status[open] .status-chevron {
  transform: rotate(180deg);
}

.status-body {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-1) 0 var(--space-4) 28px;
  color: var(--ink);
}

.status-body .started,
.status-body .failed {
  color: var(--ink);
}

.status-good .status-line {
  color: var(--good);
}

.status-warn .status-line {
  color: var(--warn);
}

.status-bad .status-line {
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
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9375rem;
  color: var(--ink);
}

.status-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
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




/* A standard quiet button, one size down. */
.confirm {
  min-height: 32px;
  padding: 0 14px;
  font-size: 0.8125rem;
}

.status-hint {
  max-width: 60ch;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft);
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

/* The board takes the full width, with the requirements beside it on wide screens. */
.workspace {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 1800px;
  margin-inline: auto;
  padding-inline: 20px;
}

.workspace-main {
  display: grid;
  gap: 12px;
  align-content: start;
  min-width: 0;
}

.workspace-side {
  min-width: 0;
}

@media (max-width: 640px) {
  .workspace {
    padding-inline: 0;
  }

  /* Phones: the timeline stays where it is instead of covering the screen. */
  .timeline-bar {
    position: static;
  }
}

.timeline-bar {
  position: sticky;
  top: 8px;
  z-index: 20;
}

.draft {
  font-size: 0.8125rem;
  color: var(--ink-faint);
}

.draft a {
  color: var(--ink-soft);
}

.undo {
  position: fixed;
  z-index: 50;
  left: 50%;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 18px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bg);
  font-size: 0.875rem;
  box-shadow: var(--shadow-2);
  transform: translateX(-50%);
}

.undo-button {
  flex: none;
  padding: 4px 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
  color: inherit;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
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
