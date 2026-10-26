import { forCourse } from './forCourse'
import { offeredIn, periodsFor, termKey } from './availability'
import { capExempt, categoryOf, matches, pointRules, sumPoints, withinCaps, type PointsRule, disciplineOf, checkCourse, componentNeeds, diplomaStream, findComponent, findCourse, findDiploma, inDiploma, heldMajorIds, majorTitles, minorTitles, planComponentIds, sharesAllowed, withBarredBreadth } from './courseRules'
import { careerGoal } from './careerGoal'
import { evaluateField, referencedSubjects, type EvalContext, type Tri } from './expr'
import type { Note, Params, Plan, PlanTerm } from './plan'
import { nextEntry, standardTerms } from './plan'
import { HEAVY_PICK_COST, exactWam, isFail, marksForConditions, passedCodes, recommend, type Profile } from './recommend'
import { checkTerms } from './planCheck'
import { balanceTerms, fixHeavyTerms } from './relieve'
import { skillsOf, termStress, weakSkills, type StressLevel } from './termStress'
import type { ComponentLimit, ComponentReq, Course, CourseRule, Dataset, Period, ReqExpr, Subject } from './schema'
import { PERIODS } from './schema'
import { doneBefore, isYearLong, recordedLoads, secondHalfOf, termLoad, termShare } from './yearLong'

export interface GenerateInput {
  data: Dataset
  profile: Profile
  course: string
  courseYear: number
  major?: string
  /** An optional second major: its required subjects are planned like the first's. */
  major2?: string
  specialisation?: string
  /** Minor ids: planned like a second, smaller major. */
  minors?: string[]
  /** A concurrent diploma (code) and its stream: their subjects are planned on top of the degree's. */
  diploma?: string
  diplomaStream?: string
  startYear: number
  startPeriod: Period
  /** Upper bound on terms to plan. Defaults to what the remaining points need, capped at 10. */
  /** With useShortTerms: electives may also go in summer and winter when points are short. */
  fillShortTerms?: boolean
  maxTerms?: number
  /**
   * No major yet, but a field in mind: the majors still in the running. The first-year subjects
   * at least half of them need are planned, so none is closed off.
   */
  keepOpen?: string[]
  /** Internal: also offer summer and winter terms, for chain subjects that would otherwise fall a semester behind. */
  useShortTerms?: boolean
}

export interface GenerateResult {
  plan: Plan
  /** Required subjects that could not be placed, with a reason. */
  unplaced: { code: string; reason: string; reasonKey: string }[]
  /** Notes about choices the generator made (localisable). */
  notes: Note[]
}

/**
 * Greedy, explainable plan builder:
 * 1. collect required subjects (compulsory + major/specialisation, choosing
 *    "pick N points from" sets by recommendation score) and their prerequisites;
 * 2. place them term by term — prerequisites must be in earlier terms, the
 *    subject must be offered, and the subject with the longest chain of
 *    dependents / fewest offerings goes first;
 * 3. fill the rest of each term with recommended electives that serve the
 *    largest unmet course-rule deficit without breaking any cap.
 */
/**
 * Builds the plan; if required subjects don't fit (often a chain of subjects
 * that each run in one semester only), tries again with up to two extra
 * semesters, as a student would take longer rather than drop the major.
 */
export function generatePlan(given: GenerateInput): GenerateResult {
  // A new student (nothing dated on the record) starts in a period the course takes new students
  // in; a student who has already started is planned on from where they are.
  const course = findCourse(given.data, given.course, given.courseYear)
  const started = given.profile.results.some((r) => r.year && r.period)
  const entry = started ? { year: given.startYear, period: given.startPeriod } : nextEntry(course, { year: given.startYear, period: given.startPeriod })
  const moved = entry.year !== given.startYear || entry.period !== given.startPeriod
  const result = generateFrom({ ...given, startYear: entry.year, startPeriod: entry.period })
  if (moved) result.notes.unshift(note('entryMoved', { year: entry.year, period: entry.period }, `This degree takes new students only in some semesters, so the plan starts in ${entry.period} ${entry.year}.`))
  // More points than the degree's total: surplus electives were already trimmed (buildPlan), so
  // what's left is needed by a rule or as a prerequisite. Say why, so it doesn't look like a mistake.
  if (course) {
    const pointsOf = (c: string) => given.data.subjects[c]?.points ?? 12.5
    const total = [...result.plan.completed, ...result.plan.terms.flatMap((t) => t.subjects)].reduce((sum, c) => sum + pointsOf(c), 0)
    const extra = total - course.totalPoints
    if (extra > 0 && result.plan.terms.some((t) => t.subjects.length)) {
      result.notes.push(note('overTotal', { points: total, extra, total: course.totalPoints }, `This plan comes to ${total} points, ${extra} over the usual ${course.totalPoints}: some subjects already done don't count towards these rules, so every planned subject is needed.`))
    }
  }
  return result
}

function generateFrom(raw: GenerateInput): GenerateResult {
  // Periods as this course's students see them (breadth-only periods for breadth subjects).
  // A subject the student's major won't let count as breadth is never picked to fill breadth.
  const input = { ...raw, data: withBarredBreadth(forCourse(raw.data, raw.course), raw.course, planComponentIds(raw)) }
  // Unplaced subjects weigh most; then course rules the plan fails (e.g. breadth
  // squeezed out by a heavy major + specialisation).
  const shortfall = (r: GenerateResult) =>
    r.unplaced.length * 100 + checkCourse(r.plan, input.data).statuses.filter((st) => st.status === 'fail').length
  let result = buildPlan(input)
  if (input.maxTerms !== undefined) return result
  if (shortfall(result) === 0) return finishEarlier(input, result, shortfall)
  // Before planning longer: a chain subject that also runs in summer or winter (CHEM10004 for a
  // mid-year start) can go there and keep the degree to its usual length.
  const viaShort = buildPlan({ ...input, useShortTerms: true })
  if (shortfall(viaShort) === 0) return finishEarlier(input, viaShort, shortfall)
  // One semester more at a time, up to the usual ten, while required subjects are still left out
  // (or a course rule still fails, for at most two extra): a student takes longer rather than
  // drop part of the degree.
  const base = semesters(result)
  for (let terms = base + 1; terms <= Math.max(MAX_TERMS, base + 2) && shortfall(result) > 0; terms++) {
    if (terms > base + 2 && result.unplaced.length === 0) break
    const longer = buildPlan({ ...input, maxTerms: terms })
    if (shortfall(longer) >= shortfall(result)) continue
    const extra = terms - base
    longer.notes.push(note('extraTerms', { n: extra }, `Planned ${extra} extra semester(s) so every required subject fits.`))
    result = longer
  }
  // A longer plan whose last semester holds only a subject or two: summer/winter may still save it.
  return shortfall(result) === 0 ? finishEarlier(input, result, shortfall) : result
}

/** Most semesters a plan runs to. */
const MAX_TERMS = 10
/** Points a choice option gives up for each prerequisite subject it adds to the plan. */
const EXTRA_SUBJECT_COST = HEAVY_PICK_COST

function semesters(r: GenerateResult): number {
  return r.plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2').length
}

/**
 * A last semester holding a summer's worth or less (a failed subject to make up, say): try one
 * semester fewer with summer and winter terms, as students do, and keep it if every rule still
 * holds. Otherwise the longer plan stands.
 */
function finishEarlier(input: GenerateInput, result: GenerateResult, shortfall: (r: GenerateResult) => number): GenerateResult {
  const main = result.plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2')
  const last = main.at(-1)
  if (!last || main.length < 2) return result
  const lastPoints = termLoad(result.plan.terms, result.plan.terms.indexOf(last), input.data)
  if (lastPoints > SHORT_TERM_POINTS) return result
  const shorter = buildPlan({ ...input, maxTerms: main.length - 1, useShortTerms: true, fillShortTerms: true })
  if (shortfall(shorter) > 0 || shorter.unplaced.length) return result
  // Unused summer/winter slots are dropped; only the ones the plan fills stay.
  shorter.plan.terms = shorter.plan.terms.filter((t) => t.subjects.length > 0 || (t.period !== 'summer' && t.period !== 'winter'))
  for (const t of shorter.plan.terms.filter((x) => (x.period === 'summer' || x.period === 'winter') && x.subjects.length)) {
    shorter.notes.push(note('finishEarlier', { year: t.year, period: t.period, codes: t.subjects.join(', ') }, `${t.subjects.join(', ')} in ${t.period} ${t.year}, so the degree finishes a semester earlier.`))
  }
  return shorter
}

/**
 * The course as the generator plans it: with a diploma, the diploma's points come on top of the
 * degree's (the usual extra year; cross-credit to finish sooner is the student's call).
 */
function plannedCourse(input: GenerateInput): Course | undefined {
  const course = findCourse(input.data, input.course, input.courseYear)
  const diploma = findDiploma(input.data, input.diploma)
  if (!course || !diploma) return course
  const totalPoints = course.totalPoints + diploma.totalPoints
  // The total, and caps on a level whatever the category (the diploma's subjects count there too), grow by its points.
  const rules = course.rules.map((r) =>
    r.kind !== 'points' || r.category !== undefined ? r : r.level === undefined && r.min !== undefined ? { ...r, min: totalPoints } : r.max !== undefined ? { ...r, max: r.max + diploma.totalPoints } : r,
  )
  return { ...course, totalPoints, rules }
}

/**
 * The data as the degree's electives are chosen with a diploma: subjects planned only for the
 * diploma count towards the degree's total, not its categories, so the degree's own rules are
 * met without them (they are the diploma's, apart from any cross-credit).
 */
