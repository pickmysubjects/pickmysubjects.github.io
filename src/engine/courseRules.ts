import type { Tri } from './expr'
import type { Issue, Params, Plan } from './plan'
import type { Component, ComponentLimit, ComponentReq, Course, CourseRule, Dataset, Diploma, Subject } from './schema'
import { doneBefore } from './yearLong'

export interface RuleStatus {
  ruleId: string
  description: string
  status: Tri
  /** Short English progress text, e.g. "212.5 / 225 points". */
  detail: string
  /** Translation key and values for `detail`. */
  detailKey: string
  params: Params
}

export interface CourseCheck {
  statuses: RuleStatus[]
  issues: Issue[]
}

export function findCourse(data: Dataset, code: string, year: number): Course | undefined {
  const sameCode = data.courses.filter((c) => c.code === code)
  // A year with no version of its own runs on the version in force then (the nearest earlier
  // one); before the first version we have, the first one is the closest guess.
  const byYear = [...sameCode].sort((a, b) => a.year - b.year)
  return byYear.filter((c) => c.year <= year).at(-1) ?? byYear[0]
}

/**
 * The course whose majors, minors and specialisations a course uses: its own, or those of the
 * course it is based on (B-SCIEXTD runs on B-SCI's).
 */
export function componentCourse(data: Dataset, code: string): string {
  return data.courses.find((c) => c.code === code)?.basedOn ?? code
}

export function findComponent(data: Dataset, id: string | undefined): Component | undefined {
  return id ? data.components.find((c) => c.id === id) : undefined
}

/**
 * Titles of the student's chosen major/specialisation ("Chinese Studies"), for conditions that
 * name majors. Undefined when none is chosen (or none is in the dataset): those stay unknown.
 */
export function majorTitles(data: Dataset, ids: readonly (string | undefined)[]): string[] | undefined {
  const titles = ids.map((id) => findComponent(data, id)?.title).filter((t): t is string => !!t)
  return titles.length ? titles : undefined
}

/**
 * Titles of the student's minors, for conditions that name a minor. Undefined when we don't know
 * (no list given): those conditions then stay unknown. An empty list means no minor.
 */
export function minorTitles(data: Dataset, ids: readonly string[] | undefined): string[] | undefined {
  if (!ids) return undefined
  return ids.map((id) => findComponent(data, id)?.title).filter((t): t is string => !!t)
}

/** True when the plan's minor picks are informal specialisations (B-DES), so they're named as such. */
export function informalPicks(data: Dataset, ids: readonly string[] | undefined): boolean {
  return (ids ?? []).some((id) => findComponent(data, id)?.informal === true)
}

/** Components a plan holds in its minors: minors, and informal specialisations (B-DES). */
export function heldAsMinor(c: Pick<Component, 'kind' | 'informal'>): boolean {
  return c.kind === 'minor' || c.informal
}

/** What a plan has chosen, as far as the course's components go. */
export interface PlanComponents {
  major?: string
  /** The optional second major. */
  major2?: string
  specialisation?: string
  minors?: readonly string[]
}

/** Every component id a plan has chosen: its major(s), specialisation, then its minors. */
export function planComponentIds(plan: PlanComponents): (string | undefined)[] {
  return [plan.major, plan.major2, plan.specialisation, ...(plan.minors ?? [])]
}

/**
 * The ids conditions naming a major are checked against: both majors, the specialisation, and a
 * diploma's stream (D-LANG French opens the French capstone the major's students take).
 */
export function heldMajorIds(plan: PlanComponents & { diplomaStream?: string }): (string | undefined)[] {
  return [plan.major, plan.major2, plan.specialisation, plan.diplomaStream]
}

/**
 * Why a minor can't go with this major (or with either of these majors), or null: the Handbook
 * rules out a minor in the major's own discipline (same title), and the pairs it lists.
 */
export function minorClash(data: Dataset, majorId: string | undefined | readonly (string | undefined)[], minorId: string): string | null {
  if (typeof majorId !== 'string' && majorId !== undefined) {
    for (const id of majorId) {
      const clash = minorClash(data, id, minorId)
      if (clash) return clash
    }
    return null
  }
  const major = findComponent(data, majorId)
  const minor = findComponent(data, minorId)
  if (!major || !minor) return null
  const key = (t: string) => t.toLowerCase().replace(/\s+(major|minor)$/, '').trim()
  if (key(major.title) === key(minor.title)) return `${minor.title} can't be both your major and your minor.`
  // A pair the Handbook rules out, listed on either side.
  if ((major.notWith ?? []).includes(minor.id) || (minor.notWith ?? []).includes(major.id)) return `The ${minor.title} minor can't be taken with the ${major.title} major.`
  return null
}

/** The course's major rule, if it has one. */
function majorRule(course: Course | undefined): Extract<CourseRule, { kind: 'major' }> | undefined {
  return course?.rules.find((r): r is Extract<CourseRule, { kind: 'major' }> => r.kind === 'major')
}

/** How many majors the course lets a student complete (1 when it says nothing). */
export function maxMajors(data: Dataset, course: string, year: number): number {
  const rule = majorRule(findCourse(data, course, year))
  return rule ? Math.max(rule.max ?? rule.count, rule.count) : 1
}

/**
 * Why this second major can't go with the first, or null: the same major twice, a pair the
 * Handbook rules out (`not_with`, on either side), or one whose required subjects exclude the
 * other's.
 */
export function majorClash(data: Dataset, firstId: string | undefined, secondId: string): string | null {
  if (!firstId) return null
  const a = findComponent(data, firstId)
  const b = findComponent(data, secondId)
  if (firstId === secondId) return `${b?.title ?? secondId} can't be both of your majors.`
  if (!a || !b) return null
  if ((a.notWith ?? []).includes(b.id) || (b.notWith ?? []).includes(a.id)) return `The ${a.title} and ${b.title} majors can't be taken together.`
  return cannotCombine(data, a.id, b.id)
}

