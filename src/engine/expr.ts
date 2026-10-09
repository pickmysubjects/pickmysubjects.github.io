import type { ReqExpr, ReqField, Subject } from './schema'

/** Three-valued result: uncurated or free-text requirements yield `unknown`, never `ok`. */
export type Tri = 'ok' | 'fail' | 'unknown'

export interface EvalContext {
  /** Subjects passed before the point being evaluated. */
  completed: ReadonlySet<string>
  subjects: Readonly<Record<string, Subject>>
  /** Course the student is admitted to, e.g. "B-SCI". */
  admittedCourse?: string
}

export interface EvalResult {
  status: Tri
  /** Human-readable descriptions of what is not (yet) satisfied. */
  unmet: string[]
}

export function evaluateField(field: ReqField, ctx: EvalContext): EvalResult {
  if (field === 'none') return { status: 'ok', unmet: [] }
  if (field === 'unknown') return { status: 'unknown', unmet: ['requirements not curated yet — check the Handbook'] }
  return evaluate(field, ctx)
}

export function evaluate(expr: ReqExpr, ctx: EvalContext): EvalResult {
  if ('subject' in expr) {
    return ctx.completed.has(expr.subject) ? ok() : { status: 'fail', unmet: [expr.subject] }
  }
  if ('all' in expr) {
    const parts = expr.all.map((e) => evaluate(e, ctx))
    const status = combineAll(parts.map((p) => p.status))
    return { status, unmet: status === 'ok' ? [] : parts.flatMap((p) => p.unmet) }
  }
  if ('any' in expr) {
    const parts = expr.any.map((e) => evaluate(e, ctx))
    const status = combineAny(parts.map((p) => p.status))
    return { status, unmet: status === 'ok' ? [] : [`one of: ${expr.any.map(describe).join(' / ')}`] }
  }
  if ('points' in expr) return evaluatePoints(expr.points, ctx)
  if ('admission' in expr) {
    if (!ctx.admittedCourse) return { status: 'unknown', unmet: [describe(expr)] }
    return ctx.admittedCourse === expr.admission ? ok() : { status: 'fail', unmet: [describe(expr)] }
  }
  // "Admission into one of the following: B-SCIEXT … B-ARTSEXT" is a course list written out
  // as text: decide it like an admission rule when we know the student's course.
  const courses = admissionCourses(expr.manual)
  if (courses.length && ctx.admittedCourse) {
    return courses.includes(ctx.admittedCourse) ? ok() : { status: 'fail', unmet: [`admission to ${courses.join(' / ')}`] }
  }
  return { status: 'unknown', unmet: [`check manually: ${expr.manual}`] }
}

/** Course codes in a free-text admission condition ("Admission into … B-SCIEXT …"), else none. */
export function admissionCourses(text: string): string[] {
  if (!/^\s*admission (?:in)?to\b/i.test(text)) return []
  return [...new Set(text.match(/\b(?:MC|B|D|GD)-[A-Z]{2,}\b/g) ?? [])]
}

function evaluatePoints(
  req: { min: number; level?: number; area?: string; from?: string[] },
  ctx: EvalContext,
): EvalResult {
  let total = 0
  let unknownCompleted = false
  for (const code of ctx.completed) {
    if (req.from && !req.from.includes(code)) continue
    const s = ctx.subjects[code]
    if (!s) {
      // A completed subject we have no data for might count towards the threshold.
      unknownCompleted = true
      continue
    }
    if (req.level !== undefined && s.level !== req.level) continue
    if (req.area !== undefined && s.area !== req.area) continue
    total += s.points
  }
  if (total >= req.min) return ok()
  const unmet = [`${describe({ points: req })} (have ${total})`]
  return { status: unknownCompleted ? 'unknown' : 'fail', unmet }
}

function combineAll(statuses: Tri[]): Tri {
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('unknown')) return 'unknown'
  return 'ok'
}

function combineAny(statuses: Tri[]): Tri {
  if (statuses.includes('ok')) return 'ok'
  if (statuses.includes('unknown')) return 'unknown'
  return 'fail'
}

function ok(): EvalResult {
  return { status: 'ok', unmet: [] }
}

export function describeField(field: ReqField): string {
  if (field === 'none') return 'None'
  if (field === 'unknown') return 'Not curated yet'
  return describe(field)
}