function diplomaOnlyAsCore(input: GenerateInput, required: Set<string>): GenerateInput {
  const diploma = findDiploma(input.data, input.diploma)
  if (!diploma) return input
  const stream = diplomaStream(input.data, diploma, input.diplomaStream)
  const course = findCourse(input.data, input.course, input.courseYear)
  const named = new Set([
    ...(course?.rules ?? []).flatMap((r) => (r.kind === 'compulsory' ? r.subjects : r.kind === 'requirement' ? r.paths.flat().flatMap((q) => ('all' in q ? q.all : q.choose.from)) : [])),
    ...planComponentIds(input).flatMap((id) => componentNeeds(findComponent(input.data, id)).flatMap((q) => ('all' in q ? q.all : q.choose.from))),
  ])
  const subjects = { ...input.data.subjects }
  for (const code of required) {
    const s = subjects[code]
    if (s && !named.has(code) && inDiploma(input.data, diploma, stream, code)) subjects[code] = { ...s, categories: { ...s.categories, [input.course]: 'core' } }
  }
  return { ...input, data: { ...input.data, subjects } }
}

function buildPlan(given: GenerateInput): GenerateResult {
  const course = plannedCourse(given)
  const notes: Note[] = []
  const completed = passedCodes(given.profile.results)
  const done = new Set(completed)
  const load = course?.standardLoad ?? 50

  // needs: subjects the generator added as prerequisites for each required subject.
  const needs = new Map<string, string[]>()
  const required = collectRequired(given, done, notes, needs)
  const input = diplomaOnlyAsCore(given, required)
  const { data, profile } = input
  const groupOf = coGroups(required, done, data)
  const firstSemester = new Set(
    (course?.rules ?? []).flatMap((r) => (r.kind === 'compulsory' && r.firstSemester ? r.subjects : [])),
  )
  // Subjects normally done in the first year (a foundation year): only in the first two semesters.
  const firstYear = new Set(
    (course?.rules ?? []).flatMap((r) => (r.kind === 'compulsory' && r.firstYear ? r.subjects : r.kind === 'requirement' && r.firstYear ? r.paths.flat().flatMap((q) => ('all' in q ? q.all : q.choose.from)) : [])),
  )
  const early = new Set([...firstSemester, ...firstYear])

  const remainingPoints = Math.max(
    0,
    (course?.totalPoints ?? 300) - completed.reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0),
  )
  // Nothing left to plan (the degree is all on the record): no semesters at all.
  const nothingLeft = remainingPoints === 0 && [...required].every((c) => done.has(c))
  const termCount = input.maxTerms ?? (nothingLeft ? 0 : Math.min(10, Math.max(1, Math.ceil(remainingPoints / load))))
  const terms = standardTerms(input.startYear, input.startPeriod, termCount)
  if (input.useShortTerms) {
    // Winter between Semester 1 and 2, summer between Semester 2 and the next Semester 1.
    for (let i = terms.length - 1; i > 0; i--) {
      const prev = terms[i - 1] as PlanTerm
      const between: PlanTerm = prev.period === 'semester-1' ? { year: prev.year, period: 'winter', subjects: [] } : { year: prev.year + 1, period: 'summer', subjects: [] }
      terms.splice(i, 0, between)
    }
  }
  const isShort = (t: PlanTerm) => t.period === 'summer' || t.period === 'winter'
  // Points already on the record in a planned semester (a part-done one the plan carries on in).
  // Enrolled points, a fail included (a year-long result half in each of its semesters).
  const recorded = recordedLoads(profile.results, data)
  const preload = (t: PlanTerm) => recorded[`${t.year}|${t.period}`] ?? 0

  // A required subject the course closes to its students (B-SCI's INFO30005, for a major only
  // pre-2018 starters may finish) can't be planned without an error: it's left out, with why.
  const closedList = new Set(data.courses.find((c) => c.code === input.course)?.closed ?? [])
  const closedRequired = [...required].filter((c) => !done.has(c) && closedList.has(c))
  const pending = [...required].filter((c) => !done.has(c) && !closedList.has(c))
  // Areas of the major/specialisation, used to break ties between equally scored electives.
  const focus = new Set([...required].filter((c) => !firstSemester.has(c)).map((c) => data.subjects[c]?.area))
  const opens = pathwayCounter(data, input.course, input.startYear)
  const depth = dependentDepth(pending, data, needs)

  const electives = new Set<string>()
  const fill = (term: PlanTerm, termIndex: number, relaxed = false, upTo = Infinity): void => {
    if (!course) return
    const before = doneBefore(completed, terms, termIndex, data)
    let used = preload(term) + termLoad(terms, termIndex, data)
    const cap = Math.min(isShort(term) ? SHORT_TERM_POINTS : load, used + upTo)
    while (used < cap) {
      const pick = pickElective({ input, course, term, before, placed: allPlaced(), completed, room: cap - used, secondRoom: secondRoom(termIndex), focus, reserved: pending, opens, progress: (termIndex + 1) / terms.length, relaxed })
      if (!pick) break
      term.subjects.push(pick.code)
      electives.add(pick.code)
      used += termShare(data.subjects[pick.code])
      notes.push(note('added', { code: pick.code, year: term.year, period: term.period, rule: pick.ruleId }, `${pick.code} added in ${term.year} ${term.period} for: ${pick.why}.`))
    }
  }
  const allPlaced = (): string[] => terms.flatMap((t) => t.subjects)
  // Room left in the Semester 2 that finishes a year-long subject started in this term (none without one).
  const secondRoom = (termIndex: number): number => {
    const i = secondHalfOf(terms, termIndex)
    return i < 0 ? 0 : load - preload(terms[i] as PlanTerm) - termLoad(terms, i, data)
  }

  // The last term each required subject can start in and still leave room for what needs it.
  const latest = latestStart(pending, needs, terms, data)
  // A first-year subject whose chain can't reach it within the first year (a Semester 2-only
  // follow-on to a Semester 1-only subject, for a mid-year start) still has to be taken: as early
  // as it can be, rather than never.
  const soonest = earliestStart(pending, needs, terms, data)
  const inFirstYear = (i: number) => terms.slice(0, i).filter((t) => !isShort(t)).length < 2
  const firstYearBound = (c: string) => firstYear.has(c) && inFirstYear(soonest.get(c) ?? 0)
  let now = 0
  const urgency = (c: string) => ((latest.get(c) ?? Infinity) <= now ? 1 : 0)

  terms.forEach((term, termIndex) => {
    now = termIndex
    const before = doneBefore(completed, terms, termIndex, data)
    let used = preload(term) + termLoad(terms, termIndex, data)
    // A summer or winter term only takes a required subject that can't wait for the next semester.
    const limit = isShort(term) ? SHORT_TERM_POINTS : load

    // Required subjects first. Corequisites go in together or not at all; a one-way corequisite
    // (MIIM30016 needs MIIM30011 earlier or alongside) may join once it is placed this term.
    // Corequisites, and prerequisites that may be taken at the same time (FLTV10025 with FLTV10016).
    const alongsideOf = (c: string) => [...referencedSubjects(data.subjects[c]?.corequisites ?? 'none'), ...concurrentSubjects(data.subjects[c]?.prerequisites ?? 'none')]
    const fits = (c: string, group: string[]) =>
      !before.has(c) &&
      (needs.get(c) ?? []).every((n) => before.has(n) || group.includes(n) || (term.subjects.includes(n) && alongsideOf(c).includes(n))) &&
      canTake(c, term, before, data, input.course, group, majorsOf(input)) !== 'fail' &&
      (!firstSemester.has(c) || termIndex === 0) &&
      (!firstYearBound(c) || inFirstYear(termIndex))
    // Again after each pass: a subject placed this term can let its one-way corequisite partner in.
    for (let placedAny = true; placedAny; ) {
      placedAny = false
      const ready = pending
        .filter((c) => !term.subjects.includes(c) && fits(c, groupOf(c)) && (!isShort(term) || urgency(c) === 1))
        .sort((a, b) => Number(firstYear.has(b)) - Number(firstYear.has(a)) || urgency(b) - urgency(a) || priority(b, early, depth, data, term.year) - priority(a, early, depth, data, term.year))
      for (const code of ready) {
        if (term.subjects.includes(code)) continue
        const group = groupOf(code).filter((c) => !before.has(c) && !term.subjects.includes(c))
        if (!group.every((c) => fits(c, group))) continue
        const pts = group.reduce((sum, c) => sum + termShare(data.subjects[c]), 0)
        if (used + pts > limit) continue
        // A year-long subject's second half needs room in Semester 2 as well.
        const later = group.filter((c) => isYearLong(data.subjects[c])).reduce((sum, c) => sum + termShare(data.subjects[c]), 0)
        if (later > 0 && later > secondRoom(termIndex)) continue
        if (course && !group.every((c) => progressionAllows(c, course, [...before], data))) continue
        term.subjects.push(...group)
        used += pts
        placedAny = true
      }
    }

    // Then electives aimed at the most pressing unmet requirement.
    if (!isShort(term)) fill(term, termIndex)
  })
  const late = pending.filter((c) => firstYear.has(c) && !firstYearBound(c))
  if (late.length) notes.push(note('firstYearLate', { codes: late.join(', ') }, `${late.join(', ')} can't fit in your first year from this start (the subjects before them run in one semester only), so they're planned as early as they can be.`))
  // Trying to finish a semester earlier: electives also go in summer and winter, earliest first,
  // until the course total is reached.
  if (input.fillShortTerms && course) {
    const total = () => [...completed, ...allPlaced()].reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
    terms.forEach((t, i) => {
      // Only what's missing: a summer subject is extra study, not a place to park electives.
      if (isShort(t) && total() < course.totalPoints) fill(t, i, false, course.totalPoints - total())
    })
  }
  // Summer and winter terms nothing needed are dropped again.
  for (let i = terms.length - 1; i >= 0; i--) if (isShort(terms[i] as PlanTerm) && (terms[i] as PlanTerm).subjects.length === 0) terms.splice(i, 1)
  for (const t of terms.filter(isShort)) {
    for (const code of t.subjects) {
      notes.push(note('shortTermChain', { code, year: t.year, period: t.period }, `${code} is planned in ${t.period} ${t.year}, so the subjects after it don't fall a semester behind.`))
    }
  }

  // Greedy filling can over-serve one requirement (e.g. science) and starve
  // another (e.g. breadth); swap electives where that's safe, then top up.
  if (course) {
    repair(terms, { input, course, completed, electives, notes, focus, reserved: pending, opens })
    terms.forEach((t, i) => isShort(t) || fill(t, i))
    // Anything still short: better a full term than an empty slot kept for a minimum that can't be met.
    terms.forEach((t, i) => isShort(t) || fill(t, i, true))
  }
  // Required subjects that only run in summer or winter: give them a short term of their own.
  placeShortTerms(terms, pending, completed, data, input.course, course, notes, majorsOf(input))
  // A summer or winter subject on top of full semesters goes past the course total: drop the
  // latest electives no rule needs, so the degree isn't longer than it has to be.
  if (course) {
    const total = () => [...completed, ...allPlaced()].reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
    const draftOf = (): Plan => ({ course: input.course, courseYear: input.courseYear, major: input.major, major2: input.major2, specialisation: input.specialisation, minors: input.minors, diploma: input.diploma, diplomaStream: input.diplomaStream, completed, terms })
    const failing = () => checkCourse(draftOf(), data).statuses.filter((st) => st.status === 'fail').length
    for (let i = terms.length - 1; i >= 0 && total() > course.totalPoints; i--) {
      const term = terms[i] as PlanTerm
      for (const code of [...term.subjects].reverse()) {
        const points = data.subjects[code]?.points ?? 12.5
        if (!electives.has(code) || total() - points < course.totalPoints) continue
        const before = failing()
        term.subjects.splice(term.subjects.indexOf(code), 1)
        if (failing() > before || checkTerms(draftOf(), data).some((x) => x.severity === 'error')) term.subjects.push(code)
        else {
          electives.delete(code)
          // Its "added in …" note would no longer be true.
          for (let n = notes.length - 1; n >= 0; n--) if (notes[n]?.key === 'added' && notes[n]?.params.code === code) notes.splice(n, 1)
        }
      }
    }
  }

  // Spread the load, so the hard subjects don't all land in one semester.
  const draft: Plan = { course: input.course, courseYear: input.courseYear, major: input.major, major2: input.major2, specialisation: input.specialisation, minors: input.minors, diploma: input.diploma, diplomaStream: input.diplomaStream, completed, terms }
  for (const { a, b } of balanceTerms(draft, data, input.profile)) {
    notes.push(note('balanced', { a, b }, `Swapped ${a} and ${b} between semesters to spread the load.`))
  }
  // A subject swapped out for a lighter one was only one way to meet a requirement; the swap is
  // checked to keep every requirement met, so it isn't "left out" any more.
  const replaced = new Set<string>()
  const swappedTo = new Map<string, string>()
  for (const { a, b, kind } of fixHeavyTerms(draft, data, input.profile)) {
    if (kind === 'replace') {
      replaced.add(a)
      swappedTo.set(a, b)
    }
    if (kind === 'swap') notes.push(note('balanced', { a, b }, `Swapped ${a} and ${b} between semesters to spread the load.`))
    else notes.push(note('lighter', { a, b }, `Took ${b} instead of ${a}, which would have made that semester heavy.`))
  }
  // Keep "added in …" notes true to where each subject now sits, and to what replaced it.
  for (const n of notes) {
    if (n.key === 'added' && typeof n.params.code === 'string') {
      const now = swappedTo.get(n.params.code)
      if (now) {
        n.text = n.text.replace(n.params.code, now)
        n.params.code = now
      }
    }
    const where = typeof n.params.code === 'string' && 'year' in n.params ? terms.find((t) => t.subjects.includes(n.params.code as string)) : undefined
    if (!where) continue
    const was = `${n.params.year} ${n.params.period}`
    Object.assign(n.params, { year: where.year, period: where.period })
    n.text = n.text.replace(was, `${where.year} ${where.period}`)
  }
  const placed = allPlaced()
  // A subject failed on the record and planned again is a retake, not something new.
  const failedBefore = new Set(profile.results.filter((r) => isFail(r) && !done.has(r.code)).map((r) => r.code))
  for (const code of placed.filter((c) => failedBefore.has(c))) {
    const at = notes.findIndex((n) => n.key === 'prereqAdded' && n.params.code === code)
    const why = at >= 0 ? (notes[at]!.params.for as string) : undefined
    const retake = why
      ? note('retakeFor', { code, for: why }, `Retake ${code} (not passed last time): ${why} needs it.`)
      : note('retake', { code }, `Retake ${code} (not passed last time).`)
    if (at >= 0) notes.splice(at, 1, retake)
    else notes.push(retake)
  }
  // A required subject whose mark condition the record already fails ("75 in MUSI10221" with a
  // 60): it's still the way the degree goes, so it stays planned, with a warning to talk to the
  // coordinator (or retake) first.
  const marks = marksForConditions(profile.results, data)
  if (Object.keys(marks).length) {
    const wam = exactWam(profile.results, data)
    terms.forEach((t, i) => {
      const before = doneBefore(completed, terms, i, data)
      for (const code of t.subjects.filter((c) => required.has(c))) {
        const pre = data.subjects[code]?.prerequisites ?? 'none'
        const ctx = { completed: before, sameTerm: new Set([...before, ...t.subjects]), subjects: data.subjects, admittedCourse: input.course, ...majorsOf(input) }
        if (evaluateField(pre, { ...ctx, marks, wam }).status === 'fail' && evaluateField(pre, ctx).status !== 'fail') {
          notes.push(note('markUnmet', { code }, `${code} needs a mark your record doesn't reach yet; check with the coordinator before enrolling.`))
        }
      }
    })
  }

  const unplaced = [
    ...closedRequired.map((code) => ({ code, reasonKey: 'closedToCourse', reason: "it isn't open to students in this course" })),
    ...pending.filter((c) => !placed.includes(c) && !replaced.has(c)).map((code) => ({ code, ...explainUnplaced(code, data, input.startYear) })),
  ]

  const plan: Plan = {
    course: input.course,
    courseYear: input.courseYear,
    major: input.major,
    major2: input.major2,
    specialisation: input.specialisation,
    minors: input.minors,
    ...(input.diploma ? { diploma: input.diploma, diplomaStream: input.diplomaStream } : {}),
    completed,
    terms,
  }
  return { plan, unplaced, notes }
}

