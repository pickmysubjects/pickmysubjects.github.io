<script setup lang="ts">
import { trackEvent } from '@/utils/analytics'
import { viewYear } from '@/engine/dataYear'
import InfoTip from '@/components/InfoTip.vue'
import { link } from '@/composables/useView'
import { computed, nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { RotateCcw, TriangleAlert } from 'lucide-vue-next'
import PlanWizard from '@/components/planner/PlanWizard.vue'
import PlanMap from '@/components/planner/PlanMap.vue'
import SubjectPeek from '@/components/planner/SubjectPeek.vue'
import PlanRequirements from '@/components/planner/PlanRequirements.vue'
import SubjectTimeline from '@/components/planner/SubjectTimeline.vue'
import PlanDetails from '@/components/planner/PlanDetails.vue'
import PlanActions from '@/components/planner/PlanActions.vue'
import PlanPrint, { type PrintTerm } from '@/components/planner/PlanPrint.vue'
import SharedPlanView from '@/components/planner/SharedPlanView.vue'
import Interp from '@/components/Interp.vue'
import PlanSwitcher from '@/components/plans/PlanSwitcher.vue'
import PlanHero from '@/components/planner/PlanHero.vue'
import SubjectSection from '@/components/subject/SubjectSection.vue'
import { computeWam, assumedOfferings, creditPoints, findDiploma, careerGap, careerGoal, careerName, heldMajorIds, informalPicks, isFail, isPassedDuplicate, passedCodes, planProblems as countedProblems, planComponentIds, planRoles, planRules, recordedLoads, termKey, termLoad, type Issue, type PlanTerm } from '@/engine'
import { diplomaTitle } from '@/composables/usePlanCompare'
import { Plus } from 'lucide-vue-next'
import { usePhone } from '@/composables/usePhone'
import { usePlans } from '@/composables/usePlans'
import { sharePlanImage } from '@/utils/planImage'
import { localTitle } from '@/i18n/localized'
import { decodePlan, encodePlan } from '@/utils/sharePlan'
import { boardEdges, countsToward } from '@/utils/planBoard'
import { pinSpot } from '@/utils/pendingAdd'
import { cloneJson } from '@/utils/clone'
import { go, replaceAddress, useView } from '@/composables/useView'
import { useProfile } from '@/composables/useProfile'
import { useDataset } from '@/composables/useDataset'
import { usePlan, type PlanSetup } from '@/composables/usePlan'
import { usePlanStress } from '@/composables/usePlanStress'
import { isDone, pastTerms, termState } from '@/utils/pastTerms'
import RatePrompt from '@/components/rating/RatePrompt.vue'
import { useRated } from '@/composables/useRated'
import { useI18n } from '@/i18n'
import { issueText, stressShort, termLabel } from '@/i18n/format'
import { reducedMotion } from '@/utils/motion'

// The wizard copies the setup once, so it restarts when the dataset is switched.
const { data, subjectList, name: dataName } = useDataset()
const plan = usePlan()
// Old saved data: unmarked record copies go back to their semesters as planned (once).
plan.unstale()
const { profile, setConfirmed, setResults } = useProfile()
const { t, locale } = useI18n()

const editing = shallowRef(false)

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
const plans = usePlans()
// The student's completed subjects, in the semesters they were taken, shown before the plan.
const past = computed(() => pastTerms(profile.value.results, data.value.subjects))
// Weak spots the degree leans on every semester: said once here, not on each semester.
const { stress } = usePlanStress()
const unavoidable = computed(() =>
  stress.value.unavoidable.map((u) => t.value('stress.unavoidable', { skill: t.value(`skill.${u.skill}`), total: u.total, perTerm: u.perTerm })),
)
// Heavy semesters: each one's name, how heavy and its main reason; "Show" opens its note and fix on the board.
const heavyList = computed(() =>
  stress.value.terms.flatMap((x, i) => {
    const term = plan.terms.value[i]
    if (!x || x.level === 'ok' || !term) return []
    const why = x.reasons[0]
    return [{ index: i, label: termLabel(t.value, term), level: t.value(`stress.${x.level}`), why: why ? stressShort(t.value, why) : '' }]
  }),
)
const heavyTerms = computed(() => heavyList.value.length)
function showHeavy(index: number): void {
  const note = document.querySelector<HTMLElement>(`[data-stress-term="${index}"] button`)
  if (!note) return
  note.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
  note.focus({ preventScroll: true })
  note.click()
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

// A subject planned again though My record has it passed: the one record line above says so
// and its Rebuild fixes them all, so they aren't listed one by one.
const passedNow = computed(() => new Set(passedCodes(profile.value.results)))
const onRecord = (i: Issue) => isPassedDuplicate(i, passedNow.value)
// Counted the same way as the compare page's "Subject problems" row.
const problems = computed(() => countedProblems(allIssues.value, passedNow.value).length)
// Say what the problems are right under the status, not only in the collapsed details.
// Problems if there are any, otherwise the things that can't be checked yet.
const problemTexts = computed(() => {
  const severity = problems.value ? 'error' : 'warning'
  return allIssues.value
    .filter((i) => i.severity === severity && !onRecord(i))
    .map((i) => ({
      text: issueText(t.value, i, allRules.value, plan.courseCheck.value.statuses, data.value.subjects, plan.setup.value.course),
      // Conditions only the student can check (a VCE score, a test): let them say they meet it.
      confirm: i.kind === 'prereq-unknown' ? i.subject : undefined,
      // Course-rule issues are already listed by the requirements card.
      rule: 'ruleId' in i && !!i.ruleId,
    }))
})
// What the requirements card doesn't already say: subject-level problems. The same condition on
// several subjects (two maths subjects needing one VCE score) is one line naming them all.
// A condition line in parts, so the codes stand out and "we can't check this" sits quiet at the
// end: matched against the message's own template, so every language splits the same way.
interface ConditionParts {
  lead: string
  body: string
  tail: string
}
function conditionParts(text: string, code: string): ConditionParts | undefined {
  for (const key of ['issue.prereq-advisory', 'issue.prereq-unknown-missing', 'issue.prereq-unknown']) {
    const tpl = t.value(key, { code: '\u0001', needs: '\u0002', missing: '\u0003' })
    const first = tpl.search(/[\u0002\u0003]/)
    if (!tpl.startsWith('\u0001') || first < 0) continue
    const lead = tpl.slice(1, first)
    let tail = tpl.slice(Math.max(tpl.lastIndexOf('\u0002'), tpl.lastIndexOf('\u0003')) + 1)
    if (!text.startsWith(code + lead) || !text.endsWith(tail)) continue
    const stop = /^[.。．।]\s*/.exec(tail)?.[0] ?? ''
    const body = text.slice(code.length + lead.length, text.length - tail.length) + stop.trim()
    tail = tail.slice(stop.length)
    return { lead, body, tail }
  }
  return undefined
}
const planProblems = computed(() => {
  type Item = { text: string; confirm?: string[]; parts?: ConditionParts }
  const out: Item[] = []
  const byCondition = new Map<string, { codes: string[]; item: Item }>()
  for (const p of problemTexts.value) {
    if (p.rule) continue
    if (!p.confirm) {
      out.push({ text: p.text })
      continue
    }
    const key = p.text.split(p.confirm).join('\u0000')
    const seen = byCondition.get(key)
    if (seen) {
      seen.codes.push(p.confirm)
      seen.item.text = key.split('\u0000').join(seen.codes.join(' / '))
      seen.item.confirm = [...seen.codes]
      continue
    }
    const item: Item = { text: p.text, confirm: [p.confirm], parts: conditionParts(p.text, p.confirm) }
    byCondition.set(key, { codes: [p.confirm], item })
    out.push(item)
  }
  return out
})
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
// When the board starts later than the student did (past semesters have no subjects planned),
// the line says both, so it doesn't contradict the first column.
const summary = computed(() => {
  const start = { year: plan.setup.value.startYear, period: plan.setup.value.startPeriod }
  const first = plan.terms.value[0]
  const later = first && (first.year !== start.year || first.period !== start.period) && termKey(first.year, first.period) > termKey(start.year, start.period)
  return t.value(later ? 'wizard.summaryLater' : 'wizard.summary', {
    course: plan.course.value?.title ?? plan.setup.value.course,
    start: termLabel(t.value, start),
    term: termLabel(t.value, later ? first : start),
    major: majorTitle.value,
  })
})

// "Add to plan" on a subject's page before there was a plan: /plan?add=CODE. The subject waits
// through the questions and goes into the plan they build (or the page says why it didn't).
const pendingAdd = shallowRef<string | null>(null)
watch(() => query.value.get('add'), (code) => { if (code && data.value.subjects[code]) pendingAdd.value = code }, { immediate: true })
const addNote = shallowRef<{ code: string; term?: string } | null>(null)
function placePending(): void {
  const code = pendingAdd.value
  pendingAdd.value = null
  if (!code) return
  if (query.value.get('add')) go('plan')
  const at = plan.terms.value.find((x) => x.subjects.includes(code))
  if (at) {
    addNote.value = { code, term: termLabel(t.value, at) }
    return
  }
  const keep = new Set([...roleSets.value.required, ...roleSets.value.options])
  const spot = pinSpot(plan.plan.value, data.value, code, keep, plan.load.value)
  if (!spot) {
    addNote.value = { code }
    return
  }
  change(t.value('plan.didAdd', { code, term: labelAt(spot.termIndex) }), () =>
    spot.replace ? plan.replaceSubject(spot.termIndex, spot.replace, code) : plan.addSubject(spot.termIndex, code),
  )
}

// Just built from the questions: the rules card starts folded, so the board is near the top.
const justBuilt = shallowRef(false)
function finishWizard(setup: PlanSetup): void {
  justBuilt.value = true
  if (!plan.updateSetup(setup)) plan.generate()
  editing.value = false
  placePending()
}
// The plan's semester for the subject open in the peek, if it's in the plan.
const peekTerm = computed(() => {
  const i = plan.terms.value.findIndex((x) => x.subjects.includes(peek.value ?? ''))
  return i >= 0 ? { index: i, term: plan.terms.value[i] as PlanTerm } : null
})
// Notes beside the status (shown when the line is opened).
const noteCount = computed(() => unavoidable.value.length + Number(extraTermsOnVisa.value) + failed.value.length)
// A term has begun (Melbourne dates).
const begun = (term: Pick<PlanTerm, 'year' | 'period'>) => termState(term) !== 'ahead'
const { shouldPrompt } = useRated()
const rateNext = shallowRef<string | null>(null)
// Done or not, from any card or the subject window: My record is the one place that says so.
function markDone(code: string, mark: number | undefined): void {
  plan.markDone(code, mark)
  // Just finished it: offer to rate it, once per subject.
  if (mark !== undefined && shouldPrompt(code)) rateNext.value = code
}
// The open subject's own entry on My record (not a fail), if it's done.
const peekDone = computed(() => [...profile.value.results].reverse().find((x) => x.code === peek.value && isDone(x, data.value.subjects)))
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
  for (const r of profile.value.results) if (isDone(r, data.value.subjects)) out[r.code] = t.value('plan.pastTag')
  for (const term of plan.terms.value) for (const c of term.subjects) out[c] = termLabel(t.value, term)
  return out
})
const boardCodes = computed(() => [...passedCodes(profile.value.results.filter((r) => isDone(r, data.value.subjects))), ...plan.plannedCodes.value])
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
// The Handbook year whose rules the plan uses, when it isn't the year the student started.
const rulesFrom = computed(() => {
  const c = plan.course.value
  const start = plan.plan.value.courseYear
  return plan.setupChosen.value && c && c.year !== start ? { year: c.year, start } : null
})
// A later year planned on an earlier Handbook's teaching periods: said once, at the top.
const assumed = computed(() => assumedOfferings(plan.plan.value, data.value))
// The plan's notes as one line: the short text of the most pressing, every note behind the ⓘ.
const recordFix = computed(() => recordOverlap.value !== null)
const metaLine = computed(() => {
  const notes: { short: string; info: string }[] = []
  if (recordOverlap.value) notes.push({ short: t.value('plan.recordOverlapShort', { term: recordOverlap.value }), info: t.value('plan.recordOverlap', { term: recordOverlap.value }) })
  if (rulesFrom.value) notes.push({ short: t.value('plan.rulesYearShort', { year: rulesFrom.value.year }), info: t.value('plan.rulesYear', rulesFrom.value) })
  if (assumed.value) notes.push({ short: t.value('plan.assumedShort', assumed.value), info: t.value('plan.assumed', assumed.value) })
  return notes[0] ? { short: notes[0].short, info: notes.map((n) => n.info).join(' ') } : null
})
const recordOverlap = computed(() => {
  const passed = new Set(passedCodes(profile.value.results.filter((r) => isDone(r, data.value.subjects))))
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

// ---- The page's head and its "On this page" ----
// Points done and planned against the degree's total (and a diploma's), rules met, and the one
// thing to do next.
const pointsNow = computed(() => {
  const pts = (c: string) => data.value.subjects[c]?.points ?? 12.5
  const codes = new Set([...passedCodes(profile.value.results), ...plan.plannedCodes.value])
  return [...codes].reduce((sum, c) => sum + pts(c), 0) + creditPoints(profile.value.credit)
})
const pointsNeed = computed(() => (plan.course.value?.totalPoints ?? 0) + (findDiploma(data.value, plan.setup.value.diploma)?.totalPoints ?? 0))
const fmt = (n: number) => String(Math.round(n * 10) / 10)
const heroFacts = computed(() => {
  if (!onBoard.value) return undefined
  const statuses = plan.courseCheck.value.statuses
  const met = statuses.filter((x) => x.status === 'ok').length
  return {
    points: `${fmt(pointsNow.value)} / ${fmt(pointsNeed.value)}`,
    rules: statuses.length ? `${met} / ${statuses.length}` : '—',
    rulesOk: statuses.length > 0 && met === statuses.length && problems.value === 0,
    marks: marksFact.value,
  }
})
// Marks on My record: how many, and the WAM; none yet, a link to add them.
const marksFact = computed(() => {
  const n = profile.value.results.filter((r) => r.mark !== undefined).length
  if (!n) return { text: t.value('planPage.marksNone'), href: link('record') }
  const wam = computeWam(profile.value.results, data.value)
  return { text: wam === null ? t.value('planPage.marksSomeNoWam', { n }) : t.value('planPage.marksSome', { n, wam }) }
})
// The first semester that has begun and still needs checking: what was taken, or its marks once over.
const termToFill = computed(() =>
  plan.terms.value.find((x) => {
    if (!begun(x)) return false
    const there = profile.value.results.filter((r) => r.year === x.year && r.period === x.period)
    return !there.length || (termState(x) === 'ended' && there.some((r) => r.mark === undefined && !isFail(r) && !data.value.subjects[r.code]?.passFail))
  }) ?? null,
)
const nextStep = computed(() => {
  if (problems.value) return { label: t.value('planPage.nextFix', { n: problems.value }), href: '#rules' }
  if (heavyTerms.value) return { label: t.value('planPage.nextHeavy'), href: '#heavy' }
  const fill = termToFill.value
  if (fill) return { label: t.value('planPage.nextMarks', { term: termLabel(t.value, fill) }), href: `#board` }
  // Nothing to do: no "next" rather than a made-up one.
  return undefined
})
const lastTerm = computed(() => [...plan.terms.value].reverse().find((x) => x.subjects.length))
const boardShort = computed(() => (lastTerm.value ? t.value('planPage.boardShort', { term: termLabel(t.value, lastTerm.value), n: plan.plannedCodes.value.length }) : undefined))
// The board may reach past the page's width to the window's edge on wide screens: the window's
// width (without its scrollbar), for that. Watched with a ResizeObserver, not the window's
// resize event: a vertical scrollbar coming or going changes it too, and a stale width made the
// page scroll sideways.
const pageW = shallowRef(typeof document === 'undefined' ? 0 : document.documentElement.clientWidth)
const pageObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => (pageW.value = document.documentElement.clientWidth))
pageObserver?.observe(document.documentElement)
onBeforeUnmount(() => pageObserver?.disconnect())

// Phones: one clear "Add a subject" button above the tab bar (hidden while the undo note shows).
const phone = usePhone()
function addOnPhone(): void {
  board.value?.openAdd()
}

// Arriving from the compare page's Edit (?plan=B&term=2027-semester-1): open that plan, then bring
// that semester into view. The address goes back to plain /plan/, so Back returns to the compare.
const focusTerm = shallowRef<string | null>(null)
watch(
  () => query.value.get('plan'),
  (label) => {
    if (!label) return
    const p = plans.list.value.find((x) => x.label === label.toUpperCase())
    if (p && p.id !== plans.active.value.id) plans.switchTo(p.id)
    focusTerm.value = query.value.get('term') ?? 'board'
    // Only ?plan= and ?term= go; anything else (?add=, ?share=) and the #fragment stay.
    const rest = new URLSearchParams(query.value)
    rest.delete('plan')
    rest.delete('term')
    const q = rest.toString()
    replaceAddress(`plan/${q ? `?${q}` : ''}${location.hash}`)
  },
  { immediate: true },
)
watch(
  [focusTerm, showWizard],
  async ([key, wizard]) => {
    if (!key) return
    // The plan opened needs setting up first: nothing to bring into view, and the semester
    // mustn't jump into view later, once the setup is done.
    if (wizard) {
      focusTerm.value = null
      return
    }
    await nextTick()
    window.setTimeout(() => {
      const el = key === 'board' ? document.getElementById('board') : document.querySelector<HTMLElement>(`[data-term-key="${CSS.escape(key)}"]`)
      focusTerm.value = null
      if (!el) return
      el.scrollIntoView({ block: key === 'board' ? 'start' : 'center' })
      if (key !== 'board') {
        el.classList.add('term-flash')
        window.setTimeout(() => el.classList.remove('term-flash'), 1700)
      }
    }, 60)
  },
  { immediate: true },
)
// Arriving with ?add= when the plan is already set up: it goes in straight away.
watch(pendingAdd, (code) => { if (code && plan.setupChosen.value && !shared.value && !editing.value) placePending() }, { immediate: true })
</script>

<template>
  <div class="planner">
    <PlanHero
      :title="onBoard ? t('menu.myPlan') : t('plan.title')"
      :setup="!showWizard && !shared ? summary : undefined"
      :facts="!showWizard && !shared ? heroFacts : undefined"
      :next="!showWizard && !shared && onBoard ? nextStep : undefined"
      @edit="editing = true"
    >
      <div v-if="!shared" class="hero-row">
        <PlanSwitcher class="hero-switcher" />
        <PlanActions v-if="!showWizard && onBoard" :copied="copied" :imaging="imaging" @share="share" @save-image="saveImage" @print="printPlan" />
      </div>
      <template v-if="showWizard">
        <p class="page-lede">{{ t('plan.ledeShort') }} <a class="guide-link" :href="link('guide')">{{ t('guide.nav') }} →</a></p>
        <p v-if="pendingAdd" class="started" role="status">{{ t('plan.addPending', { code: pendingAdd }) }}</p>
      </template>
      <template v-if="!shared && !showWizard && onBoard" #foot>
        <div id="rules" class="rules-strip">
          <PlanRequirements
            v-if="plan.courseCheck.value.statuses.length"
            :problems="problems + Number(recordFix)"
            :unconfirmed="unknowns"
            :start-open="!justBuilt"
            :statuses="plan.courseCheck.value.statuses"
            :rules="allRules"
            :degree-rules="rules"
            :members="members"
            :active="ruleFocus"
            @focus="focusRule"
          >
            <template v-if="hasNotes" #notes>
              <ul v-if="planProblems.length" class="status-list" :class="problems ? 'tone-bad' : 'tone-warn'" role="status">
                <li v-for="(p, i) in planProblems.slice(0, 5)" :key="i" class="status-item">
                  <component :is="TriangleAlert" :size="16" aria-hidden="true" class="status-icon" />
                  <span v-if="p.parts && p.confirm" class="status-text"><b class="status-codes">{{ p.confirm.join(' / ') }}</b>{{ p.parts.lead }}{{ p.parts.body }} <span class="status-tail">{{ p.parts.tail }}</span></span>
                  <span v-else class="status-text">{{ p.text }}</span>
                  <button v-if="p.confirm" class="button button-quiet confirm" type="button" @click="p.confirm.forEach((c) => setConfirmed(c, true))">
                    {{ t('plan.iMeetThis') }}
                  </button>
                  <InfoTip v-if="p.confirm" :text="t('plan.confirmHint')" />
                </li>
              </ul>
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
          <!-- A degree with no rules we know: the problems and notes as a list. -->
          <div v-else class="status-body">
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
        </div>
      </template>
    </PlanHero>

    <PlanWizard
      v-if="showWizard"
      :key="dataName"
      :setup="plan.setup.value"
      :courses="data.courses.filter((c) => c.listed)"
      :components="data.components"
      :cancellable="!plan.isEmpty.value"
      @done="finishWizard"
      @cancel="editing = false"
    />

    <SharedPlanView v-if="shareCode !== null" :shared="shared" @done="closeShared" />

    <!-- The board first, at full width; the plan's other parts under it. -->
    <div v-else-if="!showWizard" class="article">
      <div class="body">
        <RatePrompt v-if="rateNext" :key="rateNext" :code="rateNext" @close="rateNext = null" />

        <SubjectSection id="board" class="board-sec" :style="{ '--page-w': `${pageW}px` }" :title="t('planPage.tocBoard')">
          <template #aside>
            <InfoTip :text="t('plan.hint')" />
            <span v-if="boardShort" class="board-sum">{{ boardShort }}</span>
            <button class="button button-quiet rebuild" type="button" @click="plan.generate()">
              <RotateCcw :size="16" aria-hidden="true" /> {{ t('plan.rebuild') }}
            </button>
          </template>
          <p v-if="addNote" class="started" role="status">
            <template v-if="addNote.term">{{ t('plan.addPendingThere', { code: addNote.code, term: addNote.term }) }}</template>
            <template v-else>{{ t('plan.addPendingFailed', { code: addNote.code }) }}<InfoTip :text="t('plan.addPendingWhy')" /></template>
          </p>
          <!-- Notes about the plan itself, folded into one line: the plan and My record disagreeing
               comes first (with its one fix), then which Handbook years the plan leans on. Every
               detail is behind the ⓘ. -->
          <p v-if="metaLine && recordFix" class="started meta-line" :role="recordFix ? 'status' : undefined">
            <span>{{ metaLine.short }}<InfoTip :text="metaLine.info" /></span>
            <button v-if="recordFix" class="button button-quiet" type="button" @click="plan.generate()">{{ t('plan.rebuild') }}</button>
          </p>
          <p v-if="onBoard && careerReminder" class="started career-gap">
            {{ careerReminder.text }} <a :href="link(`careers/${careerReminder.id}`)">{{ t('careerGoal.gapLink') }}</a>
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
            @done="markDone"
            @undo="plan.markUndone"
          >
            <!-- The plan's data note, small beside the legend; a record clash shows as a status line above instead. -->
            <template v-if="metaLine && !recordFix" #note>
              <span class="board-note">{{ metaLine.short }}<InfoTip :text="metaLine.info" /></span>
            </template>
          </PlanMap>
          <PlanDetails
            :statuses="plan.courseCheck.value.statuses"
            :rules="allRules"
            :degree-rules="rules"
            :members="members"
            :active="ruleFocus"
            :issues="allIssues"
            :passed="passedNow"
            :notes="plan.notes.value"
            :unplaced="plan.unplaced.value"
            @focus="focusRule"
            @select="select"
            @open="peek = $event"
          />
        </SubjectSection>



        <!-- Nothing heavy: one compact line, not a card with nothing in it. -->
        <p v-if="onBoard && !heavyTerms && !unavoidable.length" id="heavy" class="heavy-none surface">
          <strong>{{ t('planPage.tocHeavy') }}</strong><span>{{ t('planPage.heavyNone') }}</span>
        </p>
        <SubjectSection v-else-if="onBoard" id="heavy" :title="t('planPage.tocHeavy')" :short="heavyTerms ? t('planPage.heavyCount', { n: heavyTerms }) : t('planPage.heavyNone')" fold>
          <ul v-if="heavyList.length" class="heavy-list">
            <li v-for="h in heavyList" :key="h.index" class="heavy-item">
              <TriangleAlert :size="16" aria-hidden="true" class="heavy-icon" />
              <span class="heavy-text"><strong>{{ h.label }}</strong> · {{ h.level }}<template v-if="h.why"> · {{ h.why }}</template></span>
              <button class="button button-quiet heavy-show" type="button" @click="showHeavy(h.index)">{{ t('planPage.heavyShow') }}</button>
            </li>
          </ul>
          <p v-for="u in unavoidable" :key="u" class="started">{{ u }}</p>
        </SubjectSection>

      </div>
    </div>

    <template v-if="!shared && !showWizard">
      <button v-if="phone && onBoard && !undo && !peek" class="add-fab" type="button" @click="addOnPhone">
        <Plus :size="18" aria-hidden="true" />{{ t('plan.addFab') }}
      </button>
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
        :pass-fail="data.subjects[peek]?.passFail"
        :done-entry="peekDone"
        @done="(m) => markDone(peek as string, m)"
        @undo="plan.markUndone(peek as string)"
        :planned="!!peekTerm"
        @swap-it="board?.openSwap(peek as string)"
        @move-it="board?.openMove(peek as string)"
        @remove-it="peekTerm && onRemove(peekTerm.index, peek as string)"
        :where-of="whereOf"
        :term="peekTerm?.term"
        :terms="plan.terms.value"
      />
    </template>
    <PlanPrint
      v-if="!showWizard && onBoard"
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
/* The guide's measures (GuideView, the subject page): the hero and the article sharing their
   edges. Two glass panels (hero with its rules, the board) at the site's own glass strength, so
   the frost reads; everything inside them is flat. */
.planner {
  display: grid;
  gap: 24px;
  min-width: 0;
  padding-top: 20px;
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.hero-switcher {
  flex: 1;
  min-width: 0;
}

.rules-strip {
  min-width: 0;
}

.article {
  display: grid;
  min-width: 0;
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  min-width: 0;
}

/* Cards that bring their own glass (the rules card) fold into their section: never a box in a box. */
.body :deep(.sec .progress.surface) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* The board's section: on screens wider than the page it runs on to the window's edges
   (keeping the page's gutter), so more semesters show before it scrolls. */
.board-sec {
  margin-inline: min(0px, calc((var(--shell) - var(--page-w, 100vw)) / 2));
  padding-inline: 24px;
}

/* The summary sits on the title's line, muted; the rebuild button stays at the right. */
.board-sum {
  font-size: 0.9375rem;
  color: var(--ink-soft);
}

.board-note {
  font-size: var(--fs-meta);
  color: var(--ink-soft);
}

.rebuild {
  min-height: 36px;
  margin-left: auto;
  white-space: nowrap;
}

.guide-link {
  white-space: nowrap;
  color: color-mix(in srgb, var(--accent) 80%, var(--ink)); /* darker in light, lighter in dark: 4.5:1 on glass */
}

/* Notes about the plan: a light tinted glass strip, readable in light and dark. */
.started {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 8%, var(--glass-fill));
  color: var(--ink);
  font-size: 0.9375rem;
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

.status-body {
  display: grid;
  gap: var(--space-3);
  color: var(--ink);
}

/* In the hero's foot, under its hairline. */
.rules-strip > .status-body {
  padding: 14px 18px 16px;
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

/* One row per item, like the rules rows above: icon, text, then its action and ⓘ. */
.status-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.status-codes {
  font-weight: 700;
}

.status-tail {
  font-size: 0.8125rem;
  color: var(--ink-soft);
}

.status-item > span {
  min-width: 0;
}

@media (max-width: 560px) {
  /* Phones: the text gets the full width, its action goes under it. */
  .status-item {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .status-item > :nth-child(2) {
    grid-column: 2 / -1;
  }

  .status-item > .confirm {
    grid-column: 2;
    width: 100%;
  }

  .status-item > .confirm + * {
    grid-column: 3;
  }
}

.status-hint {
  max-width: 60ch;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

/* A standard quiet button, one size down. */
.confirm {
  flex: none;
  min-height: 32px;
  padding: 0 14px;
  font-size: 0.8125rem;
  white-space: nowrap;
}

/* The plan's notes line: text and ⓘ together, its one fix at the end. A plain line on the
   board's glass, not a box in a box. */
.meta-line {
  padding: 0;
  border: 0;
  background: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}

.meta-line > span {
  flex: 1 1 0;
  min-width: 12em;
  overflow-wrap: anywhere;
}

.meta-line .button {
  min-height: 36px;
  margin-left: auto;
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

.timeline-bar {
  position: sticky;
  top: 72px;
  z-index: 20;
}

/* Heavy semesters: one line each, "Show" opens that semester's note on the board. */
.heavy-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.heavy-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  border: 1px solid color-mix(in srgb, var(--warn) 30%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--warn) 8%, var(--card-fill));
}

.heavy-icon {
  flex: none;
  color: color-mix(in srgb, var(--warn) 80%, var(--ink));
}

.heavy-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9375rem;
}

.heavy-show {
  flex: none;
  min-height: 36px;
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

/* Phones: a clear way to add a subject, floating above the tab bar where the undo note goes. */
.add-fab {
  position: fixed;
  z-index: 40;
  right: 16px;
  bottom: calc(100px + env(safe-area-inset-bottom));
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 18px 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-fill);
  color: var(--accent-fill-ink);
  font: inherit;
  font-weight: var(--fw-semibold);
  box-shadow: var(--shadow-2);
  cursor: pointer;
}

.add-fab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.heavy-none {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 0;
  padding: 16px 32px;
  scroll-margin-top: 96px;
}

.heavy-none span {
  color: var(--ink-soft);
}

@media (max-width: 640px) {
  /* Phones: title and button on the first line, the summary under them. */
  .board-sum {
    order: 3;
    flex-basis: 100%;
  }

  .heavy-none {
    padding: 14px 16px;
  }
}

.undo-button {
  flex: none;
  min-height: 36px;
  padding: 4px 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
  color: inherit;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

@media (max-width: 720px) {
  /* Above the floating tab bar, never on it. */
  .undo {
    bottom: calc(100px + env(safe-area-inset-bottom));
  }

  .undo-button,
  .heavy-show,
  .rebuild,
  .confirm,
  .meta-line .button {
    min-height: 44px;
  }

  .timeline-bar {
    position: static;
  }
}

@media (max-width: 640px) {
  .planner,
  .body {
    gap: 14px;
  }

  .planner {
    padding-top: 12px;
  }

  .board-sec {
    padding-inline: 10px;
  }

  .heavy-item {
    flex-wrap: wrap;
  }
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