/**
 * Whether a subject may count towards both of these components, by the course's rule: in
 * B-ARTS it can't ("subjects cannot be credited to more than one major or minor").
 */
export function sharesAllowed(course: Course | undefined, aId: string, bId: string): boolean {
  const rule = majorRule(course)
  const no = rule?.noDoubleCount ?? false
  if (no === true) return false
  if (no === false) return true
  return !no.some(([x, y]) => (x === aId && y === bId) || (x === bId && y === aId))
}

/** Whether a major's "non-allowed breadth" list covers this subject. */
function barsBreadth(c: Component, code: string): boolean {
  const n = c.nonAllowedBreadth
  if (!n || n.except.includes(code)) return false
  return n.subjects.includes(code) || n.areas.includes(code.slice(0, 4))
}

/**
 * Subjects that would be breadth in `course` but the student's major/specialisation doesn't let
 * them count as breadth, each with the component that bars it.
 */
export function barredBreadth(data: Dataset, course: string, ids: readonly (string | undefined)[]): Map<string, Component> {
  const comps = ids.map((id) => findComponent(data, id)).filter((c): c is Component => !!c?.nonAllowedBreadth)
  const barred = new Map<string, Component>()
  if (comps.length === 0) return barred
  for (const s of Object.values(data.subjects)) {
    if (s.categories[course] !== 'breadth') continue
    const by = comps.find((c) => barsBreadth(c, s.code))
    if (by) barred.set(s.code, by)
  }
  return barred
}

const barredCache = new WeakMap<Dataset, Map<string, Dataset>>()

/**
 * The dataset as a student with these majors sees it: a subject their major won't let them count
 * as breadth counts towards the course total only ('core'), in none of its category rules.
 */
export function withBarredBreadth(data: Dataset, course: string, ids: readonly (string | undefined)[]): Dataset {
  const key = [course, ...ids].join('|')
  let byKey = barredCache.get(data)
  if (!byKey) barredCache.set(data, (byKey = new Map()))
  const hit = byKey.get(key)
  if (hit) return hit
  const barred = barredBreadth(data, course, ids)
  let view = data
  if (barred.size > 0) {
    const subjects = { ...data.subjects }
    for (const code of barred.keys()) {
      const s = subjects[code]!
      subjects[code] = { ...s, categories: { ...s.categories, [course]: 'core' } }
    }
    view = { ...data, subjects }
  }
  byKey.set(key, view)
  return view
}

export function categoryOf(subject: Subject, course: string): string | undefined {
  return subject.categories[course]
}

/** The one category every known subject with this prefix and level has in the course, if they agree. */
function prefixCategory(code: string, data: Dataset, course: string): string | undefined {
  // Only subjects with a category count (postgraduate ones have none); a handful at least.
  const cats = Object.values(data.subjects)
    .filter((x) => x.code.startsWith(code.slice(0, 4)) && x.level === Number(code[4]))
    .map((x) => categoryOf(x, course))
    .filter((c): c is string => c !== undefined)
  return cats.length >= 3 && new Set(cats).size === 1 ? cats[0] : undefined
}

/**
 * Check course-level rules against everything completed or planned. With a concurrent diploma,
 * the diploma's own subjects are left out of the bachelor's rules (apart from the ones it may
 * cross-credit), and the diploma's rules follow the bachelor's.
 */
export function checkCourse(plan: Plan, given: Dataset): CourseCheck {
  const diploma = findDiploma(given, plan.diploma)
  if (!diploma || !findCourse(given, plan.course, plan.courseYear)) return checkBachelor(plan, given)
  const stream = diplomaStream(given, diploma, plan.diplomaStream)
  const split = diplomaSplit(plan, given, diploma, stream)
  const without = (shared: Set<string>): Plan => {
    const out = new Set(split.mine.filter((c) => !shared.has(c)))
    return { ...plan, completed: plan.completed.filter((c) => !out.has(c)), terms: plan.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => !out.has(c)) })) }
  }
  // The cross-credit that serves the bachelor best: the subjects its majors name, or those and the earliest others.
  const fails = (c: CourseCheck) => c.statuses.filter((s) => s.status === 'fail').length
  const best = split.shared.map((shared) => checkBachelor(without(shared), given)).reduce((a, b) => (fails(b) < fails(a) ? b : a))
  // Progression is about everything studied, the diploma's subjects included.
  const progression = new Set(findCourse(given, plan.course, plan.courseYear)!.rules.filter((r) => r.kind === 'progression').map((r) => r.id))
  const whole = progression.size ? checkBachelor(plan, given) : best
  const bachelor = {
    statuses: best.statuses.map((s) => (progression.has(s.ruleId) ? (whole.statuses.find((w) => w.ruleId === s.ruleId) ?? s) : s)),
    issues: [...best.issues.filter((i) => !progression.has(i.ruleId ?? '')), ...whole.issues.filter((i) => progression.has(i.ruleId ?? ''))],
  }
  const own = checkDiploma(plan, given, diploma, stream, split.mine)
  return { statuses: [...bachelor.statuses, ...own.statuses], issues: [...bachelor.issues, ...own.issues] }
}

