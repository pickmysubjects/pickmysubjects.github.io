import type { AssessmentKind, Period, ReqExpr, ReqField } from './schema'

/**
 * Parses text that a person copied from a Handbook page they were reading
 * (the "Eligibility and requirements" tab and/or the "Availability" line of
 * the overview) into structured facts. This runs locally on text the user
 * supplies — it never fetches anything.
 */
export interface PasteResult {
  prerequisites: ReqField
  corequisites: ReqField
  nonAllowed: string[] | 'unknown'
  offerings: Period[] | 'unknown'
  /** Semester version of the assessment table; weights add up to 100. */
  assessment: AssessmentTask[] | 'unknown'
  weeklyContactHours?: number
  /** From the page header, when the whole page was pasted. */
  code?: string
  title?: string
  level?: number
  points?: number
  /** Things the parser was unsure about; a human should double-check these. */
  warnings: string[]
}

export interface AssessmentTask {
  kind: AssessmentKind
  weight: number
  group?: boolean
  hurdle?: boolean
}

const CODE = /\b[A-Z]{4}\d{5}\b/g
const SECTION_HEADINGS: [RegExp, Section][] = [
  [/^prerequisites?$/i, 'pre'],
  [/^corequisites?$/i, 'co'],
  [/^non[- ]allowed subjects?$/i, 'non'],
  [/^recommended background knowledge$/i, 'skip'],
  [/^inherent requirements/i, 'skip'],
  [/^availability/i, 'avail'],
  [/^description timing percentage$/i, 'assess'],
  [/^(fees|contact information|further information|assessment|dates (and|&) times|additional details|quotas apply)$/i, 'skip'],
]
type Section = 'pre' | 'co' | 'non' | 'avail' | 'assess' | 'skip'

// Inside the assessment table these headings start another term's version; we keep the first.
const TERM_VERSION = /^(summer term|winter term|semester [12]|january|february|june|july|november|december)$/i

export function parseHandbookPaste(text: string): PasteResult {
  const warnings: string[] = []
  const sections = splitSections(text)

  // Many pages list the requirement per degree; this site plans the Bachelor of Science.
  const pre = sections.pre ? scienceOnly(undergraduateOnly(sections.pre, warnings), warnings) : undefined
  // "Concurrent prerequisites" (or a note that subjects "can also be taken concurrently") may be
  // taken in the same semester: that's what a corequisite means here.
  const split = pre ? splitConcurrent(pre) : undefined
  const coLines = [...(sections.co ?? []).filter((l) => !(split?.concurrent.length && /^none\.?$/i.test(l))), ...(split?.concurrent ?? [])]
  const result: PasteResult = {
    prerequisites: split ? parseRequirement(split.before, 'prerequisites', warnings) : 'unknown',
    corequisites: sections.co || split?.concurrent.length ? parseRequirement(coLines, 'corequisites', warnings) : 'unknown',
    nonAllowed: sections.non ? parseNonAllowed(sections.non) : 'unknown',
    offerings: sections.avail ? parseAvailability(sections.avail.join('\n')) : 'unknown',
    assessment: sections.assess ? parseAssessment(sections.assess, warnings) : 'unknown',
    weeklyContactHours: parseContactHours(text),
    ...parseHeader(text),
    warnings,
  }
  // A page can list the subject itself (e.g. in an old/new code table); it's never its own requirement.
  if (result.code) {
    const self = result.code
    result.prerequisites = withoutSubject(result.prerequisites, self)
    result.corequisites = withoutSubject(result.corequisites, self)
    if (Array.isArray(result.nonAllowed)) result.nonAllowed = result.nonAllowed.filter((c) => c !== self)
  }
  if (!sections.pre && !sections.co && !sections.non && !sections.avail) {
    warnings.push('No Handbook section headings found (e.g. "Prerequisites", "Non-allowed subjects", "Availability").')
  }
  return result
}

function splitSections(text: string): Partial<Record<Section, string[]>> {
  const out: Partial<Record<Section, string[]>> = {}
  let current: Section | null = null
  let assessDone = false // later tables repeat it for other terms
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (current === 'assess' && TERM_VERSION.test(line)) {
      current = 'skip'
      assessDone = true
      continue
    }
    let heading = SECTION_HEADINGS.find(([re]) => re.test(line))
    if (heading?.[1] === 'assess' && assessDone) heading = [heading[0], 'skip']
    if (heading) {
      current = heading[1]
      out[current] ??= []
      // "Availability Semester 1 - On Campus" may share a line with its heading.
      const rest = line.replace(/^availability:?/i, '').trim()
      if (current === 'avail' && rest) out.avail?.push(rest)
      continue
    }
    // The assessment table keeps its tabs: the weight column is the cell after the last tab.
    if (current === 'assess') out.assess?.push(raw.replace(/ +/g, ' ').trim())
    else if (current && current !== 'skip') out[current]?.push(line)
  }
  return out
}