/** What conditions naming a major or minor are checked against. */
type Held = Pick<EvalContext, 'majors' | 'minors'>

/** Titles of the student's major, specialisation and minors, for conditions that name them. */
function majorsOf(input: GenerateInput): Held {
  return { majors: majorTitles(input.data, heldMajorIds(input)), minors: minorTitles(input.data, input.minors) }
}

/** The majors a career goal is read against (its accreditation route, when one of them leads there). */
function goalMajors(input: GenerateInput): string[] {
  return heldMajorIds(input).filter((id): id is string => !!id)
}

function note(key: string, params: Params, text: string): Note {
  return { key, params, text }
}

function collectRequired(input: GenerateInput, done: Set<string>, notes: Note[], needs: Map<string, string[]>): Set<string> {
  const { data } = input
  const course = findCourse(data, input.course, input.courseYear)
  const required = new Set<string>()
  for (const rule of course?.rules ?? []) {
    if (rule.kind === 'compulsory') rule.subjects.forEach((c) => required.add(c))
  }

  const groups: { title: string; req: Extract<ComponentReq, { choose: unknown }>; used: Set<string>; others?: Set<string>[]; limits?: (ComponentLimit & { taken: number })[] }[] = []
  // Each component's claimed subjects, for courses where a subject counts towards one major or minor only.
  const claimed: { id: string; used: Set<string> }[] = []
  const diploma = findDiploma(data, input.diploma)
  const stream = diploma ? diplomaStream(data, diploma, input.diplomaStream) : undefined
  for (const id of new Set([...planComponentIds(input), stream?.id])) {
    const component = findComponent(data, id)
    if (id && !component) notes.push(note('componentMissing', { id }, `${id} isn't in the dataset, so its subjects weren't added.`))
    if (component?.requirements === 'unknown') notes.push(note('componentUnknown', { title: component.title }, `${component.title}'s structure isn't curated yet.`))
    // Same allocation as the course check: a subject fills one requirement only.
    const used = new Set<string>()
    if (component) claimed.push({ id: component.id, used })
    // A major with routes follows the one the student's record points to.
    const needs = componentNeeds(component, done)
    // The component's caps on its choices ("no more than 25 points of level-1 electives"), with
    // the route's own, shared by all its "choose" groups as the course check counts them.
    const route = component?.routes?.find((r) => r.requirements === needs)
    const limits = [...(component?.limits ?? []), ...(route?.limits ?? [])].map((l) => ({ ...l, taken: 0 }))
    for (const req of needs) {
      if ('all' in req) req.all.forEach((c) => (required.add(c), used.add(c)))
      else groups.push({ title: component?.title ?? id ?? '', req, used, others: component ? partnersOf(component.id) : undefined, limits })
    }
  }
  // What the components a subject can't count twice with have claimed (filled in as they go).
  function partnersOf(id: string): Set<string>[] {
    return claimed.filter((o) => o.id !== id && !sharesAllowed(course, id, o.id)).map((o) => o.used)
  }

  // Also what the required subjects' own prerequisites name, two steps down: Actuarial's
  // ACTL subjects build on MAST20004/MAST20005, the mathematics path's subjects.
  const named = new Set<string>()
  let frontier = [...required]
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = []
    for (const c of frontier) {
      const s = data.subjects[c]
      for (const r of s ? [...referencedSubjects(s.prerequisites), ...referencedSubjects(s.corequisites)] : []) if (!named.has(r)) (named.add(r), next.push(r))
    }
    frontier = next
  }

  // A diploma's chains first, so a course path whose subject they rule out isn't chosen (B-COM's
  // ECON10005 with the mathematics a diploma stream builds on).
  const ahead = new Set(required)
  if (diploma) closePrereqs(input, ahead, done, [], new Map())
  // A course requirement with several paths (B-COM's standard or mathematics quantitative path):
  // the path that shares most with what's done or already required, else the first one listed.
  for (const rule of [...(course?.rules ?? []), ...(diploma?.rules ?? [])]) {
    if (rule.kind === 'compulsory' && diploma?.rules.includes(rule)) rule.subjects.forEach((c) => required.add(c))
    if (rule.kind !== 'requirement') continue
    const codesOf = (path: ComponentReq[]) => path.flatMap((r) => ('all' in r ? r.all : r.choose.from))
    // A path with a subject that can't be taken alongside one already required is out.
    const usable = rule.paths.filter((p) => !(p.flatMap((r) => ('all' in r ? r.all : [])).some((c) => clashes(c, done, ahead, data))))
    const score = (path: ComponentReq[]) => {
      const codes = codesOf(path)
      return codes.filter((c) => done.has(c) || required.has(c)).length * 10 + codes.filter((c) => named.has(c)).length
    }
    const path = (usable.length ? usable : rule.paths).reduce((best, p) => (score(p) > score(best) ? p : best))
    const used = new Set<string>()
    for (const req of path) {
      if ('all' in req) req.all.forEach((c) => (required.add(c), used.add(c)))
      else groups.push({ title: rule.description, req, used })
    }
  }

  if (!input.major && input.keepOpen?.length) {
    const count = new Map<string, number>()
    // Each major's own required subjects with their prerequisites, as if it were chosen.
    for (const id of input.keepOpen) {
      for (const c of collectRequired({ ...input, major: id, keepOpen: undefined }, done, [], new Map())) {
        if (data.subjects[c]?.level === 1 && !done.has(c)) count.set(c, (count.get(c) ?? 0) + 1)
      }
    }
    const common = [...count].filter(([, n]) => n * 2 >= input.keepOpen!.length).map(([c]) => c).sort()
    common.forEach((c) => required.add(c))
    if (common.length) notes.push(note('keptOpen', { codes: common.join(', '), n: input.keepOpen.length }, `Planned ${common.join(', ')}, which most of the ${input.keepOpen.length} majors you're deciding between start from.`))
  }

  // A career goal the major leads to: its accreditation route's subjects are planned like the
  // major's own (a "one of" list: the first still running, unless one is already in).
  const route = input.profile.career ? careerGoal(data, input.profile.career, goalMajors(input))?.major?.accreditation : undefined
  if (route) {
    const running = (c: string) => !!data.subjects[c] && data.subjects[c]!.discontinuedFrom === undefined
    for (const r of [...route.required, ...route.requiredBreadth]) {
      const codes = (Array.isArray(r) ? r : [r]).filter(running)
      if (codes.length && !codes.some((c) => done.has(c) || required.has(c))) required.add(codes[0]!)
    }
  }

  // "Choose N points from" groups, once every fixed subject is known. Ties in
  // score go to subjects that run in the least crowded teaching period.
  // Every option is scored as if its prerequisites were met: the plan adds them (closePrereqs),
  // and an empty list here left out every option that needs something first (most of a major's).
  const score = new Map(recommend(data, input.profile, { course: input.course, eligibleWith: Object.keys(data.subjects), year: input.startYear, goalComponents: goalMajors(input) }).map((r) => [r.code, r.score]))
  for (const { title, req, used, others = [], limits = [] } of groups) {
    // Claimed by a component this one can't share subjects with (B-ARTS: one major or minor each).
    const taken = (c: string) => used.has(c) || others.some((o) => o.has(c))
    // Whether counting `c` keeps within the component's caps; if so, counts it against them.
    const fits = (c: string, points: number) => {
      const pools = limits.filter((l) => l.from.includes(c))
      if (pools.some((l) => l.taken + points > l.max)) return false
      pools.forEach((l) => (l.taken += points))
      return true
    }
    let have = 0
    for (const c of req.choose.from) {
      if (have >= req.choose.points) break
      if ((done.has(c) || required.has(c)) && !taken(c) && fits(c, data.subjects[c]?.points ?? 12.5)) {
        used.add(c)
        // A subject we have no data for counts as a standard 12.5 points, as the course check counts it.
        have += data.subjects[c]?.points ?? 12.5
      }
    }
    const crowd = periodCrowding(required, data, input.startYear)
    const busy = (c: string) => {
      const s = data.subjects[c]
      const ps = s ? periodsFor(s, input.startYear) : []
      return ps.length ? Math.min(...ps.map((p) => crowd.get(p) ?? 0)) : Infinity
    }
    // A summer- or winter-only option comes last: the plan is laid out in semesters.
    const off = (c: string) => (data.subjects[c] && semesterless(data.subjects[c]!) ? 1 : 0)
    // An option the required subjects build on comes first: picking another would add it anyway.
    // An option only a by-hand condition can open ("excellent results", coordinator approval),
    // whatever else is done, comes after the ones the plan can show are open.
    const everything = new Set(Object.keys(data.subjects))
    const byHand = (c: string) => {
      const sub = data.subjects[c]
      if (!sub || sub.prerequisites === 'none' || sub.prerequisites === 'unknown') return 0
      return evaluateField(sub.prerequisites, { completed: everything, subjects: data.subjects, admittedCourse: input.course, ...majorsOf(input) }).status === 'unknown' ? 1 : 0
    }
    // An option whose prerequisites would bring in three or more subjects not otherwise planned (a
    // finance elective resting on three more maths subjects) after the ones that don't.
    const addsOf = new Map<string, number>()
    const adds = (c: string) => {
      let n = addsOf.get(c)
      if (n === undefined) {
        const sub = data.subjects[c]
        n = !sub || sub.prerequisites === 'none' || sub.prerequisites === 'unknown' ? 0 : resolvePrereqs(sub.prerequisites, done, required, data, input.course, c, majorsOf(input)).filter((x) => !required.has(x)).length
        addsOf.set(c, n)
      }
      return n
    }
    const extra = (c: string) => (adds(c) >= 3 ? adds(c) : 0)
    // Each subject an option brings in first takes an elective's place (and, in a full plan, can
    // push a cap over): it has to fit clearly better than an option that needs nothing more.
    const fit = (c: string) => (score.get(c) ?? -1) - EXTRA_SUBJECT_COST * adds(c)
    const order = [...req.choose.from].sort(
      (a, b) => off(a) - off(b) || byHand(a) - byHand(b) || Number(named.has(b)) - Number(named.has(a)) || extra(a) - extra(b) || fit(b) - fit(a) || busy(a) - busy(b),
    )
    for (const c of order) {
      if (have >= req.choose.points) break
      if (done.has(c) || required.has(c)) continue
      if (!runsDuringPlan(data.subjects[c], input.startYear)) continue
      // Nor one whose prerequisites nothing that runs can meet (ACCT30001 needs ACCT20008,
      // which isn't running): it would only end up unplaced.
      if (!prereqsCanRun(c, input.startYear, data, input.course, majorsOf(input))) continue
      // Nor one closed to this course's students (B-SCI's COMP10003).
      if (closedTo(c, input.course, data, majorsOf(input))) continue
      // An option that can't be taken alongside a subject already required (COMP20003 and a
      // major's ENGR30004) leaves the other options to fill the choice.
      if (clashes(c, done, required, data)) continue
      // Nor one past the component's cap on that kind of choice (B-MUS: 25 points of level 1).
      if (!fits(c, data.subjects[c]?.points ?? 12.5)) continue
      required.add(c)
      used.add(c)
      have += data.subjects[c]?.points ?? 12.5
      notes.push(note('chose', { code: c, title }, `Chose ${c} for ${title} (best match among its options).`))
    }
  }

  closePrereqs(input, required, done, notes, needs)
  if (diploma) {
    // The diploma's points (and its level minimums) beyond what its stream and rules name: the
    // best-matching subjects of its pool, those with nothing more to take first.
    const pts = (c: string) => data.subjects[c]?.points ?? 12.5
    const mine = () => [...required, ...done].filter((c) => inDiploma(data, diploma, stream, c))
    const levelRules = diploma.rules.filter((r): r is Extract<CourseRule, { kind: 'points' }> => r.kind === 'points' && r.min !== undefined && r.category === undefined)
    const short = (r: { level?: number; min?: number }) => (r.min ?? 0) - mine().filter((c) => r.level === undefined || data.subjects[c]?.level === r.level).reduce((sum, c) => sum + pts(c), 0)
    // Caps on a level (Music: at most 50 points of level 1): a subject that would go over is skipped.
    const capRules = diploma.rules.filter((r): r is Extract<CourseRule, { kind: 'points' }> => r.kind === 'points' && r.max !== undefined && r.category === undefined && r.level !== undefined)
    const fits = (c: string) => capRules.every((r) => data.subjects[c]?.level !== r.level || mine().filter((x) => data.subjects[x]?.level === r.level).reduce((sum, x) => sum + pts(x), 0) + pts(c) <= r.max!)
    const pool = Object.values(data.subjects).filter((s) => s.level <= 3 && inDiploma(data, diploma, stream, s.code) && !s.campus)
    for (const rule of [...levelRules].sort((a, b) => (b.level ?? 0) - (a.level ?? 0))) {
      const order = pool
        .filter((s) => (rule.level === undefined || s.level === rule.level) && !done.has(s.code) && !required.has(s.code))
        .filter((s) => runsDuringPlan(s, input.startYear) && prereqsCanRun(s.code, input.startYear, data, input.course, majorsOf(input)) && !clashes(s.code, done, required, data) && !closedTo(s.code, input.course, data, majorsOf(input)))
        .map((s) => ({ s, adds: s.prerequisites === 'none' || s.prerequisites === 'unknown' ? 0 : resolvePrereqs(s.prerequisites, done, required, data, input.course, s.code, majorsOf(input)).filter((x) => !required.has(x) && !done.has(x)).length }))
        .sort((a, b) => a.adds - b.adds || (score.get(b.s.code) ?? -1) - (score.get(a.s.code) ?? -1) || a.s.code.localeCompare(b.s.code))
      for (const { s } of order) {
        if (short(rule) <= 0) break
        if (required.has(s.code) || !fits(s.code)) continue
        required.add(s.code)
        notes.push(note('chose', { code: s.code, title: diploma.title }, `Chose ${s.code} for ${diploma.title} (best match among its options).`))
        closePrereqs(input, required, done, notes, needs)
      }
    }
  }
  return required
}

