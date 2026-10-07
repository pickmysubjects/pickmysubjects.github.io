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
  return { status: 'unknown', unmet: [`check manually: ${expr.manual}`] }
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