function checkBachelor(plan: Plan, given: Dataset): CourseCheck {
  const course = findCourse(given, plan.course, plan.courseYear)
  if (!course) {
    return {
      statuses: [],
      issues: [
        {
          severity: 'warning',
          kind: 'course-unknown',
          params: { course: plan.course },
          message: `Rules for ${plan.course} haven't been curated yet.`,
        },
      ],
    }
  }

  // Each subject once, even if it's both completed and planned again (counted twice otherwise).
  const codes = [...new Set([...plan.completed, ...plan.terms.flatMap((t) => t.subjects)])]
  const barred = barredBreadth(given, plan.course, planComponentIds(plan))
  const data = withBarredBreadth(given, plan.course, planComponentIds(plan))
  const known = codes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
  const ctx: RuleCtx = { plan, data, course, known, codes, blocked: new Map(), contested: new Map() }
  allocate(ctx)
  const statuses = course.rules.map((rule) => checkRule(rule, ctx))
  const issues: Issue[] = statuses
    .filter((s) => s.status !== 'ok')
    .map((s) => {
      const rule = course.rules.find((r) => r.id === s.ruleId)
      const soft = rule?.kind === 'progression'
      return {
        severity: s.status === 'unknown' || soft ? 'warning' : 'error',
        kind: `rule-${rule?.kind ?? 'unknown'}`,
        ruleId: s.ruleId,
        params: s.params,
        message: `${s.description} — ${s.detail}`,
      }
    })
  for (const code of codes) {
    const by = barred.get(code)
    if (!by) continue
    issues.push({
      severity: 'info',
      kind: 'breadth-not-allowed',
      subject: code,
      params: { code, major: by.title },
      message: `${code} doesn't count as breadth for the ${by.title} ${by.kind}; it still counts towards your total points.`,
    })
  }
  return { statuses, issues }
}

interface RuleCtx {
  plan: Plan
  data: Dataset
  course: Course
  known: Subject[]
  codes: string[]
  /** Per component id: subjects other components have claimed, which it can't count too. */
  blocked: Map<string, Set<string>>
  /** Per component id: subjects the components it can't share with also list (used last). */
  contested: Map<string, Set<string>>
}

/** A component with the route the student is on (and that route's own limits). */
function onRoute(component: Component, codes: string[]): Component {
  if (!component.routes) return component
  const reqs = routeFor(component, codes, true)
  const route = component.routes.find((r) => r.requirements === reqs)
  return { ...component, requirements: reqs, limits: [...(component.limits ?? []), ...(route?.limits ?? [])] }
}

/**
 * Where the course doesn't let a subject count twice, which subjects each component can't use:
 * every "all" subject of a component it can't share with, and whatever such a component chosen
 * earlier (major, second major, specialisation, minors, in that order) has already counted.
 */
function allocate(ctx: RuleCtx): void {
  const ids = [...new Set(planComponentIds(ctx.plan).filter((id): id is string => !!id))]
  const comps = ids.map((id) => findComponent(ctx.data, id)).filter((c): c is Component => !!c).map((c) => onRoute(c, ctx.codes))
  if (comps.every((a) => comps.every((b) => a === b || sharesAllowed(ctx.course, a.id, b.id)))) return
  const reqsOf = (c: Component) => (c.requirements === 'unknown' ? [] : c.requirements)
  const fixed = (c: Component) => reqsOf(c).flatMap((r) => ('all' in r ? r.all : []))
  const counted = new Map<string, Set<string>>()
  for (const c of comps) {
    const partners = comps.filter((o) => o !== c && !sharesAllowed(ctx.course, c.id, o.id))
    const own = new Set(fixed(c))
    const mine = new Set<string>()
    for (const o of partners) {
      for (const x of fixed(o)) if (!own.has(x)) mine.add(x)
      for (const x of counted.get(o.id) ?? []) if (!own.has(x)) mine.add(x)
    }
    ctx.blocked.set(c.id, mine)
    // A choice both could count goes to the one that has no other option for it: picked last here.
    ctx.contested.set(c.id, new Set(partners.flatMap((o) => codesOf(reqsOf(o)))))
    if (c.requirements === 'unknown') continue
    const used = new Set(mine)
    const limits = (c.limits ?? []).map((l) => ({ ...l, taken: 0 }))
    const ordered = [...c.requirements.filter((r) => 'all' in r), ...c.requirements.filter((r) => !('all' in r))]
    ordered.forEach((r) => unmetRequirement(r, ctx, used, limits, ctx.contested.get(c.id)))
    counted.set(c.id, new Set([...used].filter((x) => !mine.has(x))))
  }
}