/**
 * Close over prerequisites so required subjects can actually be taken. Corequisites are
 * required too, but taken in the same semester (see coGroups), so they aren't ordered first.
 */
function closePrereqs(input: GenerateInput, required: Set<string>, done: Set<string>, notes: Note[], needs: Map<string, string[]>): void {
  const { data } = input
  const queue = [...required]
  while (queue.length > 0) {
    const code = queue.pop() as string
    const s = data.subjects[code]
    // Nothing is added for a subject the course closes: it's left out of the plan (see buildPlan).
    if (!s || data.courses.some((c) => c.code === input.course && c.closed.includes(code))) continue
    const pre = s.prerequisites !== 'none' && s.prerequisites !== 'unknown' ? resolvePrereqs(s.prerequisites, done, required, data, input.course, code, majorsOf(input)) : []
    const co = s.corequisites !== 'none' && s.corequisites !== 'unknown' ? resolvePrereqs(s.corequisites, done, required, data, input.course, code, majorsOf(input)) : []
    // A corequisite that names this subject back (VETS30016 and VETS30029) goes in the same
    // term; a one-way one ("25 points of GEOL, can be concurrent") may also come earlier.
    const mutual = (c: string) => referencedSubjects(data.subjects[c]?.corequisites ?? 'none').includes(code)
    for (const need of [...pre, ...co]) {
      if ((pre.includes(need) || !mutual(need)) && !needs.get(code)?.includes(need)) needs.set(code, [...(needs.get(code) ?? []), need])
      if (!required.has(need) && !done.has(need)) {
        required.add(need)
        queue.push(need)
        notes.push(note('prereqAdded', { code: need, for: code }, `Added ${need} because ${code} needs it.`))
      }
    }
  }
}