// "Bachelor of Science students", "B Science Students:", "B. Biomedicine Students:" …
const DEGREE_HEADING = /^(?:for )?(?:bachelor of|b\.? ?)\s*(science|sc|biomedicine|biomed|agriculture|arts|commerce|design|music|fine arts)\b[^.]{0,30}students?:?(?:\s*\([^)]*\))?:?$/i

/**
 * "Undergraduate students: … / Postgraduate students: Admission into the Master of …": two
 * separate requirements, one per kind of student. This site plans undergraduate degrees.
 */
function undergraduateOnly(lines: string[], warnings: string[]): string[] {
  const ug = lines.findIndex((l) => /^undergraduate students?:?$/i.test(l.trim()))
  const pg = lines.findIndex((l) => /^postgraduate students?\b/i.test(l.trim()))
  if (ug < 0 && pg < 0) return lines
  warnings.push('Requirements are listed per kind of student; kept the undergraduate one.')
  const start = ug < 0 ? 0 : ug + 1
  const end = pg > start ? pg : lines.length
  return lines.slice(start, end)
}

function scienceOnly(lines: string[], warnings: string[]): string[] {
  const heads = lines.map((l, i) => ({ i, degree: DEGREE_HEADING.exec(l)?.[1]?.toLowerCase() })).filter((h) => h.degree)
  if (heads.length === 0) return lines
  // With more than one (e.g. "pre 2013" and "2013 on"), the current students' one is the last that isn't "pre".
  const science = heads.map((h, k) => ({ ...h, k })).filter((h) => h.degree === 'science' || h.degree === 'sc')
  const current = science.filter((h) => !/\bpre\b/i.test(lines[h.i] ?? ''))
  const at = (current.at(-1) ?? science.at(-1))?.k ?? -1
  if (at < 0) {
    warnings.push('Requirements are listed per degree, with none for the Bachelor of Science; kept them all.')
    return lines
  }
  const start = (heads[at] as { i: number }).i + 1
  const end = heads[at + 1]?.i ?? lines.length
  warnings.push('Requirements are listed per degree; kept the Bachelor of Science one.')
  // Text before the first heading (e.g. an overall "OR") belongs to no degree in particular.
  return lines.slice(start, end)
}

function splitConcurrent(lines: string[]): { before: string[]; concurrent: string[] } {
  const at = lines.findIndex((l) => /^concurrent prerequisites?:?$/i.test(l) || /can (?:also )?be taken concurrently/i.test(l))
  if (at < 0) return { before: lines, concurrent: [] }
  // "… OR / Note: the following can also be taken concurrently / table": one more alternative,
  // not a corequisite everyone needs. Planned as taken before, which is always allowed.
  const prev = lines.slice(0, at).filter((l) => l.trim()).at(-1) ?? ''
  if (/^or$/i.test(prev.trim()) && !/^concurrent prerequisites?:?$/i.test(lines[at] ?? '')) {
    // An unlabelled table stays "All of" (ANAT20006 + PHYS20008 together stand in for one 25-point subject).
    return { before: [...lines.slice(0, at), ...lines.slice(at + 1)], concurrent: [] }
  }
  const rest = lines.slice(at + 1)
  const stop = rest.findIndex((l) => /^(and|or|option \d+:?)$/i.test(l.trim()))
  const concurrent = stop < 0 ? rest : rest.slice(0, stop)
  // An "Option 2" heading starts the next alternative, so it stays with the prerequisites.
  const after = stop < 0 ? [] : rest.slice(/^option/i.test(rest[stop]!.trim()) ? stop : stop + 1)
  // Drop a heading repeated just before the note ("Prerequisites" / a stray "Note:").
  const before = [...lines.slice(0, at), ...after].filter((l) => !/^prerequisites?:?$/i.test(l))
  return { before: before.length ? before : ['None'], concurrent }
}