function checkRule(rule: CourseRule, ctx: RuleCtx): RuleStatus {
  const base = { ruleId: rule.id, description: rule.description }
  switch (rule.kind) {
    case 'compulsory': {
      const missing = rule.subjects.filter((c) => !ctx.codes.includes(c))
      if (missing.length > 0) return { ...base, status: 'fail', detail: `missing ${missing.join(', ')}`, detailKey: 'missing', params: { codes: missing.join(', ') } }
      if (rule.firstSemester) {
        // The first semester, not a summer term added before it.
        const first = ctx.plan.terms.find((t) => t.period === 'semester-1' || t.period === 'semester-2')?.subjects ?? []
        const late = rule.subjects.filter((c) => !ctx.plan.completed.includes(c) && !first.includes(c))
        if (late.length > 0) return { ...base, status: 'fail', detail: `${late.join(', ')} must be in your first semester`, detailKey: 'firstSemester', params: { codes: late.join(', ') } }
      }
      if (rule.firstYear) {
        // A foundation year: the first two semesters, not later.
        const year = ctx.plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2').slice(0, 2).flatMap((t) => t.subjects)
        const late = rule.subjects.filter((c) => !ctx.plan.completed.includes(c) && !year.includes(c))
        if (late.length > 0) return { ...base, status: 'fail', detail: `${late.join(', ')} must be in your first year`, detailKey: 'firstYear', params: { codes: late.join(', ') } }
      }
      return { ...base, status: 'ok', detail: 'done', detailKey: 'done', params: {} }
    }
    case 'points': {
      let total = 0
      let uncategorised = 0
      for (const s of ctx.known) {
        if (rule.level !== undefined && s.level !== rule.level) continue
        if (rule.category !== undefined) {
          const cat = categoryOf(s, ctx.course.code)
          if (cat === undefined) {
            uncategorised += s.points
            continue
          }
          if (cat !== rule.category) continue
        }
        total += s.points
      }
      // Subjects we have no data for: their level is the code's fifth character (MAST20018 is
      // level 2), so only those that could fall under this rule count as unknown. A rule on
      // total points alone counts them at the usual 12.5.
      let unknownCodes = ctx.codes.filter((c) => !ctx.data.subjects[c] && (rule.level === undefined || Number(c[4]) === rule.level))
      // A category rule: an unknown subject whose code prefix is all one category in this
      // course (every MAST subject is science in B-SCI) counts as that category.
      if (rule.category !== undefined) {
        const inferred = unknownCodes.map((c) => ({ c, cat: prefixCategory(c, ctx.data, ctx.course.code) }))
        total += inferred.filter((x) => x.cat === rule.category).length * 12.5
        unknownCodes = inferred.filter((x) => x.cat === undefined).map((x) => x.c)
      }
      let unknownSubjects = unknownCodes.length
      if (rule.level === undefined && rule.category === undefined) {
        total += unknownSubjects * 12.5
        unknownSubjects = 0
      }
      const parts: string[] = []
      if (rule.min !== undefined) parts.push(`${total} / ${rule.min} points`)
      else if (rule.max !== undefined) parts.push(`${total} of max ${rule.max} points`)
      if (uncategorised > 0) parts.push(`${uncategorised} points not yet categorised`)
      const detail = parts.join('; ')
      const pts = {
        detail,
        detailKey: rule.min !== undefined ? 'pointsMin' : 'pointsMax',
        params: { have: total, need: rule.min ?? rule.max ?? 0, uncategorised },
      }
      if (rule.max !== undefined && total > rule.max) return { ...base, status: 'fail', ...pts }
      // Uncategorised subjects, or ones we have no data for, might count towards a cap.
      if (rule.max !== undefined && total + uncategorised + unknownSubjects * 12.5 > rule.max) {
        return { ...base, status: 'unknown', ...pts }
      }
      if (rule.min !== undefined && total < rule.min) {
        const couldStillPass = uncategorised > 0 || unknownSubjects > 0
        return { ...base, status: couldStillPass ? 'unknown' : 'fail', ...pts }
      }
      return { ...base, status: 'ok', ...pts }
    }
    case 'major': {
      const major = findComponent(ctx.data, ctx.plan.major)
      // Not decided yet is normal in first year: can't be checked, rather than broken.
      if (!major) return { ...base, status: 'unknown', detail: 'no major chosen', detailKey: 'noMajor', params: {} }
      const first = componentStatus(base, major, ctx)
      if (!ctx.plan.major2) return first
      const max = Math.max(rule.max ?? rule.count, rule.count)
      if (max < 2) return { ...base, status: 'fail', detail: `only ${max} major can be completed in this course`, detailKey: 'tooManyMajors', params: { max } }
      const clash = majorClash(ctx.data, ctx.plan.major, ctx.plan.major2)
      if (clash) return { ...base, status: 'fail', detail: clash, detailKey: 'majorsClash', params: { reason: clash } }
      const major2 = findComponent(ctx.data, ctx.plan.major2)
      const second = major2
        ? componentStatus(base, major2, ctx)
        : { ...base, status: 'unknown' as const, detail: `${ctx.plan.major2} isn't in the dataset`, detailKey: 'componentMissingData', params: { id: ctx.plan.major2 } }
      return [first, second].find((r) => r.status === 'fail') ?? [first, second].find((r) => r.status === 'unknown') ?? second
    }
    case 'specialisation': {
      const spec = findComponent(ctx.data, ctx.plan.specialisation)
      if (!spec) return { ...base, status: 'ok', detail: 'none chosen (optional)', detailKey: 'noSpec', params: {} }
      if (spec.requiresMajor.length > 0 && !spec.requiresMajor.includes(ctx.plan.major ?? '') && !spec.requiresMajor.includes(ctx.plan.major2 ?? '')) {
        return { ...base, status: 'fail', detail: `${spec.title} needs one of these majors: ${spec.requiresMajor.join(', ')}`, detailKey: 'needsMajor', params: { title: spec.title, majors: spec.requiresMajor.join(', ') } }
      }
      const clash = [ctx.plan.major, ctx.plan.major2].filter((m): m is string => !!m).map((m) => cannotCombine(ctx.data, m, spec.id)).find((c) => c !== null) ?? null
      if (clash) return { ...base, status: 'fail', detail: clash, detailKey: 'cannotCombine', params: { reason: clash } }
      return componentStatus(base, spec, ctx)
    }
    case 'minor': {
      const ids = ctx.plan.minors ?? []
      if (ids.length === 0) return { ...base, status: 'ok', detail: 'none chosen (optional)', detailKey: 'noMinor', params: {} }
      if (ids.length > rule.max) return { ...base, status: 'fail', detail: `${ids.length} minors (at most ${rule.max})`, detailKey: 'tooManyMinors', params: { have: ids.length, max: rule.max } }
      const results: RuleStatus[] = []
      for (const id of ids) {
        const minor = findComponent(ctx.data, id)
        if (!minor) {
          results.push({ ...base, status: 'unknown', detail: `${id} isn't in the dataset`, detailKey: 'componentMissingData', params: { id } })
          continue
        }
        const clash = minorClash(ctx.data, [ctx.plan.major, ctx.plan.major2], id)
        if (clash) {
          results.push({ ...base, status: 'fail', detail: clash, detailKey: 'minorSameAsMajor', params: { title: minor.title } })
          continue
        }
        results.push(componentStatus(base, minor, ctx))
      }
      return results.find((r) => r.status === 'fail') ?? results.find((r) => r.status === 'unknown') ?? results[0]!
    }
    case 'level1-areas': {
      const byArea = new Map<string, number>()
      // Areas that uncategorised or unknown subjects might still add.
      const maybeAreas = new Set<string>()
      for (const s of ctx.known) {
        if (s.level !== 1) continue
        const cat = categoryOf(s, ctx.course.code)
        if (rule.category !== undefined && cat === undefined) maybeAreas.add(s.area)
        if (rule.category !== undefined && cat !== rule.category) continue
        byArea.set(s.area, (byArea.get(s.area) ?? 0) + s.points)
      }
      // Only unknown level-1 subjects could add an area (the level is the code's fifth character).
      const known = new Set(ctx.known.map((s) => s.code))
      const unknownSubjects = ctx.codes.filter((c) => !known.has(c) && Number(c[4]) === 1).length
      const couldReach = byArea.size + [...maybeAreas].filter((a) => !byArea.has(a)).length + unknownSubjects >= rule.minAreas
      const over = [...byArea].filter(([, pts]) => pts > rule.maxPointsPerArea)
      const overAreas = over.map(([a]) => a).join(', ')
      const detail = `${byArea.size} area(s)${over.length ? `; over ${rule.maxPointsPerArea} in ${overAreas}` : ''}`
      const areas = { detail, detailKey: 'areas', params: { count: byArea.size, over: overAreas, max: rule.maxPointsPerArea } }
      if (over.length > 0) return { ...base, status: 'fail', ...areas }
      if (byArea.size < rule.minAreas) return { ...base, status: couldReach ? 'unknown' : 'fail', ...areas }
      return { ...base, status: 'ok', ...areas }
    }
    case 'area-cap': {
      const exempt = capExempt(rule, ctx.data, planComponentIds(ctx.plan))
      const byArea = new Map<string, number>()
      for (const c of ctx.codes) {
        if (exempt.has(c)) continue
        const s = ctx.data.subjects[c]
        if (rule.category !== undefined && (!s || categoryOf(s, ctx.course.code) !== rule.category)) continue
        // A subject we have no data for still has its area and level in its code, at the usual 12.5.
        const area = s?.area ?? c.slice(0, 4)
        if (rule.areas && !rule.areas.includes(area)) continue
        if (rule.levels && !rule.levels.includes(s?.level ?? Number(c[4]))) continue
        const discipline = disciplineOf(rule, area)
        byArea.set(discipline, (byArea.get(discipline) ?? 0) + (s?.points ?? 12.5))
      }
      const over = [...byArea].filter(([, pts]) => pts > rule.max).map(([a, pts]) => `${a} (${pts})`).join(', ')
      if (over) return { ...base, status: 'fail', detail: `over ${rule.max} points in ${over}`, detailKey: 'areaCapOver', params: { max: rule.max, over } }
      const top = Math.max(0, ...byArea.values())
      return { ...base, status: 'ok', detail: `at most ${top} points in any one area`, detailKey: 'areaCapOk', params: { have: top, max: rule.max } }
    }
    case 'requirement': {
      // The path closest to done is the one shown; any finished path passes.
      const results = rule.paths.map((path) => {
        const used = new Set<string>()
        const ordered = [...path.filter((r) => 'all' in r), ...path.filter((r) => !('all' in r))]
        return ordered.map((r) => unmetRequirement(r, ctx, used)).filter((x): x is Unmet => x !== null)
      })
      if (results.some((u) => u.length === 0)) return { ...base, status: 'ok', detail: 'done', detailKey: 'done', params: {} }
      const best = results.reduce((a, b) => (b.length < a.length ? b : a))
      const missing = best.map((u) => u.text).join('; ')
      return { ...base, status: 'fail', detail: missing, detailKey: 'requirementMissing', params: { missing, parts: best.map((u) => u.part).join('|') } }
    }
    case 'progression': {
      const firstHigher = ctx.plan.terms.findIndex((t) =>
        t.subjects.some((c) => (ctx.data.subjects[c]?.level ?? 0) === rule.beforeLevel),
      )
      if (firstHigher === -1) return { ...base, status: 'ok', detail: `no level ${rule.beforeLevel} subjects yet`, detailKey: 'progressionNone', params: { level: rule.beforeLevel } }
      // Finished by then: a year-long subject started that Semester 1 is still running in Semester 2.
      const earlier = [...doneBefore(ctx.plan.completed, ctx.plan.terms, firstHigher, ctx.data)]
      const pts = earlier.reduce((sum, c) => {
        const s = ctx.data.subjects[c]
        return s && s.level === rule.level ? sum + s.points : sum
      }, 0)
      const detail = `${pts} level-${rule.level} points before your first level-${rule.beforeLevel} subject`
      return {
        ...base,
        status: pts >= rule.minPoints ? 'ok' : 'fail',
        detail,
        detailKey: 'progression',
        params: { have: pts, level: rule.level, before: rule.beforeLevel },
      }
    }
  }
}