/**
 * Subjects the expression relies on that aren't completed yet — already-required
 * ones included, so they can be ordered first — preferring the branch that adds
 * the fewest new subjects.
 */
/** A requirement met by school results rather than a university subject. */
// "Study score of 25 in …", "VCE Units 3 and 4 Physics or equivalent", "Excellent results in VCE Units 3/4 …".
// Not "VCE Algorithmics students may …", which is a different kind of note.
const SCHOOL_RESULT = /study score|^(?:excellent results? in )?VCE Units? 3/i

function resolvePrereqs(expr: ReqExpr, done: Set<string>, required: Set<string>, data: Dataset, course: string, forCode = '', held: Held = {}): string[] {
  if ('subject' in expr) return done.has(expr.subject) ? [] : [expr.subject]
  if ('all' in expr) return [...new Set(expr.all.flatMap((e) => resolvePrereqs(e, done, required, data, course, forCode, held)))]
  if ('any' in expr) {
    // Fewest additions wins. A subject we have no data for (often a graduate
    // alternative) costs the most; assuming a manual condition (a VCE score, a
    // competency test) is cheaper than that but dearer than a subject we can place,
    // so the plan stays on the safe side and the plan check flags the assumption.
    // The exception is a school result (a VCE study score or equivalent): that's how
    // most students meet a first-year requirement, so it is assumed before adding a
    // bridging subject like MAST10012. The plan check still asks the student to confirm.
    // A subject taught only at a far campus (Dookie) is a last resort among placeable ones, and
    // one that gives no credit in this course (another degree's first-year subject) nearly so.
    const MANUAL = 50
    const SCHOOL = 0.5
    const cost = (o: string[]) =>
      o.reduce(
        (sum, c) =>
          sum + (closedTo(c, course, data, held) ? 10_000 : required.has(c) ? 0 : clashes(c, done, required, data) ? 10_000 : !data.subjects[c] || needsMissing(c, data) ? 100 : data.subjects[c]!.campus ? 40 : noCredit(data.subjects[c]!, course, data) ? 30 : semesterless(data.subjects[c]!) ? 20 : 1),
        0,
      )
    let best: string[] | null = null
    let bestCost = Infinity
    const firstYear = data.subjects[forCode]?.level === 1
    // What an option assumes rather than plans: manual conditions anywhere inside it.
    const assumed = (e: ReqExpr): number =>
      'manual' in e
        ? SCHOOL_RESULT.test(e.manual) ? SCHOOL : MANUAL
        : 'school' in e
          ? SCHOOL
          : 'placement' in e || 'permission' in e || 'average' in e || 'wam' in e
            ? MANUAL
            : 'all' in e
              ? e.all.reduce((sum, x) => sum + assumed(x), 0)
              : 0
    for (const e of expr.any) {
      // An option that needs admission to another course isn't open to this student at all.
      if (needsOtherAdmission(e, course)) continue
      const o = 'manual' in e ? [] : resolvePrereqs(e, done, required, data, course, forCode, held)
      // "Physics 1 needs Physics 2 or a VCE score; Physics 2 needs Physics 1 or a VCE score":
      // an option that itself needs this subject first would leave both waiting on each other.
      if (forCode && o.some((c) => needsFirst(c, forCode, data))) continue
      // For a first-year subject, waiting on another subject (even one already in the plan)
      // costs a semester, so the school result most students have wins over it.
      const c = cost(o) + assumed(e) + (firstYear ? o.length : 0)
      if (c < bestCost) [best, bestCost] = [o, c]
    }
    return best ?? []
  }
  if ('points' in expr) return pickForPoints(expr.points, done, required, data, course, held)
  return [] // admission / manual can't be resolved to specific subjects
}

/** Whether `code` needs `target` first, through its prerequisites or corequisites (a few steps deep). */
function needsFirst(code: string, target: string, data: Dataset, depth = 4): boolean {
  if (depth === 0) return false
  const s = data.subjects[code]
  if (!s) return false
  const refs = [...referencedSubjects(s.prerequisites), ...referencedSubjects(s.corequisites)]
  return refs.includes(target) || refs.some((r) => r !== code && needsFirst(r, target, data, depth - 1))
}

/** Would adding this subject break a non-allowed pair with one already completed or required? */
function needsOtherAdmission(e: ReqExpr, course: string): boolean {
  if ('admission' in e) return e.admission !== course
  // "Admission into … Master of IT" written out: a graduate route, not one for this student.
  if ('manual' in e) return /\badmission into|\bselection of\b/i.test(e.manual) && !new RegExp(`\\b${course}\\b`).test(e.manual)
  // A graduate subject (COMP90038) is never an undergraduate's way in.
  if ('subject' in e) return /^[A-Z]{4}9/.test(e.subject)
  if ('all' in e) return e.all.some((x) => needsOtherAdmission(x, course))
  if ('any' in e) return e.any.every((x) => needsOtherAdmission(x, course))
  return false
}

/**
 * A subject students of this course can't ever take: its prerequisites fail even with every
 * other subject done (e.g. "admission into the Bachelor of Biomedicine" only).
 */
const closedCache = new WeakMap<Dataset, Map<string, boolean>>()
/** Runs only in summer or winter: the planner lays out semesters, so it rarely finds a place. */
function semesterless(s: Subject): boolean {
  if (s.offerings === 'unknown') return false
  const periods = Object.values(s.offerings).flat()
  return periods.length > 0 && !periods.some((p) => p === 'semester-1' || p === 'semester-2')
}

/** Its prerequisites can only be met through a subject we have no data for (AGRI10046 needs AGRI10045). */
function needsMissing(code: string, data: Dataset): boolean {
  const s = data.subjects[code]
  if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') return false
  const known = new Set(Object.keys(data.subjects).filter((c) => c !== code))
  return evaluateField(s.prerequisites, { completed: known, subjects: data.subjects }).status === 'fail'
}

function closedTo(code: string, course: string, data: Dataset, held: Held = {}): boolean {
  // Closed to this course's students outright (B-COM's ACCT10002).
  if (data.courses.some((c) => c.code === course && c.closed.includes(code))) return true
  const s = data.subjects[code]
  if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') return false
  const cache = closedCache.get(data) ?? new Map<string, boolean>()
  closedCache.set(data, cache)
  const key = `${course}:${held.majors?.join('|') ?? '?'}:${held.minors?.join('|') ?? '?'}:${code}`
  if (!cache.has(key)) {
    // Everything counts as done, including prerequisites we have no file for: only a condition
    // no subject can meet (admission to another course) closes it.
    const everything = new Set([...Object.keys(data.subjects), ...referencedSubjects(s.prerequisites)].filter((c) => c !== code))
    cache.set(key, evaluateField(s.prerequisites, { completed: everything, subjects: data.subjects, admittedCourse: course, ...held }).status === 'fail')
  }
  return cache.get(key) as boolean
}

