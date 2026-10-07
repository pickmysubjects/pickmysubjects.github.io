import type { Tri } from './expr'
import type { Issue, Params, Plan } from './plan'
import type { Component, ComponentReq, Course, CourseRule, Dataset, Subject } from './schema'

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
  return sameCode.find((c) => c.year === year) ?? sameCode.sort((a, b) => b.year - a.year)[0]
}

export function findComponent(data: Dataset, id: string | undefined): Component | undefined {
  return id ? data.components.find((c) => c.id === id) : undefined
}

export function categoryOf(subject: Subject, course: string): string | undefined {
  return subject.categories[course]
}

/** Check course-level rules against everything completed or planned. */
export function checkCourse(plan: Plan, data: Dataset): CourseCheck {
  const course = findCourse(data, plan.course, plan.courseYear)
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

  const codes = [...plan.completed, ...plan.terms.flatMap((t) => t.subjects)]
  const known = codes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
  const statuses = course.rules.map((rule) => checkRule(rule, { plan, data, course, known, codes }))
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
  return { statuses, issues }
}

interface RuleCtx {
  plan: Plan
  data: Dataset
  course: Course
  known: Subject[]
  codes: string[]
}

function checkRule(rule: CourseRule, ctx: RuleCtx): RuleStatus {
  const base = { ruleId: rule.id, description: rule.description }
  switch (rule.kind) {
    case 'compulsory': {
      const missing = rule.subjects.filter((c) => !ctx.codes.includes(c))
      if (missing.length > 0) return { ...base, status: 'fail', detail: `missing ${missing.join(', ')}`, detailKey: 'missing', params: { codes: missing.join(', ') } }
      if (rule.firstSemester) {
        const first = ctx.plan.terms[0]?.subjects ?? []
        const late = rule.subjects.filter((c) => !ctx.plan.completed.includes(c) && !first.includes(c))
        if (late.length > 0) return { ...base, status: 'fail', detail: `${late.join(', ')} must be in your first semester`, detailKey: 'firstSemester', params: { codes: late.join(', ') } }
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
      const unknownSubjects = ctx.codes.length - ctx.known.length
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
      if (rule.min !== undefined && total < rule.min) {
        const couldStillPass = uncategorised > 0 || unknownSubjects > 0
        return { ...base, status: couldStillPass ? 'unknown' : 'fail', ...pts }
      }
      return { ...base, status: 'ok', ...pts }
    }
    case 'major': {
      const major = findComponent(ctx.data, ctx.plan.major)
      if (!major) return { ...base, status: 'fail', detail: 'no major chosen', detailKey: 'noMajor', params: {} }
      return componentStatus(base, major, ctx)
    }
    case 'specialisation': {
      const spec = findComponent(ctx.data, ctx.plan.specialisation)
      if (!spec) return { ...base, status: 'ok', detail: 'none chosen (optional)', detailKey: 'noSpec', params: {} }
      if (spec.requiresMajor.length > 0 && !spec.requiresMajor.includes(ctx.plan.major ?? '')) {
        return { ...base, status: 'fail', detail: `${spec.title} needs one of these majors: ${spec.requiresMajor.join(', ')}`, detailKey: 'needsMajor', params: { title: spec.title, majors: spec.requiresMajor.join(', ') } }
      }
      return componentStatus(base, spec, ctx)
    }
    case 'level1-areas': {
      const byArea = new Map<string, number>()
      for (const s of ctx.known) {
        if (s.level !== 1) continue
        if (rule.category !== undefined && categoryOf(s, ctx.course.code) !== rule.category) continue
        byArea.set(s.area, (byArea.get(s.area) ?? 0) + s.points)
      }
      const over = [...byArea].filter(([, pts]) => pts > rule.maxPointsPerArea)
      const overAreas = over.map(([a]) => a).join(', ')
      const detail = `${byArea.size} area(s)${over.length ? `; over ${rule.maxPointsPerArea} in ${overAreas}` : ''}`
      const areas = { detail, detailKey: 'areas', params: { count: byArea.size, over: overAreas, max: rule.maxPointsPerArea } }
      if (over.length > 0 || byArea.size < rule.minAreas) return { ...base, status: 'fail', ...areas }
      return { ...base, status: 'ok', ...areas }
    }
    case 'progression': {
      const firstHigher = ctx.plan.terms.findIndex((t) =>
        t.subjects.some((c) => (ctx.data.subjects[c]?.level ?? 0) === rule.beforeLevel),
      )
      if (firstHigher === -1) return { ...base, status: 'ok', detail: `no level ${rule.beforeLevel} subjects yet`, detailKey: 'progressionNone', params: { level: rule.beforeLevel } }
      const earlier = [...ctx.plan.completed, ...ctx.plan.terms.slice(0, firstHigher).flatMap((t) => t.subjects)]
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

function componentStatus(
  base: { ruleId: string; description: string },
  component: Component,
  ctx: RuleCtx,
): RuleStatus {
  if (component.requirements === 'unknown') {
    const detail = `${component.title}: structure not curated yet`
    return { ...base, status: 'unknown', detail, detailKey: 'componentUnknown', params: { title: component.title } }
  }
  // A subject counts towards one requirement only: "all" lists claim theirs first,
  // then each "choose" group (in file order) takes from what's left.
  const used = new Set<string>()
  const ordered = [...component.requirements.filter((r) => 'all' in r), ...component.requirements.filter((r) => !('all' in r))]
  const unmet = ordered.map((r) => unmetRequirement(r, ctx, used)).filter((x): x is string => x !== null)
  if (unmet.length === 0) {
    return { ...base, status: 'ok', detail: `${component.title} complete`, detailKey: 'componentDone', params: { title: component.title } }
  }
  return {
    ...base,
    status: 'fail',
    detail: `${component.title}: ${unmet.join('; ')}`,
    detailKey: 'componentMissing',
    params: { title: component.title, missing: unmet.join('; ') },
  }
}

function unmetRequirement(req: ComponentReq, ctx: RuleCtx, used: Set<string>): string | null {
  if ('all' in req) {
    req.all.forEach((c) => used.add(c))
    const missing = req.all.filter((c) => !ctx.codes.includes(c))
    return missing.length ? `missing ${missing.join(', ')}` : null
  }
  let have = 0
  for (const c of req.choose.from) {
    if (have >= req.choose.points) break
    if (!ctx.codes.includes(c) || used.has(c)) continue
    used.add(c)
    have += ctx.data.subjects[c]?.points ?? 0
  }
  return have >= req.choose.points ? null : `${have} / ${req.choose.points} points from ${req.choose.from.join(', ')}`
}

/** Subjects a component needs, and which still have to be chosen. Used by the generator. */
export function componentNeeds(component: Component | undefined): ComponentReq[] {
  if (!component || component.requirements === 'unknown') return []
  return component.requirements
}