/** The discipline an area counts towards under a cap: its group ("POLS+INTS") or the area itself. */
export function disciplineOf(rule: { groups?: string[][] }, area: string): string {
  return rule.groups?.find((g) => g.includes(area))?.join('+') ?? area
}

/** The codes a set of requirements names. */
const codesOf = (reqs: ComponentReq[]) => reqs.flatMap((r) => ('all' in r ? r.all : r.choose.from))

/**
 * The route a student is on: the one sharing most subjects with what they've done or planned
 * (a language major's entry point shows in the first-year subjects taken), else the first.
 */
export function routeFor(component: Component, have: Iterable<string>, coreFirst = false): ComponentReq[] | 'unknown' {
  if (!component.routes) return component.requirements
  const set = new Set(have)
  let best = component.routes[0]!
  let bestHits = -1
  for (const r of component.routes) {
    // Checking a plan: a route's own compulsory subjects tell more than electives it shares with
    // others (a second major's subjects can fill another route's elective lists).
    const core = coreFirst ? r.requirements.flatMap((q) => ('all' in q ? q.all : [])).filter((c) => set.has(c)).length : 0
    const hits = core * 1000 + codesOf(r.requirements).filter((c) => set.has(c)).length
    if (hits > bestHits) [best, bestHits] = [r, hits]
  }
  return best.requirements
}