function clashes(code: string, done: Set<string>, required: Set<string>, data: Dataset): boolean {
  const mine = data.subjects[code]?.nonAllowed
  for (const other of [...done, ...required]) {
    if (mine && mine !== 'unknown' && mine.includes(other)) return true
    const theirs = data.subjects[other]?.nonAllowed
    if (theirs && theirs !== 'unknown' && theirs.includes(code)) return true
  }
  return false
}

/**
 * Subjects to add for an "N points of X" prerequisite: the lowest-level matching
 * subjects that run most often, until the threshold is met.
 */
function pickForPoints(
  req: { min: number; level?: number; area?: string; levels?: number[]; areas?: string[]; from?: string[] },
  done: Set<string>,
  required: Set<string>,
  data: Dataset,
  course: string,
  held: Held = {},
): string[] {
  const levels = req.levels ?? (req.level !== undefined ? [req.level] : undefined)
  const areas = req.areas ?? (req.area !== undefined ? [req.area] : undefined)
  // Points of any study, or of a level only ("200 points before this capstone", "25 points of
  // level 2"): the degree's own points get there, and the subject is placed once they have.
  // Adding subjects for it only piles up first-years.
  if (req.from === undefined && areas === undefined) return []
  const fits = (s: Subject) =>
    (req.from === undefined || req.from.includes(s.code)) &&
    (levels === undefined || levels.includes(s.level)) &&
    (areas === undefined || areas.includes(s.area))
  // What's done or already required counts first: "200 points of study" before a capstone is
  // mostly the major itself, not a pile of extra first-year subjects.
  let have = [...new Set([...done, ...required])].reduce((sum, c) => {
    const s = data.subjects[c]
    return s && fits(s) ? sum + s.points : sum
  }, 0)
  const runs = (s: Subject) => (s.offerings === 'unknown' ? 0 : Math.max(0, ...Object.values(s.offerings).map((p) => p.length)))
  // Lowest level first, so the requirement can be met early.
  const candidates = Object.values(data.subjects)
    .filter(
      (s) =>
        fits(s) &&
        !done.has(s.code) &&
        !required.has(s.code) &&
        // Not a far-campus subject (Dookie), nor one that gives no credit in this course.
        runs(s) > 0 &&
        !s.campus &&
        !noCredit(s, course, data) &&
        !clashes(s.code, done, required, data) &&
        !closedTo(s.code, course, data, held),
    )
    .sort((a, b) => a.level - b.level || runs(b) - runs(a) || a.code.localeCompare(b.code))
  const picks: string[] = []
  for (const s of candidates) {
    if (have >= req.min) break
    picks.push(s.code)
    have += s.points
  }
  return picks
}

/** Courses whose subjects carry categories, per dataset (worked out once). */
const categorisedCache = new WeakMap<Dataset, Set<string>>()
/** In a course whose subjects are categorised, one with no category there counts for nothing. */
function noCredit(s: Subject, course: string, data: Dataset): boolean {
  let courses = categorisedCache.get(data)
  if (!courses) categorisedCache.set(data, (courses = new Set(Object.values(data.subjects).flatMap((x) => Object.keys(x.categories)))))
  return s.categories[course] === undefined && courses.has(course)
}

/** False only when we know the subject doesn't run in any of the next few years. */
/** Whether some set of subjects that run (or whose timetable we don't know) meets its prerequisites. */
function prereqsCanRun(code: string, startYear: number, data: Dataset, course: string, held: Held = {}): boolean {
  const s = data.subjects[code]
  if (!s || s.prerequisites === 'none' || s.prerequisites === 'unknown') return true
  const running = new Set(
    [...Object.keys(data.subjects), ...referencedSubjects(s.prerequisites)].filter((c) => c !== code && runsDuringPlan(data.subjects[c], startYear)),
  )
  return evaluateField(s.prerequisites, { completed: running, subjects: data.subjects, admittedCourse: course, ...held }).status !== 'fail'
}

function runsDuringPlan(s: Subject | undefined, startYear: number): boolean {
  if (!s || s.offerings === 'unknown') return true
  // A year it might run counts too: "not available in 2026" says nothing about 2027.
  return [0, 1, 2, 3].some((d) => PERIODS.some((p) => offeredIn(s, startYear + d, p).status !== 'fail'))
}

/** How many required subjects can only be taken in each teaching period. */
function periodCrowding(required: Set<string>, data: Dataset, year: number): Map<Period, number> {
  const crowd = new Map<Period, number>()
  for (const c of required) {
    const s = data.subjects[c]
    const ps = s ? periodsFor(s, year) : []
    if (ps.length === 1) crowd.set(ps[0] as Period, (crowd.get(ps[0] as Period) ?? 0) + 1)
  }
  return crowd
}

/**
 * Required subjects that name each other as corequisites ("must also be enrolled in"), as groups
 * to place in the same term: VETS30016, VETS30029, VETS30030 and VETS30031 go in together.
 */
function coGroups(required: Set<string>, done: Set<string>, data: Dataset): (code: string) => string[] {
  const parent = new Map<string, string>()
  const find = (c: string): string => {
    const p = parent.get(c) ?? c
    if (p === c) return c
    const root = find(p)
    parent.set(c, root)
    return root
  }
  for (const c of required) {
    const s = data.subjects[c]
    if (!s || done.has(c)) continue
    for (const x of referencedSubjects(s.corequisites)) {
      const back = referencedSubjects(data.subjects[x]?.corequisites ?? 'none').includes(c)
      if (back && required.has(x) && !done.has(x)) parent.set(find(x), find(c))
    }
  }
  const groups = new Map<string, string[]>()
  for (const c of required) groups.set(find(c), [...(groups.get(find(c)) ?? []), c])
  return (code) => groups.get(find(code)) ?? [code]
}

function canTake(code: string, term: PlanTerm, before: Set<string>, data: Dataset, course: string, alongside: string[] = [], held: Held = {}): Tri {
  const s = data.subjects[code]
  if (!s) return 'unknown'
  if (offeredIn(s, term.year, term.period).status === 'fail') return 'fail'
  // Corequisites, and prerequisites that may be taken concurrently, may be in the same term: the
  // ones planned there count.
  const sameTerm = new Set([...before, ...term.subjects, ...alongside])
  const pre = evaluateField(s.prerequisites, { completed: before, sameTerm, subjects: data.subjects, admittedCourse: course, ...held })
  const co = evaluateField(s.corequisites, { completed: sameTerm, subjects: data.subjects, admittedCourse: course, ...held })
  if (pre.status === 'fail' || co.status === 'fail') return 'fail'
  return pre.status === 'unknown' || co.status === 'unknown' ? 'unknown' : 'ok'
}

function priority(code: string, first: Set<string>, depth: Map<string, number>, data: Dataset, year: number): number {
  const s = data.subjects[code]
  const scarcity = s ? 4 - Math.min(4, periodsFor(s, year).length) : 0
  return (first.has(code) ? 1000 : 0) + (depth.get(code) ?? 0) * 10 + scarcity * 3 - (s?.level ?? 3)
}

/** Longest chain of required subjects that depend on each subject. */
/**
 * Latest term index each subject can start in, working back from the plan's end: a subject
 * must come before everything that needs it, in a term it is offered. A chain that can't fit
 * at all gets -1, so it is urgent from the start.
 */
function latestStart(codes: string[], needs: Map<string, string[]>, terms: PlanTerm[], data: Dataset): Map<string, number> {
  const set = new Set(codes)
  const deps = new Map<string, string[]>()
  for (const c of codes) for (const p of needs.get(c) ?? []) if (set.has(p)) deps.set(p, [...(deps.get(p) ?? []), c])
  const memo = new Map<string, number>()
  const visit = (c: string, stack: Set<string>): number => {
    const known = memo.get(c)
    if (known !== undefined) return known
    if (stack.has(c)) return terms.length - 1 // guard against cyclic data
    stack.add(c)
    const limit = Math.min(terms.length, ...(deps.get(c) ?? []).map((d) => visit(d, stack)))
    stack.delete(c)
    const s = data.subjects[c]
    let i = limit - 1
    // A year-long subject is finished only after its Semester 2, which must come before what needs it.
    const finishes = (at: number) => (isYearLong(s) ? secondHalfOf(terms, at) : at)
    while (i >= 0 && s && (offeredIn(s, terms[i]!.year, terms[i]!.period).status === 'fail' || finishes(i) < 0 || finishes(i) >= limit)) i--
    memo.set(c, i)
    return i
  }
  codes.forEach((c) => visit(c, new Set()))
  return memo
}

/**
 * Earliest term index each subject could start in: after everything it needs (a year-long one
 * after its Semester 2), in a term it is offered. Terms past the end count as the plan's length.
 */
function earliestStart(codes: string[], needs: Map<string, string[]>, terms: PlanTerm[], data: Dataset): Map<string, number> {
  const set = new Set(codes)
  const memo = new Map<string, number>()
  const visit = (c: string, stack: Set<string>): number => {
    const known = memo.get(c)
    if (known !== undefined) return known
    if (stack.has(c)) return 0 // guard against cyclic data
    stack.add(c)
    const together = concurrentSubjects(data.subjects[c]?.prerequisites ?? 'none')
    const after = Math.max(-1, ...(needs.get(c) ?? []).filter((n) => set.has(n)).map((n) => {
      const at = visit(n, stack)
      if (together.includes(n)) return at - 1
      return isYearLong(data.subjects[n]) ? Math.max(at, secondHalfOf(terms, at)) : at
    }))
    stack.delete(c)
    const s = data.subjects[c]
    let i = after + 1
    while (i < terms.length && s && offeredIn(s, terms[i]!.year, terms[i]!.period).status === 'fail') i++
    memo.set(c, i)
    return i
  }
  codes.forEach((c) => visit(c, new Set()))
  return memo
}