function combine(kind: 'all' | 'any', fields: ReqField[]): ReqField {
  if (fields.some((f) => f === 'unknown')) return 'unknown'
  const exprs = fields.filter((f): f is ReqExpr => f !== 'none')
  if (exprs.length === 0) return 'none'
  // An option with no requirement at all makes the whole "any" free; a "none" part adds nothing to "all".
  if (kind === 'any' && exprs.length < fields.length) return 'none'
  return exprs.length === 1 ? (exprs[0] as ReqExpr) : ({ [kind]: exprs } as ReqExpr)
}

function withoutSubject(field: ReqField, code: string): ReqField {
  if (field === 'none' || field === 'unknown') return field
  const prune = (e: ReqExpr): ReqExpr | null => {
    if ('subject' in e) return e.subject === code ? null : e
    if ('all' in e || 'any' in e) {
      const key = 'all' in e ? 'all' : 'any'
      const kept = (e as Record<string, ReqExpr[]>)[key]!.map(prune).filter(isExpr)
      if (kept.length === 0) return null
      return kept.length === 1 ? (kept[0] as ReqExpr) : ({ [key]: kept } as ReqExpr)
    }
    if ('points' in e && e.points.from) return { points: { ...e.points, from: e.points.from.filter((c) => c !== code) } }
    return e
  }
  return prune(field) ?? 'none'
}

function parseRequirement(lines: string[], label: string, warnings: string[]): ReqField {
  if (lines.length === 0 || (lines.length === 1 && /^none\.?$/i.test(lines[0] ?? ''))) return 'none'

  // "Option 1 … Option 2 …": meeting any one option is enough.
  const optionAt = lines.map((l, i) => (/^option \d+:?$/i.test(l) ? i : -1)).filter((i) => i >= 0)
  if (optionAt.length >= 2) {
    // Only an OR between two options goes; ORs inside an option are its own alternatives.
    const trimOr = (ls: string[]) => {
      let a = 0
      let b = ls.length
      while (a < b && /^or$/i.test(ls[a] ?? '')) a++
      while (b > a && /^or$/i.test(ls[b - 1] ?? '')) b--
      return ls.slice(a, b)
    }
    const options = optionAt.map((at, k) => trimOr(lines.slice(at + 1, optionAt[k + 1] ?? lines.length)))
    return combine('any', options.map((o) => parseRequirement(o, label, warnings)))
  }
  // "Students are required to meet both Physics and Mathematics prerequisites below",
  // then "Physics:" and "Mathematics:" parts: every part must be met.
  const partAt = lines.map((l, i) => (/^[A-Z][a-z]+(?: [a-z]+)?:$/.test(l) ? i : -1)).filter((i) => i >= 0)
  if (partAt.length >= 2 && lines.slice(0, partAt[0]).every((l) => /required to meet both|^and$/i.test(l))) {
    const parts = partAt.map((at, k) => lines.slice(at + 1, partAt[k + 1] ?? lines.length))
    return combine('all', parts.map((p) => parseRequirement(p, label, warnings)))
  }

  // Blocks are separated by standalone OR / AND lines.
  const groups: string[][][] = [[[]]] // OR-groups of AND-blocks of lines
  for (const line of lines) {
    if (/^or$/i.test(line)) groups.push([[]])
    else if (/^and$/i.test(line)) groups[groups.length - 1]?.push([])
    else groups[groups.length - 1]?.at(-1)?.push(line)
  }

  const alternatives = groups
    .map((andBlocks) => andBlocks.map((b) => parseBlock(b, label, warnings)).filter(isExpr))
    .filter((blocks) => blocks.length > 0)
    .map((blocks) => (blocks.length === 1 ? (blocks[0] as ReqExpr) : { all: blocks }))

  if (alternatives.length === 0) {
    warnings.push(`Couldn't read any ${label}; left as unknown.`)
    return 'unknown'
  }
  return alternatives.length === 1 ? (alternatives[0] as ReqExpr) : { any: alternatives }
}