export function describe(expr: ReqExpr): string {
  if ('subject' in expr) return expr.subject
  if ('all' in expr) return joinParts(expr.all, ' and ')
  if ('any' in expr) return joinParts(expr.any, ' or ')
  if ('points' in expr) {
    const { min, level, area, from } = expr.points
    const where = [level !== undefined ? `level ${level}` : '', area ?? ''].filter(Boolean).join(' ')
    const fromText = from ? ` from ${from.join(', ')}` : ''
    return `${min} points${where ? ` of ${where}` : ''}${fromText}`
  }
  if ('admission' in expr) return `admission to ${expr.admission}`
  return `“${expr.manual}”`
}

function joinParts(parts: ReqExpr[], sep: string): string {
  return parts.map((p) => (('all' in p || 'any' in p) && parts.length > 1 ? `(${describe(p)})` : describe(p))).join(sep)
}

/** Every subject code referenced anywhere in an expression. */
export function referencedSubjects(field: ReqField): string[] {
  if (field === 'none' || field === 'unknown') return []
  const out: string[] = []
  const walk = (e: ReqExpr): void => {
    if ('subject' in e) out.push(e.subject)
    else if ('all' in e) e.all.forEach(walk)
    else if ('any' in e) e.any.forEach(walk)
    else if ('points' in e && e.points.from) out.push(...e.points.from)
  }
  walk(field)
  return [...new Set(out)]
}

// A free-text condition about another course ("… in the MC-ENG Master of Engineering").
const OTHER_COURSE_TEXT = /\b(?:MC|B|D|GD)-[A-Z]{2,}\b|\bMaster of\b/

/**
 * The requirement as a student of `course` has to meet it: routes that need admission to
 * another course are dropped, and anything their own admission already meets counts as met.
 * Only for showing to students; checks evaluate the full expression.
 */
export function simplifyFor(field: ReqField, course: string): ReqField {
  if (field === 'none' || field === 'unknown' || !course) return field
  const MET = 'met' as const
  const walk = (e: ReqExpr): ReqExpr | typeof MET | null => {
    if ('admission' in e) return e.admission === course ? MET : null
    if ('manual' in e) return OTHER_COURSE_TEXT.test(e.manual) && !e.manual.includes(course) ? null : e
    if ('any' in e) {
      const kept = e.any.map(walk)
      if (kept.includes(MET)) return MET
      const open = kept.filter((x): x is ReqExpr => x !== null && x !== MET)
      if (open.length === 0) return null
      return open.length === 1 ? (open[0] as ReqExpr) : { any: open }
    }
    if ('all' in e) {
      const kept = e.all.map(walk)
      if (kept.includes(null)) return null
      const open = kept.filter((x): x is ReqExpr => x !== null && x !== MET)
      if (open.length === 0) return MET
      return open.length === 1 ? (open[0] as ReqExpr) : { all: open }
    }
    return e
  }
  const out = walk(field)
  // Nothing open to this course at all: show the whole thing rather than hide it.
  return out === MET ? 'none' : out === null ? field : out
}

/**
 * One way through a subject's prerequisites, all the way back: every subject the student
 * needs before it, not just the ones it names. Where there's a choice ("MAST20004 or
 * MAST20006") the branch the student already has (in `have`) is taken, then one whose
 * subjects we know, else the first. A subject the student already has isn't followed further
 * back (they got in to it somehow, e.g. a VCE score). Admission, points and free-text
 * conditions aren't subjects and are left out.
 */
export function prerequisiteRoute(
  code: string,
  subjects: Record<string, Subject>,
  course: string,
  have: Set<string> = new Set(),
): string[] {
  const out = new Set<string>()
  const visit = (c: string): void => {
    const s = subjects[c]
    const field = s ? simplifyFor(s.prerequisites, course) : 'unknown'
    if (field === 'none' || field === 'unknown') return
    const pick = (e: ReqExpr): string[] => {
      if ('subject' in e) return [e.subject]
      if ('all' in e) return e.all.flatMap(pick)
      if ('any' in e) {
        const branches = e.any.map(pick).filter((b) => b.length)
        const owned = (b: string[]) => b.filter((x) => have.has(x)).length / b.length
        const known = (b: string[]) => b.filter((x) => subjects[x] !== undefined).length / b.length
        return [...branches].sort((a, b) => owned(b) - owned(a) || known(b) - known(a))[0] ?? []
      }
      return []
    }
    for (const next of pick(field)) {
      if (out.has(next) || next === code) continue
      out.add(next)
      if (!have.has(next)) visit(next)
    }
  }
  visit(code)
  return [...out].sort((a, b) => (subjects[a]?.level ?? 0) - (subjects[b]?.level ?? 0) || a.localeCompare(b))
}