function dependentDepth(codes: string[], data: Dataset, needs: Map<string, string[]>): Map<string, number> {
  const set = new Set(codes)
  const deps = new Map<string, string[]>()
  for (const c of codes) {
    const s = data.subjects[c]
    const refs = s ? [s.prerequisites, s.corequisites].flatMap((f) => (f !== 'none' && f !== 'unknown' ? referenced(f) : [])) : []
    for (const p of new Set([...refs, ...(needs.get(c) ?? [])])) if (set.has(p)) deps.set(p, [...(deps.get(p) ?? []), c])
  }
  const memo = new Map<string, number>()
  const visit = (c: string, stack: Set<string>): number => {
    if (memo.has(c)) return memo.get(c) as number
    if (stack.has(c)) return 0 // guard against cyclic data
    stack.add(c)
    const d = Math.max(0, ...(deps.get(c) ?? []).map((x) => 1 + visit(x, stack)))
    stack.delete(c)
    memo.set(c, d)
    return d
  }
  codes.forEach((c) => visit(c, new Set()))
  return memo
}

/** Subjects a requirement lets be taken in the same term ("may be taken concurrently"). */
function concurrentSubjects(field: Subject['prerequisites']): string[] {
  if (field === 'none' || field === 'unknown') return []
  const walk = (e: ReqExpr): string[] => ('subject' in e ? (e.concurrent ? [e.subject] : []) : 'all' in e ? e.all.flatMap(walk) : 'any' in e ? e.any.flatMap(walk) : [])
  return walk(field)
}

function referenced(expr: ReqExpr): string[] {
  if ('subject' in expr) return [expr.subject]
  if ('all' in expr) return expr.all.flatMap(referenced)
  if ('any' in expr) return expr.any.flatMap(referenced)
  return []
}

/** Most points in a summer or winter term without counting as an overload. */
const SHORT_TERM_POINTS = 25

/**
 * A required subject the semesters couldn't take but a summer or winter term can (FRST30001
 * runs only in summer, say): put it in the earliest such term where its prerequisites are done,
 * it runs, the course's progression allows it and the term has room, adding the term if needed.
 */
function placeShortTerms(terms: PlanTerm[], pending: string[], completed: string[], data: Dataset, courseCode: string, course: Course | undefined, notes: Note[], held: Held = {}): void {
  const placed = () => new Set(terms.flatMap((t) => t.subjects))
  const first = terms[0]
  const last = terms.at(-1)
  if (!first || !last) return
  for (const code of pending) {
    if (placed().has(code)) continue
    const s = data.subjects[code]
    if (!s) continue
    for (let year = first.year; year <= last.year; year++) {
      const done = (() => {
        for (const period of ['summer', 'winter'] as const) {
          const key = termKey(year, period)
          if (key < termKey(first.year, first.period) || key > termKey(last.year, last.period)) continue
          if (offeredIn(s, year, period).status !== 'ok') continue
          const existing = terms.find((t) => t.year === year && t.period === period)
          const used = (existing?.subjects ?? []).reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
          if (used + s.points > SHORT_TERM_POINTS) continue
          // Year-long subjects begun in this year's Semester 1 are not finished by winter.
          const running = (c: string) => period === 'winter' && isYearLong(data.subjects[c]) && terms.some((t) => t.year === year && t.period === 'semester-1' && t.subjects.includes(c))
          const before = [...completed, ...terms.filter((t) => termKey(t.year, t.period) < key).flatMap((t) => t.subjects)].filter((c) => !running(c))
          const term = existing ?? { year, period, subjects: [] }
          if (canTake(code, term, new Set(before), data, courseCode, [], held) === 'fail') continue
          if (course && !progressionAllows(code, course, before, data)) continue
          if (existing) existing.subjects.push(code)
          else {
            const at = terms.findIndex((t) => termKey(t.year, t.period) > key)
            terms.splice(at < 0 ? terms.length : at, 0, { ...term, subjects: [code] })
          }
          notes.push(note('shortTerm', { code, year, period }, `${code} runs only outside semesters, so it's planned in ${year} ${period}.`))
          return true
        }
        return false
      })()
      if (done) break
    }
  }
}

function progressionAllows(code: string, course: Course, taken: string[], data: Dataset): boolean {
  const s = data.subjects[code]
  if (!s) return true
  for (const rule of course.rules) {
    if (rule.kind !== 'progression' || s.level !== rule.beforeLevel) continue
    const pts = taken.reduce((sum, c) => {
      const t = data.subjects[c]
      return t && t.level === rule.level ? sum + t.points : sum
    }, 0)
    if (pts < rule.minPoints) return false
  }
  return true
}

interface PickCtx {
  input: GenerateInput
  course: Course
  term: PlanTerm
  before: Set<string>
  placed: string[]
  completed: string[]
  room: number
  /** Room in the Semester 2 that would finish a year-long pick (0 when there is none). */
  secondRoom: number
  focus: Set<string | undefined>
  /** Required subjects still to place: never picked as electives, and their non-allowed partners are off limits. */
  reserved: string[]
  opens: PathwayCounter
  /** Share of the plan done by the end of this term (0–1]. */
  progress: number
  /** Final top-up: fill a term even if some other minimum can no longer be met. */
  relaxed?: boolean
}

function pickElective(ctx: PickCtx): { code: string; why: string; ruleId: string } | null {
  const { input, course, term } = ctx
  const data = input.data
  // Required subjects not placed yet still count: they will use their share of
  // each requirement and cap, so electives shouldn't take it first. The overall total too:
  // electives only ever fill what the required subjects leave of the degree's points, so a
  // required subject pushed to a later semester isn't crowded out by electives past the total.
  const all = [...new Set([...ctx.completed, ...ctx.placed, ...ctx.reserved])]
  const deficits = pointRules(course)
    .filter((r) => r.min !== undefined)
    .map((r) => ({ rule: r, gap: (r.min as number) - sumPoints(all, data, course.code, r) }))
    .filter((d) => d.gap > 0)
    // A requirement that has fallen behind an even pace goes first, so ones that
    // need a chain (level-1 breadth is capped, so level 2 needs a start) begin early.
    .map((d) => ({ ...d, behind: specificity(d.rule) > 0 && (d.rule.min as number) - d.gap < (d.rule.min as number) * ctx.progress }))
    .sort((a, b) => Number(b.behind) - Number(a.behind) || specificity(b.rule) - specificity(a.rule) || b.gap - a.gap)
  if (deficits.length === 0) return null

  // Year level follows the points already completed, so mid-degree students are placed correctly.
  const yearLevel = Math.min(3, Math.floor(sumPoints([...ctx.before], data, course.code, {}) / 100) + 1)
  for (const { rule, gap } of deficits) {
    const levels = rule.level !== undefined ? [rule.level] : [yearLevel, ...[1, 2, 3].filter((l) => l !== yearLevel)]
    for (const level of levels) {
      if (level > yearLevel) continue
      // When level 1 can't cover the rest of this requirement (e.g. breadth: at most
      // 25 of its 50 points at level 1), a level-1 pick must lead on to a higher level.
      const cap = pointRules(course).find((r) => r.max !== undefined && r.level === 1 && r.category === rule.category)
      const levelOneRoom = cap ? (cap.max as number) - sumPoints(all, data, course.code, { level: 1, category: rule.category }) : Infinity
      const needsPath = level === 1 && gap > levelOneRoom
      const recs = recommend(data, input.profile, {
        course: course.code,
        ...majorsOf(input),
        goalComponents: goalMajors(input),
        category: rule.category,
        level,
        term: { year: term.year, period: term.period },
        planned: [...ctx.placed, ...ctx.reserved],
        eligibleWith: [...ctx.before],
      })
      const loadsUp = (c: string) => heavierWith(term.subjects, c, data, input.profile, input.course)
      for (const rec of rankElectives(recs, ctx.focus, data, (c) => ctx.opens(c, rule.category), input.profile, needsPath, loadsUp)) {
        const s = data.subjects[rec.code]
        if (!s || termShare(s) > ctx.room) continue
        if (isYearLong(s) && termShare(s) > ctx.secondRoom) continue
        if (offeredIn(s, term.year, term.period).status !== 'ok') continue
        if (!withinCaps(s, all, course, data, planComponentIds(input))) continue
        if (!ctx.relaxed && !leavesRoomForOthers(s, all, course, data)) continue
        if (!progressionAllows(s.code, course, [...ctx.before], data)) continue
        // A corequisite must already be in the plan (this term or earlier).
        const co = evaluateField(s.corequisites, { completed: new Set([...ctx.before, ...term.subjects]), subjects: data.subjects, admittedCourse: course.code, ...majorsOf(input) })
        if (co.status === 'fail') continue
        return { code: s.code, why: rule.description.toLowerCase(), ruleId: rule.id }
      }
    }
  }
  return null
}

/**
 * Order elective candidates: prerequisites confirmed met before ones we can't
 * confirm (not curated yet — the plan check flags those, and a sparse dataset
 * still yields a plan); then by score; on a tie, subjects in the major's own
 * areas first, so an empty profile doesn't fall back to alphabetical order;
 * then subjects that lead on to higher-level ones serving the same requirement
 * (a level-1 breadth subject with a level-2 follow-on beats a dead end, since
 * level-1 breadth is capped). Known-unmet candidates were already dropped by recommend().
 */
const STRESS_RANK: Record<StressLevel, number> = { ok: 0, heavy: 1, veryHeavy: 2 }

/** Whether adding this subject to these makes the semester heavier than it is. */
function heavierWith(subjects: string[], code: string, data: Dataset, profile: Profile, course: string): boolean {
  const before = termStress(subjects, data, profile, { course }).level
  const after = termStress([...subjects, code], data, profile, { course }).level
  return STRESS_RANK[after] > STRESS_RANK[before]
}