function parseBlock(lines: string[], label: string, warnings: string[]): ReqExpr | null {
  // "NOTE: … may be taken concurrently with BMEN20003 …" names subjects but isn't a requirement.
  lines = lines.filter((l) => !/^note\b/i.test(l.trim()))
  const codes = unique(lines.flatMap((l) => l.match(CODE) ?? []))
  const quantifier = lines.map(readQuantifier).find((q) => q !== null) ?? null

  if (codes.length > 0) {
    const subjects: ReqExpr[] = codes.map((c) => ({ subject: c }))
    let expr: ReqExpr
    if (quantifier?.kind === 'points') expr = { points: { min: quantifier.min, from: codes } }
    else if (quantifier?.kind === 'one') expr = subjects.length === 1 ? (subjects[0] as ReqExpr) : { any: subjects }
    else {
      if (!quantifier && codes.length > 1) {
        warnings.push(`A ${label} table had no "All of"/"One of" label; assumed "All of" for ${codes.join(', ')}.`)
      }
      expr = subjects.length === 1 ? (subjects[0] as ReqExpr) : { all: subjects }
    }
    // An "Admission into …" sentence alongside a table is an extra condition.
    const admission = lines.map(readAdmission).find((a) => a !== null)
    return admission ? { all: [expr, admission] } : expr
  }

  const sentence = lines.filter((l) => !isTableNoise(l) && readQuantifier(l) === null).join(' ').trim()
  if (!sentence) return null
  const admission = readAdmission(sentence)
  if (admission) return admission
  const points = /^(\d+(?:\.\d+)?) (?:credit )?points? (?:of|at) level (\d)/i.exec(sentence)
  if (points) return { points: { min: Number(points[1]), level: Number(points[2]) } }
  warnings.push(`Free-text ${label} kept for manual checking: “${sentence}”.`)
  return { manual: sentence }
}

type Quantifier = { kind: 'all' } | { kind: 'one' } | { kind: 'points'; min: number }

function readQuantifier(line: string): Quantifier | null {
  if (/^(?:all of|both(?: completed)?):?$/i.test(line)) return { kind: 'all' }
  if (/^(?:a )?(?:minimum of )?(one|1) of(?: the following)?:?$/i.test(line)) return { kind: 'one' }
  if (/^at least one of(?: the following| these(?: \w+)? subjects)?:?$/i.test(line)) return { kind: 'one' }
  // "A minimum of two of" a table of 12.5-point subjects: that many subjects' worth of points.
  // Also "A minimum of two level three Geoscience subjects (can be concurrent …)" over a table.
  const count =
    /^(?:a )?(?:minimum of )?(two|three|four|[2-9]) of(?: the following)?:?$/i.exec(line) ??
    /\bany (two|three|four|[2-9]) of(?: the following)?:?$/i.exec(line) ??
    /^(?:a )?(?:minimum of |at least )(two|three|four|[2-9]) (?:level (?:one|two|three|[1-3]) )?[a-z ]*subjects?\b/i.exec(line)
  if (count) {
    const n = { two: 2, three: 3, four: 4 }[(count[1] as string).toLowerCase()] ?? Number(count[1])
    return { kind: 'points', min: n * 12.5 }
  }
  // "25 points from", "A minimum of 25 credit points from", "Completion of a minimum of 37.5 credit points of".
  const pts = /^(?:completion of )?(?:a )?(?:minimum of |at least )?(\d+(?:\.\d+)?) (?:credit )?points? (?:of|from)(?: the following)?:?$/i.exec(line)
  if (pts) return { kind: 'points', min: Number(pts[1]) }
  return null
}

function readAdmission(line: string): ReqExpr | null {
  const m = /admission (?:in)?to (?:the )?([A-Z]{1,4}-[A-Z0-9]+)/i.exec(line)
  return m ? { admission: (m[1] as string).toUpperCase(), note: line } : null
}

function isTableNoise(line: string): boolean {
  return (
    /^code\b.*\bname\b/i.test(line) ||
    /^(summer|winter|semester \d|year long|january|february|july|august|september|october|november|december)\b/i.test(line) ||
    /^\d+(\.\d+)?$/.test(line)
  )
}

function parseNonAllowed(lines: string[]): string[] {
  if (lines.length === 1 && /^none\.?$/i.test(lines[0] ?? '')) return []
  return unique(lines.flatMap((l) => l.match(CODE) ?? []))
}

/** Reads teaching periods from availability text such as "Semester 1 - On Campus". */
export function parseAvailability(text: string): Period[] | 'unknown' {
  const found = new Set<Period>()
  if (/summer/i.test(text)) found.add('summer')
  if (/semester 1\b/i.test(text)) found.add('semester-1')
  if (/winter/i.test(text)) found.add('winter')
  if (/semester 2\b/i.test(text)) found.add('semester-2')
  if (/year long/i.test(text)) {
    found.add('semester-1')
    found.add('semester-2')
  }
  return found.size > 0 ? (['summer', 'semester-1', 'winter', 'semester-2'] as const).filter((p) => found.has(p)) : 'unknown'
}

