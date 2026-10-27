<script setup lang="ts">
import { trackEvent } from '@/utils/analytics'
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { link } from '@/composables/useView'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { CircleCheck, Pencil, RotateCcw, TriangleAlert, ChevronDown } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import SubjectPeek from '@/components/planner/SubjectPeek.vue'
import PlanRequirements from '@/components/planner/PlanRequirements.vue'
import SubjectTimeline from '@/components/planner/SubjectTimeline.vue'
import PlanHowBuilt from '@/components/planner/PlanHowBuilt.vue'
import PlanIssues from '@/components/planner/PlanIssues.vue'
import PlanPrint, { type PrintTerm } from '@/components/planner/PlanPrint.vue'
import Interp from '@/components/Interp.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PlanCompare from '@/components/plans/PlanCompare.vue'
import { assumedOfferings, careerGap, careerGoal, careerName, hasEnded, heldMajorIds, informalPicks, isFail, passedCodes, planComponentIds, planRoles, planRules, recordedLoads, termLoad, type PlanTerm } from '@/engine'
import { diplomaTitle } from '@/composables/usePlanCompare'
import { ImageDown, Printer, Share2, Sparkles, X } from 'lucide-vue-next'
import { usePlans } from '@/composables/usePlans'
import { sharePlanImage } from '@/utils/planImage'
import { localTitle } from '@/i18n/localized'
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
const { t, locale } = useI18n()

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
  trackEvent('plan-share')
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
  trackEvent('plan-print')
  window.print()
}

