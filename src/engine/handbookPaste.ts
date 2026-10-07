import type { Period, ReqExpr, ReqField } from './schema'

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
  /** Things the parser was unsure about; a human should double-check these. */
  warnings: string[]
}

const CODE = /\b[A-Z]{4}\d{5}\b/g
const SECTION_HEADINGS: [RegExp, Section][] = [
  [/^prerequisites?$/i, 'pre'],
  [/^corequisites?$/i, 'co'],
  [/^non[- ]allowed subjects?$/i, 'non'],
  [/^recommended background knowledge$/i, 'skip'],
  [/^inherent requirements/i, 'skip'],
  [/^availability/i, 'avail'],
  [/^(fees|contact information|further information|assessment|dates and times)$/i, 'skip'],
]
type Section = 'pre' | 'co' | 'non' | 'avail' | 'skip'

export function parseHandbookPaste(text: string): PasteResult {
  const warnings: string[] = []
  const sections = splitSections(text)

  const result: PasteResult = {
    prerequisites: sections.pre ? parseRequirement(sections.pre, 'prerequisites', warnings) : 'unknown',
    corequisites: sections.co ? parseRequirement(sections.co, 'corequisites', warnings) : 'unknown',
    nonAllowed: sections.non ? parseNonAllowed(sections.non) : 'unknown',
    offerings: sections.avail ? parseAvailability(sections.avail.join('\n')) : 'unknown',
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
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    const heading = SECTION_HEADINGS.find(([re]) => re.test(line))
    if (heading) {
      current = heading[1]
      out[current] ??= []
      // "Availability Semester 1 - On Campus" may share a line with its heading.
      const rest = line.replace(/^availability:?/i, '').trim()
      if (current === 'avail' && rest) out.avail?.push(rest)
      continue
    }
    if (current && current !== 'skip') out[current]?.push(line)
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

function isExpr(e: ReqExpr | null): e is ReqExpr {
  return e !== null
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}
