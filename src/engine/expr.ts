import type { AdvisoryKind, ReqExpr, ReqField, Subject } from './schema'

/** Three-valued result: uncurated or free-text requirements yield `unknown`, never `ok`. */
export type Tri = 'ok' | 'fail' | 'unknown'

export interface EvalContext {
  /** Subjects passed before the point being evaluated. */
  completed: ReadonlySet<string>
  subjects: Readonly<Record<string, Subject>>
  /** Course the student is admitted to, e.g. "B-SCI". */
  admittedCourse?: string
  /**
   * Titles of the student's major(s)/specialisation(s) in that course ("Chinese Studies").
   * Undefined when none is chosen: conditions about majors then stay unknown.
   */
  majors?: readonly string[]
  /**
   * Titles of the student's minor(s) in that course ("History"). Undefined when we don't know:
   * conditions a minor could meet then stay unknown. Empty: the student has no minor.
   */
  minors?: readonly string[]
  /**
   * Subjects done by the end of the term being evaluated (`completed` plus that term's own):
   * what a requirement that may be taken concurrently is checked against. Defaults to `completed`.
   */
  sameTerm?: ReadonlySet<string>
  /**
   * The student's marks (0–100) by subject code, for average and WAM conditions. Undefined when
   * they aren't known: those conditions then stay unknown.
   */
  marks?: Readonly<Record<string, number>>
  /**
   * The student's WAM over their whole marked record, fails included (see computeWam), for WAM
   * conditions. Undefined: worked out from `marks` over the completed subjects instead.
   */
  wam?: number | null
}

export interface EvalResult {
  status: Tri
  /** Human-readable descriptions of what is not (yet) satisfied. */
  unmet: string[]
  /**
   * When the status is unknown only because of conditions the student has to vouch for (a
   * placement test, the coordinator's permission, a VCE score), their kinds. Planning treats
   * these like any unknown; the UI can say exactly what to do.
   */
  advisory?: AdvisoryKind[]
}

export function evaluateField(field: ReqField, ctx: EvalContext): EvalResult {
  if (field === 'none') return { status: 'ok', unmet: [] }
  if (field === 'unknown') return { status: 'unknown', unmet: ['requirements not curated yet — check the Handbook'] }
  return evaluate(field, ctx)
}

export function evaluate(expr: ReqExpr, ctx: EvalContext): EvalResult {
  if ('subject' in expr) {
    const done = expr.concurrent ? (ctx.sameTerm ?? ctx.completed) : ctx.completed
    return done.has(expr.subject) ? ok() : { status: 'fail', unmet: [expr.subject] }
  }
  if ('all' in expr) {
    const parts = expr.all.map((e) => evaluate(e, ctx))
    const status = combineAll(parts.map((p) => p.status))
    return withAdvisory({ status, unmet: status === 'ok' ? [] : parts.flatMap((p) => p.unmet) }, parts)
  }
  if ('any' in expr) {
    const parts = expr.any.map((e) => evaluate(e, ctx))
    const status = combineAny(parts.map((p) => p.status))
    return withAdvisory({ status, unmet: status === 'ok' ? [] : [`one of: ${expr.any.map(describe).join(' / ')}`] }, parts)
  }
  if ('points' in expr) return evaluatePoints(expr.points, expr.points.concurrent ? { ...ctx, completed: ctx.sameTerm ?? ctx.completed } : ctx)
  if ('admission' in expr) {
    if (!ctx.admittedCourse) return { status: 'unknown', unmet: [describe(expr)] }
    return ctx.admittedCourse === expr.admission ? ok() : { status: 'fail', unmet: [describe(expr)] }
  }
  if ('average' in expr) return evaluateAverage(expr.average, ctx)
  if ('wam' in expr) return evaluateWam(expr.wam.min, ctx)
  if ('placement' in expr) return { status: 'unknown', unmet: [describe(expr)], advisory: ['placement'] }
  if ('permission' in expr) return { status: 'unknown', unmet: [describe(expr)], advisory: ['permission'] }
  if ('school' in expr) return { status: 'unknown', unmet: [describe(expr)], advisory: ['school'] }
  const byMajor = majorCondition(expr.manual, ctx)
  if (byMajor) return byMajor
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
  // "… selection of the Biomedical Engineering Systems major in the B-SCI": being in the course
  // isn't enough, so it isn't a plain course list (the student's major decides; left unknown).
  if (/\bmajor\b|\bspeciali[sz]ation\b|\bselection of\b/i.test(text)) return []
  return [...new Set(text.match(/\b(?:MC|B|D|GD)-[A-Z]{2,}\b/g) ?? [])]
}