/**
 * Subjects an area cap doesn't count for this plan: those of the last component of each
 * exception the plan has every component of.
 */
export function capExempt(rule: Extract<CourseRule, { kind: 'area-cap' }>, data: Dataset, ids: readonly (string | undefined)[]): Set<string> {
  const out = new Set<string>()
  for (const ex of rule.exceptions ?? []) {
    if (!ex.components.every((id) => ids.includes(id))) continue
    const last = findComponent(data, ex.components.at(-1))
    for (const c of last && last.requirements !== 'unknown' ? codesOf(last.requirements) : []) out.add(c)
  }
  return out
}

function componentStatus(
  base: { ruleId: string; description: string },
  component: Component,
  ctx: RuleCtx,
): RuleStatus {
  // With routes, check the one that fits what's done and planned (and that route's own limits).
  component = onRoute(component, ctx.codes)
  if (component.requirements === 'unknown') {
    const detail = `${component.title}: structure not curated yet`
    return { ...base, status: 'unknown', detail, detailKey: 'componentUnknown', params: { title: component.title } }
  }
  // A subject counts towards one requirement only: "all" lists claim theirs first,
  // then each "choose" group (in file order) takes from what's left. Where the course doesn't
  // let a subject count for two majors/minors, ones another has claimed are out too.
  const used = new Set(ctx.blocked.get(component.id) ?? [])
  // Points already counted from each limited pool; past its max a subject counts towards nothing.
  const limits = (component.limits ?? []).map((l) => ({ ...l, taken: 0 }))
  const ordered = [...component.requirements.filter((r) => 'all' in r), ...component.requirements.filter((r) => !('all' in r))]
  const unmet = ordered.map((r) => unmetRequirement(r, ctx, used, limits, ctx.contested.get(component.id))).filter((x): x is Unmet => x !== null)
  if (unmet.length === 0) {
    return { ...base, status: 'ok', detail: `${component.title} complete`, detailKey: 'componentDone', params: { title: component.title } }
  }
  return {
    ...base,
    status: 'fail',
    detail: `${component.title}: ${unmet.map((u) => u.text).join('; ')}`,
    detailKey: 'componentMissing',
    params: { title: component.title, missing: unmet.map((u) => u.text).join('; '), parts: unmet.map((u) => u.part).join('|') },
  }
}

/**
 * What's still missing from one requirement: English text, and a language-neutral part for the
 * UI ("all:CODES" or "choose:HAVE:NEED:CODES", codes comma-separated).
 */
interface Unmet {
  text: string
  part: string
}

function unmetRequirement(req: ComponentReq, ctx: RuleCtx, used: Set<string>, limits: (ComponentLimit & { taken: number })[] = [], last?: Set<string>): Unmet | null {
  if ('all' in req) {
    req.all.forEach((c) => used.add(c))
    const missing = req.all.filter((c) => !ctx.codes.includes(c))
    return missing.length ? { text: `missing ${missing.join(', ')}`, part: `all:${missing.join(',')}` } : null
  }
  let have = 0
  const from = last?.size ? [...req.choose.from.filter((c) => !last.has(c)), ...req.choose.from.filter((c) => last.has(c))] : req.choose.from
  for (const c of from) {
    if (have >= req.choose.points) break
    if (!ctx.codes.includes(c) || used.has(c)) continue
    // A subject we have no data for yet still counts as a standard 12.5-point subject.
    const points = ctx.data.subjects[c]?.points ?? 12.5
    const pools = limits.filter((l) => l.from.includes(c))
    if (pools.some((l) => l.taken + points > l.max)) continue
    pools.forEach((l) => (l.taken += points))
    used.add(c)
    have += points
  }
  if (have >= req.choose.points) return null
  const list = req.choose.from.join(', ')
  return { text: `${have} / ${req.choose.points} points from ${list}`, part: `choose:${have}:${req.choose.points}:${req.choose.from.join(',')}` }
}

/** Subjects a component needs, and which still have to be chosen. Used by the generator. */
export function componentNeeds(component: Component | undefined, have: Iterable<string> = []): ComponentReq[] {
  if (!component) return []
  const reqs = routeFor(component, have)
  return reqs === 'unknown' ? [] : reqs
}

/**
 * Why two components can't be taken together, or null: a subject one of them requires is
 * non-allowed with every option of one of the other's "choose" sets (Mechatronics needs
 * ENGR30004, which excludes both COMP20003 and COMP20007 that a computing specialisation
 * picks from), or with one of its compulsory subjects.
 */
export function cannotCombine(data: Dataset, aId: string, bId: string): string | null {
  const a = findComponent(data, aId)
  const b = findComponent(data, bId)
  const excludes = (x: string, y: string) => {
    const nx = data.subjects[x]?.nonAllowed
    const ny = data.subjects[y]?.nonAllowed
    return (nx !== undefined && nx !== 'unknown' && nx.includes(y)) || (ny !== undefined && ny !== 'unknown' && ny.includes(x))
  }
  for (const [one, other] of [[a, b], [b, a]] as const) {
    const fixed = componentNeeds(one).flatMap((r) => ('all' in r ? r.all : []))
    for (const req of componentNeeds(other)) {
      const options = 'all' in req ? req.all : req.choose.from
      for (const f of fixed) {
        const blocked = options.filter((o) => excludes(f, o))
        if ('all' in req ? blocked.length > 0 : blocked.length === options.length) {
          return `${f} (${one?.title}) can't be taken with ${blocked.join(' or ')} (${other?.title}).`
        }
      }
    }
  }
  return null
}