// First match wins, so the more specific kinds come first.
const KIND_WORDS: [RegExp, AssessmentKind][] = [
  [/presentation|\boral\b|\bseminar\b/i, 'presentation'],
  [/participation|attendance|engagement|tutorial activit|in-class activit|design activit/i, 'participation'],
  [/quiz|\bMCQs?\b|questionnaire|online (test|assessment)/i, 'quiz'],
  [/\btests?\b|\bMSTs?\b|mid[- ]?semester\b.{0,20}\b(test|exam|assessment)|closed book timed|in-class (test|assessment)/i, 'test'],
  [/\bexam(ination)?s?\b(?! period)/i, 'exam'],
  [/report|essay|literature review/i, 'report'],
  [/project|\bvideo\b/i, 'project'],
  [/assignment|problem set|exercise|homework|practice set|written (work|task|assessment|submission)/i, 'assignment'],
]

/** The task's own name usually opens the description ("Group project - …"), so try that first. */
function classify(description: string): AssessmentKind | undefined {
  const opening = description.split(/[.:(–-]\s/)[0]?.slice(0, 60) ?? ''
  // In the opening, the word that comes first names the task; elsewhere, list order decides.
  const first = KIND_WORDS.map(([re, kind]) => ({ kind, at: opening.search(re) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at)[0]
  return first?.kind ?? KIND_WORDS.find(([re]) => re.test(description))?.[1]
}

/**
 * Rows of the "Description / Timing / Percentage" table: description lines,
 * then a line ending in the weight. Only the first (semester) version is read.
 */
function parseAssessment(lines: string[], warnings: string[]): AssessmentTask[] | 'unknown' {
  const tasks: AssessmentTask[] = []
  let text: string[] = []
  // With tabs, only the last cell counts as the weight, so "Test 1 … 10%" inside a description doesn't.
  const tabbed = lines.some((l) => /\t\s*\d+(?:\.\d+)?%\s*$/.test(l))
  const WEIGHT = tabbed ? /\t\s*(\d+(?:\.\d+)?)%\s*$/ : /(\d+(?:\.\d+)?)%$/
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim()
    // A row with no weight (e.g. an attendance hurdle marked N/A) ends its own description.
    if (/N\/A\s*$/.test(raw)) {
      text = []
      continue
    }
    // A weight alone on its line (the row had no timing cell) belongs to the description above it.
    const weight = raw.match(WEIGHT) ?? raw.match(/^\s*(\d+(?:\.\d+)?)%\s*$/)
    if (!weight) {
      text.push(line)
      continue
    }
    const description = text.filter((l) => !/^hurdle requirement/i.test(l)).join(' ')
    const all = [...text, line].join(' ')
    const kind = classify(description)
    if (!kind) warnings.push(`Couldn't tell what kind of task "${description.slice(0, 60)}" is; recorded as an assignment.`)
    const task: AssessmentTask = { kind: kind ?? 'assignment', weight: Number(weight[1]) }
    if (/\bgroups?\b(?! discussions?)|\bteams?\b/i.test(description)) task.group = true
    if (/hurdle requirement/i.test(all)) task.hurdle = true
    tasks.push(task)
    text = []
  }
  const total = tasks.reduce((sum, t) => sum + t.weight, 0)
  if (tasks.length === 0 || Math.abs(total - 100) > 0.01) {
    if (tasks.length) warnings.push(`Assessment weights add up to ${total}%, not 100%; left out.`)
    return 'unknown'
  }
  return tasks
}

/** "Machine Learning (COMP30027)" and "Undergraduate level 3Points: 12.5" from the page header. */
export function parseHeader(text: string): Pick<PasteResult, 'code' | 'title' | 'level' | 'points'> {
  const out: Pick<PasteResult, 'code' | 'title' | 'level' | 'points'> = {}
  const name = text.match(/^\s*(.+?)\s*\(([A-Z]{4}\d{5})\)\s*$/m)
  if (name) {
    out.title = name[1]
    out.code = name[2]
  }
  const level = text.match(/level\s*(\d)\s*Points:\s*(\d+(?:\.\d+)?)/i)
  if (level) {
    out.level = Number(level[1])
    out.points = Number(level[2])
  }
  return out
}

/**
 * Weekly class hours from the "Contact hours" line, e.g. "48 hours, comprising…",
 * "3 x one hour lectures per week, 1 x one hour practice class per week" or
 * "36 one-hour lectures (three per week); 12 one-hour practice classes".
 */
export function parseContactHours(text: string): number | undefined {
  const line = text.split(/\r?\n/).find((l) => /^\s*contact hours\b/i.test(l))
  if (!line) return undefined
  const half = (x: number) => Math.round(x * 2) / 2
  const body = line.replace(/^\s*contact hours\s*/i, '').replace(/×/g, 'x')
  // "48 hours, comprising …" / "48 hours: 24 x one-hour lectures …" give the semester total first.
  const lead = body.match(/^(\d+(?:\.\d+)?)\s*(?:hours?)?\s*(?:in total|total)?\s*(?:[,:(;.]|$|comprising|consisting)/i)
  // A bare 170 is the total time commitment pasted in the wrong row, not time in class.
  if (lead && Number(lead[1]) < 120) return half(Number(lead[1]) / 12)
  // "Total of 44 hours - …", "Total contact is 62 hours", "(36 hours total)", "36 in total".
  const stated =
    body.match(/\btotal(?: contact(?: hours)?)?(?: is| of|\s*[-:=])?\s*(\d+(?:\.\d+)?)\s*(?:contact )?hours?/i) ??
    body.match(/\btotal contact hours\s*[-:=]\s*(\d+(?:\.\d+)?)/i) ??
    body.match(/(\d+(?:\.\d+)?)\s*(?:hours?\s*)?(?:in )?total\b/i)
  if (stated) return half(Number(stated[1]) / 12)
  // "36 hours of lectures …, 15 hours of practicals …, 12 hours of workshops": add the parts up.
  // Independent / online study isn't time in class.
  // Otherwise read it clause by clause: "2 x one hour lectures per week" is weekly (12 weeks,
  // or "for N weeks"); "5 x 3-hour practicals" or "27 hours of practical work" is a semester total.
  // Independent / online / own-time study isn't time in class.
  const NUM = String.raw`(\d+(?:\.\d+)?|a|one|two|three|four|five|six|eight|nine|ten|eleven|twelve)`
  const num = (w: string) => WORDS[w.toLowerCase()] ?? Number(w)
  const WEEKLY = /per wee|each week|weekly|\/week/i
  const hoursIn = (text: string) => {
    const sized = new RegExp(String.raw`${NUM}\s*(?:x\s*|\s+)${NUM}\s*[- ]?(?:hours?|hrs?|h)\b`, 'i').exec(text)
    const plain = new RegExp(String.raw`${NUM}\s*(?:hours?|hrs?)\b`, 'i').exec(text)
    return sized ? num(sized[1]!) * num(sized[2]!) : plain ? num(plain[1]!) : 0
  }
  let total = 0
  for (const sentence of body.split(/;(?![^(]*\))|\.\s|(?<=\))\s+(?=\d)/)) {
    const clauses = sentence.split(/,(?![^(]*\))|\band\b|&/i)
    // "Two x 1 hour lectures and one x 1 hour tutorial per week": the closing "per week" covers both.
    const shared = WEEKLY.test((clauses.at(-1) ?? '').replace(/\([^)]*\)/g, ''))
    for (const clause of clauses) {
      if (/independent|self[- ]paced|online|own time|travel/i.test(clause)) continue
      // "24 x one-hour lectures (2 per week)": the count outside the brackets is the total;
      // "24 lectures (2 x 1hr per week)": only the brackets give hours.
      const outside = clause.replace(/\([^)]*\)/g, '')
      const own = hoursIn(outside)
      const text = own ? outside : clause
      const h = own || hoursIn(clause)
      if (!h) continue
      const weeks = new RegExp(String.raw`for\s+${NUM}\s+weeks`, 'i').exec(text)
      const weekly = WEEKLY.test(text) || (shared && !/total|semester|weeks?\s+\d/i.test(text))
      total += weeks ? h * num(weeks[1]!) : weekly ? h * 12 : h
    }
  }
  if (total) return half(total / 12)
  const stray = line.match(/(\d+(?:\.\d+)?)\s*hours/i)
  return stray ? half(Number(stray[1]) / 12) : undefined
}

const WORDS: Record<string, number> = {
  a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}

function isExpr(e: ReqExpr | null): e is ReqExpr {
  return e !== null
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}
