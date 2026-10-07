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

  const result: PasteResult = {
    prerequisites: sections.pre ? parseRequirement(sections.pre, 'prerequisites', warnings) : 'unknown',
    corequisites: sections.co ? parseRequirement(sections.co, 'corequisites', warnings) : 'unknown',
    nonAllowed: sections.non ? parseNonAllowed(sections.non) : 'unknown',
    offerings: sections.avail ? parseAvailability(sections.avail.join('\n')) : 'unknown',
    assessment: sections.assess ? parseAssessment(sections.assess, warnings) : 'unknown',
    weeklyContactHours: parseContactHours(text),
    ...parseHeader(text),
    warnings,
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

function parseRequirement(lines: string[], label: string, warnings: string[]): ReqField {
  if (lines.length === 0 || (lines.length === 1 && /^none\.?$/i.test(lines[0] ?? ''))) return 'none'

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
  if (/^all of:?$/i.test(line)) return { kind: 'all' }
  if (/^(one|1) of:?$/i.test(line)) return { kind: 'one' }
  const pts = /^(\d+(?:\.\d+)?) (?:credit )?points? (?:of|from):?$/i.exec(line)
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
  [/presentation|\boral\b/i, 'presentation'],
  [/participation|attendance|engagement|tutorial activit|in-class activit|design activit/i, 'participation'],
  [/quiz|online (test|assessment)/i, 'quiz'],
  [/\btests?\b|mid[- ]?semester\b.{0,20}\b(test|exam|assessment)|closed book timed|in-class (test|assessment)/i, 'test'],
  [/\bexam(ination)?\b(?! period)/i, 'exam'],
  [/report|essay|literature review/i, 'report'],
  [/project/i, 'project'],
  [/assignment|problem set|exercise|homework|practice set|written work/i, 'assignment'],
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
    const weight = raw.match(WEIGHT)
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
  const HOURS: Record<string, number> = { one: 1, two: 2, three: 3, '1': 1, '1.5': 1.5, '2': 2, '3': 3 }
  const half = (x: number) => Math.round(x * 2) / 2
  const body = line.replace(/^\s*contact hours\s*/i, '')
  // "48 hours, comprising …" / "48 hours: 24 x one-hour lectures …" give the semester total first.
  const lead = body.match(/^(\d+(?:\.\d+)?)\s*hours?\s*(?:[,:(;]|$|comprising)/i)
  if (lead) return half(Number(lead[1]) / 12)
  // "36 hours of lectures …, 15 hours of practicals …, 12 hours of workshops": add the parts up.
  // Independent / online study isn't time in class.
  const parts = [...body.matchAll(/(\d+(?:\.\d+)?)\s*hours? of\b(?!\s+(independent|self|online))/gi)]
  if (parts.length) return half(parts.reduce((sum, m) => sum + Number(m[1]), 0) / 12)
  const perWeek = [...line.matchAll(/(\d+)\s*x\s*(one|two|three|1\.5|1|2|3)[- ]hours?/gi)]
  if (perWeek.length) return half(perWeek.reduce((sum, m) => sum + Number(m[1]) * (HOURS[m[2]!.toLowerCase()] ?? 1), 0))
  const sessions = [...line.matchAll(/(\d+)\s+(one|two|three)-hour/gi)]
  if (sessions.length) {
    const hours = sessions.reduce((sum, m) => sum + Number(m[1]) * (HOURS[m[2]!.toLowerCase()] ?? 1), 0)
    // "36 one-hour lectures" is a semester count; "3 one-hour lectures … per week" is already weekly.
    return half(hours >= 12 ? hours / 12 : hours)
  }
  const total = line.match(/(\d+(?:\.\d+)?)\s*hours/i)
  return total ? half(Number(total[1]) / 12) : undefined
}

function isExpr(e: ReqExpr | null): e is ReqExpr {
  return e !== null
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}