// The plan as a picture (for 小红书 and the like): made in the browser, never uploaded. Only the
// planned semesters go in it, none of My record (marks, WAM).
const imaging = shallowRef(false)
async function saveImage(): Promise<void> {
  if (imaging.value) return
  imaging.value = true
  try {
    const status = problems.value
      ? { text: t.value('plan.statusProblems', { n: problems.value }), tone: 'bad' as const }
      : unknowns.value
        ? { text: t.value('plan.statusUnknown', { n: unknowns.value }), tone: 'warn' as const }
        : { text: t.value('plan.statusOk'), tone: 'good' as const }
    const site = new URL(link(''), location.href)
    const result = await sharePlanImage(
      {
        site: 'PickMySubjects',
        url: `${site.host}${site.pathname}`.replace(/\/$/, ''),
        course: plan.course.value?.title ?? plan.setup.value.course,
        major: majorTitle.value,
        status,
        terms: plan.terms.value
          .filter((term) => term.subjects.length > 0)
          .map((term) => ({
            label: termLabel(t.value, term),
            subjects: term.subjects.map((c) => {
              const s = data.value.subjects[c]
              return { code: c, title: s ? localTitle(s, locale.value) || s.title : '' }
            }),
          })),
      },
      `pickmysubjects-plan-${locale.value}.png`,
    )
    if (result !== 'cancelled') trackEvent('plan-image-save')
  } finally {
    imaging.value = false
  }
}
const extraTermsOnVisa = computed(
  () => plan.setup.value.international === true && plan.notes.value.some((n) => typeof n !== 'string' && n.key === 'extraTerms'),
)
const peek = shallowRef<string | null>(null)
// The open plan says nothing about the student yet (no strengths, interests or career):
// one optional nudge toward "Me". Hidden for good per plan once dismissed.
const plans = usePlans()
const hintKey = computed(() => `sc:profileHint:${plans.active.value.id}`)
const hintHidden = shallowRef(new Set<string>())
function readHidden(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function hideHint(): void {
  try {
    localStorage.setItem(hintKey.value, '1')
  } catch {
    /* private mode: hidden for this visit only */
  }
  hintHidden.value = new Set([...hintHidden.value, hintKey.value])
}
const showProfileHint = computed(
  () =>
    Object.keys(profile.value.skills).length === 0 &&
    profile.value.interests.length === 0 &&
    !profile.value.career &&
    !hintHidden.value.has(hintKey.value) &&
    !readHidden(hintKey.value),
)
// The student's completed subjects, in the semesters they were taken, shown before the plan.
const past = computed(() => pastTerms(profile.value.results))
// Weak spots the degree leans on every semester: said once here, not on each semester.
const { stress } = usePlanStress()
const unavoidable = computed(() =>
  stress.value.unavoidable.map((u) => t.value('stress.unavoidable', { skill: t.value(`skill.${u.skill}`), total: u.total, perTerm: u.perTerm })),
)
// Heavy semesters, counted for the status card; the line jumps to the first one's note and fix.
const heavyTerms = computed(() => stress.value.terms.filter((x) => x && x.level !== 'ok').length)
function showHeavy(): void {
  const note = document.querySelector<HTMLElement>('[data-stress-term]')
  if (!note) return
  note.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
  note.focus({ preventScroll: true })
}
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
// A career goal whose accreditation route still needs subjects the plan doesn't have: one line,
// leaving out the major's compulsory subjects (the course check already says when they're missing).
const careerReminder = computed(() => {
  const goal = careerGoal(data.value, profile.value.career, heldMajorIds(plan.plan.value).filter((id): id is string => !!id))
  const body = goal?.major?.accreditation?.body
  if (!goal || !body) return null
  const have = new Set([...passedCodes(profile.value.results), ...plan.plannedCodes.value])
  const gap = careerGap(data.value, goal, have, roleSets.value.required)
  const codes = [...gap.required, ...gap.breadth]
  if (!codes.length) return null
  const career = careerName(goal.target.names, locale.value) || goal.target.names.en
  return { id: goal.target.id, text: t.value('careerGoal.gap', { career, body, codes: codes.join(t.value('listSep')) }) }
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
      // Course-rule issues are already listed by the requirements card.
      rule: 'ruleId' in i && !!i.ruleId,
    }))
})
// What the requirements card doesn't already say: subject-level problems.
const planProblems = computed(() => problemTexts.value.filter((p) => !p.rule))
const hasNotes = computed(() => planProblems.value.length > 0 || noteCount.value > 0)
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
const noteCount = computed(() => unavoidable.value.length + Number(extraTermsOnVisa.value) + failed.value.length)
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
// A semester that is over but still holds planned subjects the record doesn't have (made earlier).
const pastPlanned = computed(() => {
  const passed = new Set(passedCodes(profile.value.results))
  const term = plan.terms.value.find((x) => hasEnded(x) && x.subjects.some((c) => !passed.has(c)))
  return term ? termLabel(t.value, term) : null
})
// The Handbook year whose rules the plan uses, when it isn't the year the student started.
const rulesFrom = computed(() => {
  const c = plan.course.value
  const start = plan.plan.value.courseYear
  return plan.setupChosen.value && c && c.year !== start ? { year: c.year, start } : null
})
// A later year planned on an earlier Handbook's teaching periods: said once, at the top.
const assumed = computed(() => assumedOfferings(plan.plan.value, data.value))
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

    <PlanSwitcher v-if="!shared && !comparing" @compare="comparing = true; editing = false; trackEvent('compare-open')" />
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
        <!-- The setup line is itself the way to change it: one obvious target instead of a separate button. -->
        <button class="bar-summary" type="button" @click="editing = true">
          <span class="bar-summary-text">{{ summary }}</span>
          <span class="bar-edit"><Pencil :size="15" aria-hidden="true" /> {{ t('wizard.edit') }}</span>
        </button>
        <div class="bar-actions">
          <div class="bar-group" role="group">
            <button class="bar-tool" type="button" :aria-label="copied ? t('plan.copied') : t('plan.share')" :title="t('plan.share')" @click="share">
              <Share2 :size="16" aria-hidden="true" /> <span class="bar-label">{{ copied ? t('plan.copied') : t('plan.share') }}</span>
            </button>
            <button class="bar-tool" type="button" :disabled="imaging" :aria-label="t('plan.saveImage')" :title="t('plan.saveImage')" @click="saveImage">
              <ImageDown :size="16" aria-hidden="true" /> <span class="bar-label">{{ t('plan.saveImage') }}</span>
            </button>
            <button class="bar-tool" type="button" :aria-label="t('plan.print')" :title="t('plan.print')" @click="printPlan">
              <Printer :size="16" aria-hidden="true" /> <span class="bar-label">{{ t('plan.print') }}</span>
            </button>
          </div>
          <button class="button button-quiet" type="button" @click="plan.generate()">
            <RotateCcw :size="16" aria-hidden="true" /> {{ t('plan.rebuild') }}
          </button>
        </div>
      </section>

      <div v-if="onBoard && showProfileHint" class="profile-hint" role="note">
        <Sparkles :size="18" aria-hidden="true" class="profile-hint-icon" />
        <p class="profile-hint-text">{{ t('plan.profileHint') }}<InfoTip :text="t('plan.profileHintInfo')" /></p>
        <a class="button button-quiet profile-hint-go" :href="link('record') + '#sec-strengths'">{{ t('plan.profileHintGo') }}</a>
        <button class="profile-hint-x" type="button" :aria-label="t('plan.profileHintHide')" :title="t('plan.profileHintHide')" @click="hideHint">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>

      <p v-if="pastPlanned" class="started">
        {{ t('plan.pastPlannedShort', { term: pastPlanned }) }}<InfoTip :text="t('plan.pastPlanned', { term: pastPlanned })" />
        <button class="button button-quiet" type="button" @click="plan.generate()">{{ t('plan.rebuild') }}</button>
      </p>
      <p v-if="rulesFrom" class="started">
        {{ t('plan.rulesYearShort', { year: rulesFrom.year }) }}<InfoTip :text="t('plan.rulesYear', rulesFrom)" />
      </p>
      <p v-if="assumed" class="started">
        {{ t('plan.assumedShort', assumed) }}<InfoTip :text="t('plan.assumed', assumed)" />
      </p>

      <!-- The record now reaches into the plan's own semesters (filled in after the plan was made). -->
      <p v-if="recordOverlap" class="started">
        {{ t('plan.recordOverlapShort', { term: recordOverlap }) }}<InfoTip :text="t('plan.recordOverlap', { term: recordOverlap })" />
        <button class="button button-quiet" type="button" @click="plan.generate()">{{ t('plan.rebuild') }}</button>
      </p>

      <!-- The plan's status and every note about it, as one slim line that opens. Problems open it by themselves. -->
      <details v-if="onBoard && !plan.courseCheck.value.statuses.length" class="status glass" :class="problems ? 'status-bad' : unknowns ? 'status-warn' : 'status-good'" :open="problems > 0">
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

      <p v-if="onBoard && careerReminder" class="started career-gap">
        {{ careerReminder.text }} <a :href="link(`careers/${careerReminder.id}`)">{{ t('careerGoal.gapLink') }}</a>
      </p>

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
          >
            <template v-if="heavyTerms" #alerts>
              <button class="heavy-link" type="button" @click="showHeavy">
                <TriangleAlert :size="15" aria-hidden="true" /> {{ t('plan.heavySummary', { n: heavyTerms }) }}
              </button>
            </template>
            <template v-if="hasNotes" #notes>
              <ul v-if="planProblems.length" class="status-list" :class="problems ? 'tone-bad' : 'tone-warn'" role="status">
                <li v-for="(p, i) in planProblems.slice(0, 5)" :key="i" class="status-item">
                  <component :is="TriangleAlert" :size="16" aria-hidden="true" class="status-icon" />
                  <span>{{ p.text }}</span>
                  <button v-if="p.confirm" class="button button-quiet confirm" type="button" @click="setConfirmed(p.confirm, true)">
                    {{ t('plan.iMeetThis') }}
                  </button>
                </li>
              </ul>
              <p v-if="hasConfirmable" class="status-hint">{{ t('plan.confirmHint') }}</p>
              <p v-for="u in unavoidable" :key="u" class="started">{{ u }}</p>
              <p v-if="extraTermsOnVisa" class="started">{{ t('plan.extraTermsVisa') }}</p>
              <ul v-if="failed.length" class="failed">
                <li v-for="f in failed" :key="f.code">
                  {{ f.term ? t('plan.failedRetake', { code: f.code, term: f.term }) : t('plan.failedNotPlanned', { code: f.code }) }}
                </li>
                <li class="failed-more"><a :href="link('guide/semester/#fail')">{{ t('guide.failTitle') }}</a></li>
              </ul>
            </template>
          </PlanRequirements>
          <p class="draft">
            {{ t('plan.draftNoteShort') }}
            <InfoTip>{{ t('plan.draftNote') }} <a :href="STUDENT_SITE" target="_blank" rel="noopener">{{ t('plan.draftLink') }}</a></InfoTip>
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
            :load="plan.load.value"
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
        :year="viewYear(plan.terms.value[0]?.year)"
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
              {{ t('plan.censusLineShort') }}<InfoTip :text="t('plan.censusLine')" />
              <a :href="link('guide/key-dates/')">{{ t('guide.datesTitle') }}</a>
            </p>
          </div>
          <div class="details-pair">
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
.heavy-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--warn) 10%, transparent);
  color: color-mix(in srgb, var(--warn) 75%, var(--ink));
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.heavy-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.planner {
  display: grid;
  gap: 20px;
  padding-top: var(--page-top);
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
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  min-width: 0;
  padding: 6px 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.bar-summary-text {
  font-size: 1.125rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.bar-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
  white-space: nowrap;
}

.bar-summary:hover .bar-edit,
.bar-summary:focus-visible .bar-edit {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.bar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.bar-actions .button {
  white-space: nowrap;
}

/* Share, image and print sit together as one glass pill: they all send the plan somewhere. */
.bar-group {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--glass-edge);
  border-radius: 999px;
  background: var(--glass-shine), var(--glass-fill);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
}

.bar-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.bar-tool:hover:not(:disabled) {
  background: var(--accent-soft);
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.bar-tool:disabled {
  opacity: 0.55;
  cursor: default;
}

.intro {
  display: grid;
  gap: 6px;
}

.guide-link {
  white-space: nowrap;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

/* Phones: the send-out tools become icons (named for screen readers), so all actions fit one row. */
@media (max-width: 720px) {
  .bar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .bar-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .bar-tool {
    min-width: 44px;
    min-height: 40px;
    justify-content: center;
    padding: 0 12px;
  }
}

/* Notes about the plan: a light tinted glass strip, readable in light and dark. */
.started {
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 8%, var(--glass-fill));
  color: var(--ink);
  font-size: 0.9375rem;
}

.profile-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-lg);
  background: var(--glass-shine), color-mix(in srgb, var(--accent) 7%, var(--glass-fill));
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
}

.profile-hint-icon {
  flex: none;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink));
}

.profile-hint-text {
  flex: 1 1 16em;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 550;
}

.profile-hint-go {
  white-space: nowrap;
}

.profile-hint-x {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ink-soft);
  cursor: pointer;
}

.profile-hint-x:hover {
  background: color-mix(in srgb, var(--ink) 7%, transparent);
  color: var(--ink);
}

.status-icon {
  flex: none;
  margin-top: 2px;
}

.tone-bad .status-icon {
  color: var(--bad);
}

.tone-warn .status-icon {
  color: color-mix(in srgb, var(--warn) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

.tone-bad .status-item,
.tone-warn .status-item {
  flex-wrap: nowrap;
  align-items: flex-start;
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
  color: color-mix(in srgb, var(--warn) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
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
  color: color-mix(in srgb, var(--warn) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
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
  color: var(--ink-soft);
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
  max-width: calc(100% - 32px);
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