/** A concurrent diploma by code (undefined for none, or one the dataset doesn't have). */
export function findDiploma(data: Dataset, code: string | undefined): Diploma | undefined {
  return code ? data.diplomas?.find((d) => d.code === code) : undefined
}

/** The plan's diploma stream, when it is one of the diploma's. */
export function diplomaStream(data: Dataset, diploma: Diploma, id: string | undefined): Component | undefined {
  return id && diploma.streams.includes(id) ? findComponent(data, id) : undefined
}

/**
 * Why a plan can't add this diploma, or null: a major the diploma rules out, or a stream that is
 * already the plan's major or minor (the same study twice).
 */
export function diplomaClash(data: Dataset, diploma: Diploma, plan: PlanComponents & { diplomaStream?: string }): string | null {
  for (const id of [plan.major, plan.major2, plan.specialisation]) {
    if (id && diploma.notWith.includes(id)) return `The ${diploma.title} can't be taken with the ${findComponent(data, id)?.title ?? id} major.`
  }
  const stream = diplomaStream(data, diploma, plan.diplomaStream)
  const key = (t: string) => t.toLowerCase().replace(/\s+(major|minor)$/, '').trim()
  for (const id of planComponentIds(plan)) {
    const held = findComponent(data, id)
    if (stream && held && (held.id === stream.id || key(held.title) === key(stream.title))) return `${stream.title} is already in your degree, so it can't also be your diploma.`
  }
  return null
}