function rankElectives<T extends { code: string; score: number; eligibility: Tri }>(
  recs: T[],
  focus: Set<string | undefined>,
  data: Dataset,
  opens: (code: string) => number,
  profile: Profile,
  needsPath = false,
  loadsUp: (code: string) => boolean = () => false,
): T[] {
  const tier = (r: T) => (r.eligibility === 'ok' ? 0 : r.eligibility === 'unknown' ? 1 : 2)
  // A choice that would make its semester heavy gives up a few points, so a close
  // alternative wins but a clearly better fit (the student's own interest) still doesn't lose.
  const heavy = new Map<string, boolean>()
  const fit = (r: T) => {
    if (!heavy.has(r.code)) heavy.set(r.code, loadsUp(r.code))
    // Protecting a WAM: a subject that makes its semester heavier costs twice as much; out to
    // challenge themselves: half.
    const cost = HEAVY_PICK_COST * (profile.goal === 'wam' || profile.goal === 'easy' ? 2 : profile.goal === 'challenge' ? 0.5 : 1)
    return r.score - (heavy.get(r.code) ? cost : 0)
  }
  // A free choice leaning on the student's weak spot only when nothing else fits: stacked
  // with the compulsory subjects on the same skill, it's what makes a semester too much.
  const weak = weakSkills(data, profile)
  const onWeak = (r: T) => {
    const s = data.subjects[r.code]
    return s && skillsOf(s, data).some((k) => weak.has(k)) ? 1 : 0
  }
  const near = (r: T) => (focus.has(data.subjects[r.code]?.area) ? 0 : 1)
  // needsPath: a dead end would make the requirement impossible, so it's left out
  // (a later term may offer a subject that leads on).
  const path = (r: T) => (needsPath && opens(r.code) === 0 ? 1 : 0)
  return recs
    .filter((r) => tier(r) < 2 && path(r) === 0)
    .sort(
      (a, b) =>
        tier(a) - tier(b) ||
        path(a) - path(b) ||
        onWeak(a) - onWeak(b) ||
        fit(b) - fit(a) ||
        near(a) - near(b) ||
        opens(b.code) - opens(a.code),
    )
}

type PathwayCounter = (code: string, category: string | undefined) => number

/** How many higher-level subjects (optionally of one category) list this one in their prerequisites. */
function pathwayCounter(data: Dataset, course: string, startYear: number): PathwayCounter {
  const dependents = new Map<string, Subject[]>()
  for (const s of Object.values(data.subjects)) {
    if (s.prerequisites === 'none' || s.prerequisites === 'unknown') continue
    // A follow-on subject that isn't running isn't a path anywhere.
    if (!runsDuringPlan(s, startYear)) continue
    for (const c of new Set(referenced(s.prerequisites))) dependents.set(c, [...(dependents.get(c) ?? []), s])
  }
  return (code, category) => {
    const level = data.subjects[code]?.level ?? 0
    return (dependents.get(code) ?? []).filter(
      (d) => d.level > level && (category === undefined || categoryOf(d, course) === category),
    ).length
  }
}


function specificity(r: PointsRule): number {
  return (r.level !== undefined ? 1 : 0) + (r.category !== undefined ? 1 : 0)
}



/**
 * Taking a subject uses up points that another minimum might need. Only allow it
 * if every minimum it does *not* count towards can still be met in the points left.
 */
function leavesRoomForOthers(s: Subject, taken: string[], course: Course, data: Dataset): boolean {
  const left = course.totalPoints - sumPoints(taken, data, course.code, {}) - s.points
  for (const r of pointRules(course)) {
    if (r.min === undefined || matches(s, course.code, r)) continue
    const gap = r.min - sumPoints(taken, data, course.code, r)
    if (gap > left) return false
  }
  return true
}

interface RepairCtx {
  input: GenerateInput
  course: Course
  completed: string[]
  electives: Set<string>
  notes: Note[]
  focus: Set<string | undefined>
  reserved: string[]
  opens: PathwayCounter
}

/**
 * For each unmet minimum, look (latest term first) for an elective that only
 * serves requirements with slack and that no later subject depends on, and
 * swap it for a recommended subject that serves the unmet minimum.
 */
function repair(terms: PlanTerm[], ctx: RepairCtx): void {
  const { input, course, completed, electives, notes } = ctx
  const data = input.data
  for (let guard = 0; guard < 50; guard++) {
    const all = [...completed, ...terms.flatMap((t) => t.subjects)]
    const unmet = pointRules(course)
      .filter((r) => r.min !== undefined && (r.min as number) - sumPoints(all, data, course.code, r) > 0)
      .filter((r) => r.level !== undefined || r.category !== undefined) // a total shortfall is fixed by filling, not swapping
      .sort((a, b) => specificity(b) - specificity(a))
    if (unmet.length === 0 || !unmet.some((r) => trySwap(r, terms, all, ctx))) return
  }
  notes.push(note('repairStopped', {}, 'Stopped rebalancing electives after many swaps; review the plan manually.'))
}

function trySwap(r: PointsRule, terms: PlanTerm[], all: string[], ctx: RepairCtx): boolean {
  const { input, course, completed, electives, notes } = ctx
  const data = input.data
  for (let ti = terms.length - 1; ti >= 0; ti--) {
    const term = terms[ti] as PlanTerm
    for (const e of term.subjects) {
      const es = data.subjects[e]
      if (!electives.has(e) || !es || matches(es, course.code, r)) continue
      const others = all.filter((c) => c !== e)
      const laterNeedsIt =
        terms
          .slice(ti)
          .flatMap((t) => t.subjects)
          .some((c) => c !== e && dependsOn(data.subjects[c], e)) || pointsNeedIt(e, ti, terms, completed, input)
      if (laterNeedsIt) continue

      const before = [...doneBefore(completed, terms, ti, data)]
      const candidates = recommend(data, input.profile, {
        course: course.code,
        ...majorsOf(input),
        goalComponents: goalMajors(input),
        category: r.category,
        level: r.level,
        term: { year: term.year, period: term.period },
        planned: [...all, ...ctx.reserved],
        eligibleWith: before,
      })
      const rest = term.subjects.filter((c) => c !== e)
      const loadsUp = (c: string) => heavierWith(rest, c, data, input.profile, input.course)
      for (const rec of rankElectives(candidates, ctx.focus, data, (c) => ctx.opens(c, r.category), input.profile, false, loadsUp)) {
        const s = data.subjects[rec.code]
        if (!s || s.points > es.points) continue
        // Only like for like: a year-long subject would move half its points into Semester 2.
        if (isYearLong(s) !== isYearLong(es)) continue
        if (offeredIn(s, term.year, term.period).status !== 'ok') continue
        if (!withinCaps(s, others, course, data, planComponentIds(input))) continue
        if (!progressionAllows(s.code, course, before, data)) continue
        // Its corequisites must be in the plan by then, as when an elective is first picked.
        const co = evaluateField(s.corequisites, { completed: new Set([...before, ...term.subjects.filter((c) => c !== e)]), subjects: data.subjects, admittedCourse: course.code, ...majorsOf(input) })
        if (co.status === 'fail') continue
        // The swap must not break any minimum that is currently met.
        const after = [...others, s.code]
        const keepsMinimums = pointRules(course).every(
          (q) =>
            q.min === undefined ||
            sumPoints(all, data, course.code, q) < q.min ||
            sumPoints(after, data, course.code, q) >= q.min,
        )
        if (!keepsMinimums) continue
        term.subjects[term.subjects.indexOf(e)] = s.code
        electives.delete(e)
        electives.add(s.code)
        notes.push(note('swapped', { from: e, to: s.code, year: term.year, period: term.period, rule: r.id }, `Swapped ${e} for ${s.code} in ${term.year} ${term.period} to meet: ${r.description.toLowerCase()}.`))
        return true
      }
    }
  }
  return false
}

/**
 * Would removing `code` from term `from` break a later subject's prerequisites
 * (e.g. "25 points of level-2 MAST") that hold with it? dependsOn only sees named subjects.
 */
function pointsNeedIt(code: string, from: number, terms: PlanTerm[], completed: string[], input: GenerateInput): boolean {
  const data = input.data
  for (let j = from + 1; j < terms.length; j++) {
    const before = [...doneBefore(completed, terms, j, data)]
    const without = new Set(before.filter((c) => c !== code))
    for (const c of terms[j]?.subjects ?? []) {
      const pre = data.subjects[c]?.prerequisites
      if (!pre || pre === 'none' || pre === 'unknown') continue
      const ctx = { subjects: data.subjects, admittedCourse: input.course, ...majorsOf(input) }
      const withIt = evaluateField(pre, { ...ctx, completed: new Set(before) }).status
      if (withIt !== 'fail' && evaluateField(pre, { ...ctx, completed: without }).status === 'fail') return true
    }
  }
  return false
}

function dependsOn(s: Subject | undefined, code: string): boolean {
  if (!s) return false
  const refs = (f: Subject['prerequisites']) => (f === 'none' || f === 'unknown' ? [] : referenced(f))
  return refs(s.prerequisites).includes(code) || refs(s.corequisites).includes(code)
}

function explainUnplaced(code: string, data: Dataset, year: number): { reason: string; reasonKey: string } {
  const s = data.subjects[code]
  if (!s) return { reasonKey: 'notInDataset', reason: 'not in the dataset yet' }
  if (s.offerings === 'unknown') return { reasonKey: 'offeringsUnknown', reason: 'its teaching periods are not curated yet' }
  if (periodsFor(s, year).length === 0) return { reasonKey: 'notOffered', reason: 'not offered in the planned years' }
  return { reasonKey: 'noRoom', reason: 'its prerequisites or the study load left no room before the plan ended' }
}