const COURSE_CODE = String.raw`(?:MC|B|D|GD)-[A-Z]{2,}`
// "Chinese Studies major in the B-ARTS", "Chinese Studies minor minor in the B-ARTS",
// "French Studies specialisation (formal) in the GD-ARTS".
const LISTED_COMPONENT = new RegExp(
  String.raw`([A-Z][A-Za-z'’&\- ]*?) (major|minor(?: minor)?|specialisation(?: \(formal\))?) in the (${COURSE_CODE})\b`,
  'g',
)
// "… only available to students in the Italian Studies Major within the Bachelor of Arts".
const WITHIN_MAJOR = /\bstudents in the ([A-Z][A-Za-z'’&\- ]*?) Major within the ((?:Bachelor|Master|Diploma|Graduate Diploma) (?:of|in) [A-Z][a-z]+)/g

/** A component named in a free-text condition: its title, kind and the course it belongs to. */
export interface NamedComponent {
  title: string
  kind: 'major' | 'minor' | 'specialisation'
  course: string
}

/**
 * The majors, minors and specialisations a free-text condition names, each with its course
 * ("Admission into or selection of one of the following: Chinese Studies major in the B-ARTS
 * Bachelor of Arts, …"). A course written out by name ("Major within the Bachelor of Arts") is
 * only resolved when the same text pairs that name with its code.
 */
export function namedComponents(text: string): NamedComponent[] {
  const out: NamedComponent[] = []
  // Course names the text pairs with a code ("B-ARTS Bachelor of Arts"), to strip from titles
  // that follow them and to resolve the written-out phrasing.
  const names = new Map<string, string>()
  for (const m of text.matchAll(new RegExp(String.raw`(${COURSE_CODE}) ((?:Bachelor|Master|Diploma|Graduate Diploma|Doctor) (?:of|in) [A-Z][a-z]+)`, 'g'))) {
    names.set(m[2] as string, m[1] as string)
  }
  const clean = (raw: string): string => {
    let t = raw.split(/[:,]/).pop()!.trim()
    for (const name of names.keys()) if (t.startsWith(`${name} `)) t = t.slice(name.length + 1)
    return t.replace(/^(?:and|or|the) /i, '').trim()
  }
  for (const m of text.matchAll(LISTED_COMPONENT)) {
    const kind = (m[2] as string).split(' ')[0] as NamedComponent['kind']
    out.push({ title: clean(m[1] as string), kind, course: m[3] as string })
  }
  for (const m of text.matchAll(WITHIN_MAJOR)) {
    const course = names.get(m[2] as string)
    if (course) out.push({ title: clean(m[1] as string), kind: 'major', course })
  }
  const seen = new Set<string>()
  return out.filter((c) => c.title && !seen.has(`${c.kind}:${c.course}:${c.title.toLowerCase()}`) && seen.add(`${c.kind}:${c.course}:${c.title.toLowerCase()}`))
}

const titleKey = (t: string) => t.toLowerCase().replace(/\s+(?:major|minor)$/, '').trim()

/**
 * A condition limited to students in given majors or minors ("only available to students in the
 * Chinese Studies Major", "History minor in the B-ARTS"), decided when we know the student's
 * course and the components it names. Null when the text names no major or minor of the
 * student's course, when a specialisation of it (which we don't track this way) could let them
 * in instead, or when we don't know the student's majors/minors.
 */
function majorCondition(text: string, ctx: EvalContext): EvalResult | null {
  if (!ctx.admittedCourse) return null
  const mine = namedComponents(text).filter((c) => c.course === ctx.admittedCourse)
  const majors = mine.filter((c) => c.kind === 'major')
  const minors = mine.filter((c) => c.kind === 'minor')
  if (!majors.length && !minors.length) return null
  // A title can carry the tail of a course name before it ("… Master of Biomedical Engineering
  // Biomedical Engineering Systems"), so a student's component matches as a whole-word ending.
  const meets = (named: NamedComponent[], titles: readonly string[] | undefined) => {
    if (!titles) return false
    const have = titles.map(titleKey)
    return named.some((c) => {
      const t = titleKey(c.title)
      return have.some((h) => t === h || t.endsWith(` ${h}`))
    })
  }
  if (meets(majors, ctx.majors) || meets(minors, ctx.minors)) return ok()
  if (mine.some((c) => c.kind === 'specialisation')) return null
  if ((majors.length && !ctx.majors) || (minors.length && !ctx.minors)) return null
  const places = [...majors.map((c) => `${c.title} major`), ...minors.map((c) => `${c.title} minor`)]
  return { status: 'fail', unmet: [`a place in the ${places.join(' / ')}`] }
}

function evaluatePoints(
  req: { min: number; level?: number; area?: string; levels?: number[]; areas?: string[]; from?: string[] },
  ctx: EvalContext,
): EvalResult {
  const levels = req.levels ?? (req.level !== undefined ? [req.level] : undefined)
  const areas = req.areas ?? (req.area !== undefined ? [req.area] : undefined)
  let total = 0
  let unknownCompleted = false
  for (const code of ctx.completed) {
    if (req.from && !req.from.includes(code)) continue
    const s = ctx.subjects[code]
    if (!s) {
      // No data for it: the code still gives its area and level (MAST20018: MAST, level 2), so
      // only one that could fit makes the answer "can't tell".
      if ((!areas || areas.includes(code.slice(0, 4))) && (!levels || levels.includes(Number(code[4])))) unknownCompleted = true
      continue
    }
    if (levels && !levels.includes(s.level)) continue
    if (areas && !areas.includes(s.area)) continue
    total += s.points
  }
  if (total >= req.min) return ok()
  const unmet = [`${describe({ points: req })} (have ${total})`]
  return { status: unknownCompleted ? 'unknown' : 'fail', unmet }
}

/**
 * An unknown that only advisory conditions leave open stays advisory: every unknown part has to
 * be advisory (a free-text part makes the whole thing a plain unknown).
 */
function withAdvisory(result: EvalResult, parts: EvalResult[]): EvalResult {
  if (result.status !== 'unknown') return result
  const unknown = parts.filter((p) => p.status === 'unknown')
  if (!unknown.length || unknown.some((p) => !p.advisory)) return result
  return { ...result, advisory: [...new Set(unknown.flatMap((p) => p.advisory ?? []))] }
}

/** Completed subjects matching a levels / areas / codes filter, and whether any of them is one we know nothing about. */
function matching(req: { levels?: number[]; areas?: string[]; from?: string[] }, ctx: EvalContext): { codes: string[]; unsure: boolean } {
  const codes: string[] = []
  let unsure = false
  for (const code of ctx.completed) {
    if (req.from && !req.from.includes(code)) continue
    const s = ctx.subjects[code]
    const level = s?.level ?? Number(code[4])
    const area = s?.area ?? code.slice(0, 4)
    if (req.levels && !req.levels.includes(level)) continue
    if (req.areas && !req.areas.includes(area)) continue
    if (!s) unsure = true
    codes.push(code)
  }
  return { codes, unsure }
}

/** Points-weighted mean of the marks for these subjects, or null when any of them has none (pass/fail ones are left out). */
function meanMark(codes: string[], ctx: EvalContext): number | null {
  if (!ctx.marks) return null
  let weighted = 0
  let points = 0
  for (const code of codes) {
    const s = ctx.subjects[code]
    if (s?.passFail) continue
    const mark = ctx.marks[code]
    if (mark === undefined) return null
    const pts = s?.points ?? 12.5
    weighted += mark * pts
    points += pts
  }
  return points ? weighted / points : null
}

function evaluateAverage(req: { min: number; levels?: number[]; areas?: string[]; from?: string[] }, ctx: EvalContext): EvalResult {
  const unmet = [describe({ average: req })]
  // The marked record, fails included: a subject failed and never passed still counts towards
  // the average, as it does towards the WAM.
  const record = ctx.marks ? new Set([...ctx.completed, ...Object.keys(ctx.marks)]) : ctx.completed
  const { codes } = matching(req, { ...ctx, completed: record })
  // Nothing done that it could be the average of: it can't be met yet.
  if (!codes.length) return { status: 'fail', unmet }
  const mean = meanMark(codes, ctx)
  if (mean === null) return { status: 'unknown', unmet }
  return mean >= req.min ? ok() : { status: 'fail', unmet: [`${unmet[0]} (have ${below(mean)})`] }
}

/** A short average to one decimal, rounded down: 74.95 short of 75 reads 74.9, never "have 75". */
function below(mean: number): number {
  return Math.floor(mean * 10) / 10
}

function evaluateWam(min: number, ctx: EvalContext): EvalResult {
  const unmet = [describe({ wam: { min } })]
  const mean = ctx.wam !== undefined ? ctx.wam : ctx.completed.size ? meanMark([...ctx.completed], ctx) : null
  if (mean === null) return { status: 'unknown', unmet }
  return mean >= min ? ok() : { status: 'fail', unmet: [`${unmet[0]} (have ${below(mean)})`] }
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
  if ('subject' in expr) return expr.concurrent ? `${expr.subject} (may be taken at the same time)` : expr.subject
  if ('all' in expr) return joinParts(expr.all, ' and ')
  if ('any' in expr) return joinParts(expr.any, ' or ')
  if ('points' in expr) {
    const { min, level, area, levels, areas, from } = expr.points
    const lv = levels ?? (level !== undefined ? [level] : [])
    const where = [lv.length ? `level ${lv.join(' or ')}` : '', (areas ?? (area ? [area] : [])).join('/')].filter(Boolean).join(' ')
    const fromText = from ? ` from ${from.join(', ')}` : ''
    return `${min} points${where ? ` of ${where}` : ''}${fromText}${expr.points.concurrent ? ' (may be taken at the same time)' : ''}`
  }
  if ('admission' in expr) return `admission to ${expr.admission}`
  if ('average' in expr) {
    const { min, levels, areas, from } = expr.average
    const where = [levels?.length ? `level ${levels.join(' or ')}` : '', (areas ?? []).join('/'), from ? from.join(', ') : ''].filter(Boolean).join(' ')
    return where ? `an average of ${min} or more in ${where} subjects` : `an average mark of ${min} or more`
  }
  if ('wam' in expr) return `a WAM of ${expr.wam.min} or more`
  if ('placement' in expr) return expr.placement === 'programming' ? 'a programming competency test' : `a ${expr.placement === 'language' ? 'language' : expr.placement} placement test`
  if ('permission' in expr) return expr.permission === 'coordinator' ? "the subject coordinator's permission" : 'a place through an application or selection'
  if ('school' in expr) return `VCE ${expr.school.subject}${expr.school.minScore ? ` (study score ${expr.school.minScore}+)` : ''}`
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
    else if ('average' in e && e.average.from) out.push(...e.average.from)
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
    // A graduate subject (COMP90038) is no way in for a bachelor's student.
    if ('subject' in e && course.startsWith('B-') && /^[A-Z]{4}9/.test(e.subject)) return null
    // A course code as a whole word: "B-SCI" isn't in "B-SCIEXT".
    if ('manual' in e) return OTHER_COURSE_TEXT.test(e.manual) && !new RegExp(`\\b${course}\\b`).test(e.manual) ? null : e
    if ('any' in e) {
      const kept = e.any.map(walk)
      if (kept.includes(MET)) return MET
      // "(A or B) or a test" is three ways in, said and counted as one list.
      const open = kept.filter((x): x is ReqExpr => x !== null && x !== MET).flatMap((x) => ('any' in x ? x.any : [x]))
      if (open.length === 0) return null
      return open.length === 1 ? (open[0] as ReqExpr) : { any: open }
    }
    if ('all' in e) {
      const kept = e.all.map(walk)
      if (kept.includes(null)) return null
      const open = kept.filter((x): x is ReqExpr => x !== null && x !== MET).flatMap((x) => ('all' in x ? x.all : [x]))
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

/**
 * Subjects that stand in for each other: the plain subject options of every "one of" in a
 * requirement (COMP20003 or COMP20007 before COMP30023).
 */
export function alternativeGroups(field: ReqField): string[][] {
  if (field === 'none' || field === 'unknown') return []
  const out: string[][] = []
  const walk = (e: ReqExpr): void => {
    if ('any' in e) {
      const plain = e.any.filter((x): x is { subject: string } => 'subject' in x).map((x) => x.subject)
      if (plain.length >= 2) out.push(plain)
      e.any.forEach(walk)
    } else if ('all' in e) e.all.forEach(walk)
  }
  walk(field)
  return out
}