/** The subject area most of a component's subjects share (FREN for French Studies). */
function mainArea(component: Component): string | undefined {
  const count = new Map<string, number>()
  for (const reqs of component.routes ? component.routes.map((r) => r.requirements) : component.requirements === 'unknown' ? [] : [component.requirements])
    for (const code of codesOf(reqs)) count.set(code.slice(0, 4), (count.get(code.slice(0, 4)) ?? 0) + 1)
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/** Whether a subject counts towards the diploma: its pool, its rules' subjects, or its stream's. */
export function inDiploma(data: Dataset, diploma: Diploma, stream: Component | undefined, code: string): boolean {
  const s = data.subjects[code]
  if (s && s.level > 3) return false
  const area = s?.area ?? code.slice(0, 4)
  if (diploma.pool.subjects.includes(code) || diploma.pool.areas.includes(area)) return true
  if (diploma.rules.some((r) => (r.kind === 'compulsory' && r.subjects.includes(code)) || (r.kind === 'requirement' && r.paths.some((p) => codesOf(p).includes(code))))) return true
  if (!stream) return false
  const lists = stream.routes ? stream.routes.map((r) => r.requirements) : stream.requirements === 'unknown' ? [] : [stream.requirements]
  return lists.some((reqs) => codesOf(reqs).includes(code)) || mainArea(stream) === area
}

/**
 * Which planned subjects are the diploma's (up to its points: its compulsory subjects, then its
 * stream's, then enough at each level its rules ask for, then the rest in plan order, those the
 * bachelor's majors don't name first), and the ways up to `crossCredit` points of them may count
 * towards the bachelor too.
 */
export function diplomaSplit(plan: Plan, data: Dataset, diploma: Diploma, stream: Component | undefined): { mine: string[]; shared: Set<string>[] } {
  const pts = (c: string) => data.subjects[c]?.points ?? 12.5
  const ordered = [...new Set([...plan.completed, ...plan.terms.flatMap((t) => t.subjects)])]
  const pool = ordered.filter((c) => inDiploma(data, diploma, stream, c))
  // What the bachelor itself names: its compulsory subjects, its requirement paths, its majors' and minors' lists.
  const own = findCourse(data, plan.course, plan.courseYear)?.rules ?? []
  const named = new Set([
    ...own.flatMap((r) => (r.kind === 'compulsory' ? r.subjects : r.kind === 'requirement' ? r.paths.flatMap(codesOf) : [])),
    ...planComponentIds(plan)
      .map((id) => findComponent(data, id))
      .flatMap((c) => (c ? (c.routes ? c.routes.flatMap((r) => codesOf(r.requirements)) : c.requirements === 'unknown' ? [] : codesOf(c.requirements)) : [])),
  ])
  const prefer = [...pool.filter((c) => !named.has(c)), ...pool.filter((c) => named.has(c))]
  const mine: string[] = []
  let total = 0
  const take = (c: string) => {
    if (mine.includes(c) || total >= diploma.totalPoints) return
    mine.push(c)
    total += pts(c)
  }
  const compulsory = diploma.rules.flatMap((r) => (r.kind === 'compulsory' ? r.subjects : []))
  prefer.filter((c) => compulsory.includes(c)).forEach(take)
  // Each part of its structure in turn, so a choice it needs isn't crowded out by electives.
  for (const r of diploma.rules) {
    if (r.kind !== 'requirement') continue
    const path = r.paths.reduce((best, p) => (codesOf(p).filter((c) => pool.includes(c)).length > codesOf(best).filter((c) => pool.includes(c)).length ? p : best))
    // A subject fills one part only, as the check counts it.
    const used = new Set<string>()
    for (const q of [...path.filter((x) => 'all' in x), ...path.filter((x) => !('all' in x))]) {
      if ('all' in q) prefer.filter((c) => q.all.includes(c)).forEach((c) => (take(c), used.add(c)))
      else {
        let got = 0
        for (const c of [...mine, ...prefer]) {
          if (got >= q.choose.points || used.has(c) || !q.choose.from.includes(c)) continue
          take(c)
          if (mine.includes(c)) (used.add(c), (got += pts(c)))
        }
      }
    }
  }
  const streamCodes = stream ? codesOf(routeFor(stream, ordered, true) === 'unknown' ? [] : (routeFor(stream, ordered, true) as ComponentReq[])) : []
  prefer.filter((c) => streamCodes.includes(c)).forEach(take)
  for (const r of diploma.rules) {
    if (r.kind !== 'points' || r.level === undefined || r.min === undefined) continue
    const level = r.level
    const at = () => mine.filter((c) => (data.subjects[c]?.level ?? Number(c[4])) === level).reduce((sum, c) => sum + pts(c), 0)
    for (const c of prefer) if ((data.subjects[c]?.level ?? Number(c[4])) === level && at() < r.min) take(c)
  }
  prefer.forEach(take)
  // Cross-credit: first what the bachelor's majors and minors name, then (another way) the earliest others too.
  const credit = (list: string[]) => {
    const out = new Set<string>()
    let used = 0
    for (const c of list) if (used + pts(c) <= diploma.crossCredit) (out.add(c), (used += pts(c)))
    return out
  }
  const inOrder = ordered.filter((c) => mine.includes(c))
  const first = credit(inOrder.filter((c) => named.has(c)))
  const second = credit([...first, ...inOrder.filter((c) => !first.has(c))])
  return { mine, shared: [first, second] }
}

/** The diploma's rules as the plan shows them: ids prefixed with its code, a stream rule and an entry rule first. */
export function diplomaRules(diploma: Diploma): CourseRule[] {
  const id = (x: string) => `${diploma.code}:${x}`
  const extra: CourseRule[] = [{ id: id('eligible'), description: `${diploma.title}: open to this degree and major`, kind: 'major', count: 1, max: 1, noDoubleCount: false }]
  if (diploma.streams.length) extra.push({ id: id('stream'), description: `${diploma.title}: complete one stream`, kind: 'major', count: 1, max: 1, noDoubleCount: false })
  return [...extra, ...diploma.rules.map((r) => ({ ...r, id: id(r.id), description: `${diploma.title}: ${r.description}` }))]
}

/** Every rule a plan is checked against: its course's, then its diploma's. */
export function planRules(data: Dataset, plan: { course: string; courseYear: number; diploma?: string }): CourseRule[] {
  const diploma = findDiploma(data, plan.diploma)
  return [...(findCourse(data, plan.course, plan.courseYear)?.rules ?? []), ...(diploma ? diplomaRules(diploma) : [])]
}

function checkDiploma(plan: Plan, data: Dataset, diploma: Diploma, stream: Component | undefined, mine: string[]): CourseCheck {
  const rules = diplomaRules(diploma)
  const statuses: RuleStatus[] = []
  const base = (x: string) => ({ ruleId: `${diploma.code}:${x}`, description: rules.find((r) => r.id === `${diploma.code}:${x}`)!.description })
  const clash = diplomaClash(data, diploma, plan)
  if (clash) statuses.push({ ...base('eligible'), status: 'fail', detail: clash, detailKey: 'diplomaClash', params: { reason: clash } })
  const allCodes = [...new Set([...plan.completed, ...plan.terms.flatMap((t) => t.subjects)])]
  const course: Course = { code: diploma.code, title: diploma.title, year: diploma.year, totalPoints: diploma.totalPoints, standardLoad: 50, categories: [], areaCategories: undefined, closed: [], listed: false, basedOn: undefined, entryNote: diploma.entryNote, rules: diploma.rules, handbook: diploma.handbook, verifiedOn: diploma.verifiedOn }
  if (diploma.streams.length) {
    if (!stream) statuses.push({ ...base('stream'), status: 'unknown', detail: 'no stream chosen', detailKey: 'noStream', params: {} })
    else {
      // The stream is checked against the whole plan: its subjects may sit in the bachelor or the diploma.
      const known = allCodes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
      statuses.push(componentStatus(base('stream'), stream, { plan, data, course, known, codes: allCodes, blocked: new Map(), contested: new Map() }))
    }
  }
  const known = mine.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
  const ctx: RuleCtx = { plan: { ...plan, completed: plan.completed.filter((c) => mine.includes(c)), terms: plan.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => mine.includes(c)) })) }, data, course, known, codes: mine, blocked: new Map(), contested: new Map() }
  for (const r of diploma.rules) statuses.push({ ...checkRule(r, ctx), ...base(r.id) })
  const issues: Issue[] = statuses
    .filter((s) => s.status !== 'ok')
    .map((s) => ({
      severity: s.status === 'unknown' ? 'warning' : 'error',
      kind: `rule-${rules.find((r) => r.id === s.ruleId)?.kind ?? 'unknown'}`,
      ruleId: s.ruleId,
      params: s.params,
      message: `${s.description} — ${s.detail}`,
    }))
  return { statuses, issues }
}

/**
 * What a diploma asks the generator to plan: its stream's requirements (on the route the record
 * points to) and its own compulsory and structure rules. Points to reach come from `diplomaPoints`.
 */
export function diplomaNeeds(data: Dataset, diploma: Diploma, streamId: string | undefined, have: Iterable<string> = []): ComponentReq[] {
  const out: ComponentReq[] = [...componentNeeds(diplomaStream(data, diploma, streamId), have)]
  for (const r of diploma.rules) {
    if (r.kind === 'compulsory') out.push({ all: r.subjects })
    if (r.kind === 'requirement') out.push(...r.paths[0]!)
  }
  return out
}
