import { thisYear } from './dataYear'
import { admissionCourses, namedComponents } from './expr'
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
  /** "Marked on a pass/fail basis": no mark, not in the WAM. */
  passFail?: boolean
  /** Subjects the Handbook recommends having done first (not required). */
  recommended?: string[]
  /** Courses (by title) that may take it as breadth, when the page has a "Breadth options" part. */
  breadthFor?: string[]
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
const CODE_ONE = /\b[A-Z]{4}\d{5}\b/
const SECTION_HEADINGS: [RegExp, Section][] = [
  [/^prerequisites?$/i, 'pre'],
  [/^corequisites?$/i, 'co'],
  [/^non[- ]allowed subjects?$/i, 'non'],
  [/^recommended background knowledge$/i, 'rec'],
  [/^inherent requirements/i, 'skip'],
  [/^availability/i, 'avail'],
  [/^description timing percentage$/i, 'assess'],
  [/^(fees|contact information|further information|assessment|dates (and|&) times|additional details|quotas apply)$/i, 'skip'],
]
type Section = 'pre' | 'co' | 'non' | 'rec' | 'avail' | 'assess' | 'skip'

// Inside the assessment table these headings start another term's version; we keep the first.
const TERM_VERSION = /^(summer term|winter term|semester [12]|january|february|june|july|november|december)$/i

export function parseHandbookPaste(text: string): PasteResult {
  const warnings: string[] = []
  const sections = splitSections(text)
  // A discontinued subject listed in a requirement table can't be taken: leave its row out.
  for (const key of ['pre', 'co'] as const) {
    const rows = sections[key]
    if (rows?.some((l) => NO_LONGER.test(l))) {
      warnings.push(`Left out ${key === 'pre' ? 'prerequisite' : 'corequisite'} rows marked "No longer available".`)
      sections[key] = rows.filter((l) => !NO_LONGER.test(l))
    }
  }

  // Many pages list the requirement per degree; this site plans the Bachelor of Science.
  const pre = sections.pre ? scienceOnly(undergraduateOnly(latestRuleOnly(sections.pre, warnings, handbookYear(text)), warnings), warnings) : undefined
  // "Concurrent prerequisites" (or a note that subjects "can also be taken concurrently") may be
  // taken in the same semester: that's what a corequisite means here.
  const split = pre ? splitConcurrent(pre) : undefined
  const coLines = [...(sections.co ?? []).filter((l) => !(split?.concurrent.length && /^none\.?$/i.test(l))), ...(split?.concurrent ?? [])]
  const degrees = sections.pre ? perDegree(latestRuleOnly(sections.pre, [], handbookYear(text)), warnings) : null
  const result: PasteResult = {
    prerequisites: degrees ?? (split ? parseRequirement(split.before, 'prerequisites', warnings) : 'unknown'),
    corequisites: sections.co || split?.concurrent.length ? parseRequirement(coLines, 'corequisites', warnings) : 'unknown',
    nonAllowed: sections.non ? parseNonAllowed(sections.non) : 'unknown',
    offerings: sections.avail ? parseAvailability(sections.avail.join('\n'), text) : 'unknown',
    assessment: sections.assess ? parseAssessment(sections.assess, warnings) : 'unknown',
    weeklyContactHours: parseContactHours(text),
    ...(/marked on a pass\s*\/\s*fail basis|pass\s*\/\s*fail grade/i.test(text) ? { passFail: true } : {}),
    ...parseHeader(text),
    warnings,
  }
  // Recommended (not required) background: only the subject codes it names, minus the
  // requirements already listed and the subject itself.
  if (sections.rec) {
    const required = new Set([...(sections.pre ?? []), ...(sections.co ?? [])].flatMap((l) => l.match(CODE) ?? []))
    const self = parseHeader(text).code
    const codes = unique(sections.rec.flatMap((l) => l.match(CODE) ?? [])).filter((c) => !required.has(c) && c !== self)
    if (codes.length) result.recommended = codes
  }
  const breadth = parseBreadthFor(text)
  if (breadth) result.breadthFor = breadth

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

const NO_LONGER = /\bno longer available\b/i

// "For B-DES students:", "For B-COM Students:", "For Bachelor of Environments students:".
// Also "For Bachelor of Commerce students ( B-COM):".
const FOR_DEGREE = /^for (?:(B-[A-Z]{2,})|bachelor of ([a-z ]+?)) students\s*(?:\(\s*(B-[A-Z]{2,})\s*\))?:?$/i
const DEGREE_CODES: Record<string, string> = {
  science: 'B-SCI',
  biomedicine: 'B-BMED',
  arts: 'B-ARTS',
  commerce: 'B-COM',
  design: 'B-DES',
  agriculture: 'B-AGR',
  music: 'B-MUS',
  'fine arts': 'B-FA',
  environments: 'B-ENVS',
}

/**
 * Requirements listed per degree under "For B-DES students:" headings: one alternative per
 * degree, each needing admission to that degree (when its code is known), so a student only has
 * to meet their own degree's branch. Null when the page has no such headings.
 */
function perDegree(lines: string[], warnings: string[]): ReqField | null {
  const heads = lines.map((l, i) => ({ i, m: FOR_DEGREE.exec(l.trim()) })).filter((h) => h.m)
  if (heads.length === 0) return null
  warnings.push('Requirements are listed per degree; each is kept for its own degree.')
  const branches: ReqField[] = heads.map((h, k) => {
    const code = (h.m![1] ?? h.m![3])?.toUpperCase() ?? DEGREE_CODES[h.m![2]!.toLowerCase()]
    const block = lines.slice(h.i + 1, heads[k + 1]?.i ?? lines.length)
    while (block.length && /^(or|and)?\s*$/i.test(block.at(-1)!.trim())) block.pop()
    const own = parseRequirement(splitConcurrent(block).before, 'prerequisites', warnings)
    if (!code || own === 'unknown') return own
    const guard: ReqExpr = { admission: code, note: lines[h.i]!.trim() }
    if (own === 'none') return guard
    // "Admission into the B-COM …" already inside the branch: no need to say it twice.
    if (JSON.stringify(own).includes(`"admission":"${code}"`)) return own
    return 'all' in own ? { all: [guard, ...own.all] } : { all: [guard, own] }
  })
  const byDegree = combine('any', branches)
  // What comes before the first heading applies to every degree.
  const general = lines.slice(0, heads[0]!.i)
  while (general.length && /^(or|and)?\s*$/i.test(general.at(-1)!.trim())) general.pop()
  if (!general.some((l) => CODE_ONE.test(l))) return byDegree
  return combine('all', [parseRequirement(splitConcurrent(general).before, 'prerequisites', warnings), byDegree])
}

function scienceOnly(lines: string[], warnings: string[]): string[] {
  const heads = lines.map((l, i) => ({ i, degree: DEGREE_HEADING.exec(l)?.[1]?.toLowerCase() })).filter((h) => h.degree)
  if (heads.length === 0) return lines
  // With more than one (e.g. "pre 2013" and "2013 on"), the current students' one is the last that isn't "pre".
  const science = heads.map((h, k) => ({ ...h, k })).filter((h) => h.degree === 'science' || h.degree === 'sc')
  const current = science.filter((h) => !/\bpre\b/i.test(lines[h.i] ?? ''))
  const at = (current.at(-1) ?? science.at(-1))?.k ?? -1
  if (at < 0) {
    // "… general requirement … / Bachelor of Biomedicine Students: …": what comes before the
    // only other degree's heading is everyone else's requirement.
    const before = lines.slice(0, (heads[0] as { i: number }).i)
    while (before.length && /^(or|and)?\s*$/i.test(before.at(-1)!.trim())) before.pop()
    if (before.some((l) => CODE_ONE.test(l))) {
      warnings.push('Requirements are listed for another degree too; kept the general one.')
      return before
    }
    warnings.push('Requirements are listed per degree, with none for the Bachelor of Science; kept them all.')
    return lines
  }
  const start = (heads[at] as { i: number }).i + 1
  const end = heads[at + 1]?.i ?? lines.length
  warnings.push('Requirements are listed per degree; kept the Bachelor of Science one.')
  // Text before the first heading (e.g. an overall "OR") belongs to no degree in particular.
  return lines.slice(start, end)
}

/** The Handbook year the page is from ("You’re viewing the 2026 Handbook"), else this year. */
function handbookYear(text: string): number {
  return Number(/viewing the (\d{4}) Handbook/i.exec(text)?.[1] ?? /\bYear: (\d{4})\b/.exec(text)?.[1] ?? thisYear())
}

/** "For 2020, students must … From 2021, students must …": only the rule in force now applies. */
function latestRuleOnly(all: string[], warnings: string[], year: number): string[] {
  // A rule that starts in a later year ("From 2027 onwards") doesn't apply yet: drop it.
  const future = all.findIndex((l) => Number(/^from (\d{4})\b/i.exec(l.trim())?.[1] ?? 0) > year)
  const lines = future < 0 ? all : all.slice(0, future)
  if (future >= 0) warnings.push(`Left out a rule that starts later ("${all[future]!.trim().slice(0, 40)}").`)
  // The latest "From YYYY" rule already in force (a "From 2027" one waits until then).
  const at = lines
    .map((l, i) => {
      const y = /^from (\d{4})\b/i.exec(l.trim())?.[1]
      return y && Number(y) <= year ? i : -1
    })
    .filter((i) => i >= 0)
    .at(-1)
  if (at === undefined || !lines.slice(0, at).some((l) => /^(for|until|before|up to) \d{4}\b/i.test(l.trim()))) return lines
  warnings.push(`Kept only the current rule ("${lines[at]!.trim().slice(0, 40)}").`)
  // Keep what the line says after the year ("… students must have completed one of:"), so its
  // "one of" / "both of" still labels the table under it; stop at a later rule for a future year.
  const rest = lines[at]!.trim().replace(/^from \d{4}(?: onwards)?,?\s*/i, '').replace(/^students must (?:have )?(?:completed |meet )?/i, '')
  const end = lines.findIndex((l, i) => i > at && /^(from|for) \d{4}\b/i.test(l.trim()))
  return [...(rest ? [rest] : []), ...lines.slice(at + 1, end < 0 ? lines.length : end)]
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
  // Right after a "One of" table, an unlabelled concurrent table adds options to that same
  // choice ("One of A, B; these can also be taken concurrently: C, D"): drop the note and the
  // repeated table header so its rows join the list above.
  const lastLabel = lines.slice(0, at).filter((l) => /^(one of|all of|both of|and|or)\b/i.test(l.trim())).at(-1) ?? ''
  const next = lines.slice(at + 1).find((l) => l.trim()) ?? ''
  if (/^one of/i.test(lastLabel.trim()) && /^code\s/i.test(next.trim()) && !/^concurrent prerequisites?:?$/i.test(lines[at] ?? '')) {
    const header = lines.findIndex((l, k) => k > at && /^code\s/i.test(l.trim()))
    return { before: lines.filter((_, k) => k !== at && k !== header), concurrent: [] }
  }
  const rest = lines.slice(at + 1)
  const stop = rest.findIndex((l) => /^(and|or|option \d+(?:\s*[-–—:].*)?)$/i.test(l.trim()))
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

/** One option in words: codes joined by "or" are a choice, the rest are all needed. */
function optionFromWords(line: string): ReqField {
  const found = [...line.matchAll(CODE)]
  const groups: string[][] = []
  found.forEach((m, k) => {
    const prev = found[k - 1]
    const gap = k === 0 || !prev ? '' : line.slice(prev.index! + prev[0].length, m.index)
    // "MAST10007 or MAST10022", also with a name between ("MAST10007 Linear Algebra or MAST10022").
    if (k > 0 && /^(?:\s[^;,]*?)?\s*\bor\s*$/i.test(gap)) groups.at(-1)!.push(m[0])
    else if (!groups.some((g) => g.includes(m[0]))) groups.push([m[0]])
  })
  const parts: ReqExpr[] = groups.map((g) => (g.length === 1 ? { subject: g[0]! } : { any: g.map((c) => ({ subject: c })) }))
  return parts.length === 1 ? parts[0]! : { all: parts }
}

function parseRequirement(lines: string[], label: string, warnings: string[]): ReqField {
  if (lines.length === 0 || (lines.length === 1 && /^none\.?$/i.test(lines[0] ?? ''))) return 'none'

  // "Meet one of the following options:" then one option per line in words ("A total of 150 or
  // more across MAST10006 or MAST10021 and MAST10007 or MAST10022"), then a table that only lists
  // the subjects named: each line is an alternative; codes joined by "or" are a choice within it.
  const intro = lines.findIndex((l) => /one of the following .*options?:?$/i.test(l.trim()))
  if (intro >= 0 && !lines.some((l) => /^option \d+/i.test(l.trim()))) {
    const tableAt = lines.findIndex((l, i) => i > intro && /^code\s/i.test(l.trim()))
    const prose = lines.slice(intro + 1, tableAt < 0 ? lines.length : tableAt).filter((l) => CODE_ONE.test(l))
    if (prose.length >= 2) {
      if (prose.some((l) => /\d+\s*\(out of \d+\)|\bor more\b/i.test(l))) warnings.push('Some options also need a combined mark; only the subjects are recorded.')
      return combine('any', prose.map(optionFromWords))
    }
  }

  // "Option 1 … Option 2 …": meeting any one option is enough.
  const optionAt = lines.map((l, i) => (/^option \d+(?:\s*[-–—:].*)?$/i.test(l) ? i : -1)).filter((i) => i >= 0)
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
  // "It is strongly recommended that A be studied concurrently with B": advice, not a requirement.
  lines = lines.filter((l) => !/\brecommended\b/i.test(l))
  // "All of" table then "One of" table with no "And" between: each table is its own part.
  const labels = lines.map((l, i) => (readQuantifier(l) !== null ? i : -1)).filter((i) => i >= 0)
  if (labels.length >= 2) {
    const segments = labels.map((at, k) => lines.slice(k === 0 ? 0 : at, labels[k + 1] ?? lines.length))
    if (segments.every((seg) => seg.some((l) => CODE_ONE.test(l)))) {
      const parts = segments.map((seg) => parseBlock(seg, label, warnings)).filter(isExpr)
      return parts.length === 1 ? (parts[0] as ReqExpr) : { all: parts }
    }
  }
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

  const sentence = lines
    .filter((l) => !isTableNoise(l) && readQuantifier(l) === null)
    .join(' ')
    .trim()
    // "Equivalent All students enrolling …": the word is a row of its own run into the next sentence.
    .replace(/^equivalent\.?\s+(?=[A-Z])/, '')
  // "Equivalent" on its own never decides anything: an option nobody can check is left out.
  if (!sentence || BARE_EQUIVALENT.test(sentence)) return null
  const admission = readAdmission(sentence)
  if (admission) return admission
  const structured = structuredFromText(sentence)
  if (structured) return structured
  const points = /^(\d+(?:\.\d+)?) (?:credit )?points? (?:of|at) level (\d)/i.exec(sentence)
  if (points) return { points: { min: Number(points[1]), level: Number(points[2]) } }
  // "Completion of 100 credit points of study" / "A minimum of 200 credit points of Undergraduate study".
  // Only points of study in general; "25 points of Level 2 Earth Science" stays for a human.
  const total = /(?:completion of|completed|a minimum of|at least) (\d+(?:\.\d+)?) (?:credit )?points?(?: of (?:prior |undergraduate )?(?:undergraduate )?study)?(?:\s*\([^)]*\))?(?=[.;]|\s*$|\s+(?:this|students|and|permission)\b)/i.exec(sentence)
  if (total) {
    const min = { points: { min: Number(total[1]) } }
    // Permission on top, unless it's only the way round the points rule ("… have not completed …").
    if (/permission|approval/i.test(sentence) && !/not (?:yet )?completed/i.test(sentence)) return { all: [min, { manual: sentence }] }
    return min
  }
  warnings.push(`Free-text ${label} kept for manual checking: “${sentence}”.`)
  return { manual: sentence }
}

type Quantifier = { kind: 'all' } | { kind: 'one' } | { kind: 'points'; min: number }

function readQuantifier(line: string): Quantifier | null {
  if (/^(?:and )?(?:all of|both(?: completed)?):?$/i.test(line)) return { kind: 'all' }
  if (/^(?:and )?(?:a )?(?:minimum of )?(one|1) of(?: the following)?:?$/i.test(line)) return { kind: 'one' }
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
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * A study period named after a month ("February - On Campus") is a semester or a short term
 * depending on when it runs: February that teaches into May is Semester 1, a few weeks in
 * January–February is summer, June–August is winter, November–December is next summer.
 */
function monthPeriod(month: string, page: string): Period {
  const m = MONTHS.indexOf(month.toLowerCase())
  const dates = new RegExp(`^${month}\\b[\\s\\S]*?Teaching period\\s+\\d{1,2} (\\w+) \\d{4} to \\d{1,2} (\\w+) \\d{4}`, 'im').exec(page)
  const end = dates ? MONTHS.indexOf(dates[2]!.toLowerCase()) : -1
  if (m <= 1) return end >= 3 ? 'semester-1' : 'summer'
  if (m >= 5 && m <= 7) return end >= 9 ? 'semester-2' : 'winter'
  if (m >= 10) return 'summer'
  return m < 5 ? 'semester-1' : 'semester-2'
}

export function parseAvailability(text: string, page = text): Period[] | 'unknown' {
  const found = new Set<Period>()
  for (const m of text.matchAll(/^(January|February|March|April|May|June|July|August|September|October|November|December)\b/gim)) {
    found.add(monthPeriod(m[1]!, page))
  }
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
    let kind = classify(description)
    // An "examination" held mid-semester ("Mid semester", "Week 7") is a test, not the final exam.
    if (kind === 'exam' && /mid[- ]?(semester|term)|\bweeks? \d|around week|week \d+ and \d+/i.test(all) && !/exam(ination)? period|end of (the )?semester|final exam/i.test(all)) kind = 'test'
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
  // "A 2 hour lecture and a 1 hour tutorial" with no "per week": a semester of under 12 hours
  // doesn't happen, so a total that small is already weekly.
  if (total) return half(total < 12 ? total : total / 12)
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

/**
 * "This subject is available as breadth in the following courses:" and the course titles under
 * it; [] when the page says it isn't available as breadth; undefined when the page doesn't say.
 */
export function parseBreadthFor(text: string): string[] | undefined {
  if (/not available as breadth/i.test(text)) return []
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const at = lines.findIndex((l) => /available as breadth in the following courses/i.test(l))
  // The whole page was copied (its "Further information" part is there) with no breadth list:
  // not breadth for any course. Only part of a page copied: we can't tell.
  if (at < 0) return /^(?:further information|community access program)$|available through the community access program/im.test(text) ? [] : undefined
  const out: string[] = []
  for (const l of lines.slice(at + 1)) {
    if (!l) {
      if (out.length) break
      continue
    }
    // A course name broken over two lines: "Bachelor of Fine Arts" / "(Acting)".
    if (/^\(/.test(l) && out.length) {
      out[out.length - 1] += ` ${l}`
      continue
    }
    if (!/^(Bachelor|Diploma|Graduate|Master|Associate)\b/.test(l)) break
    out.push(l)
  }
  return out.length ? out : undefined
}

/**
 * Fields of study as the Handbook names them in points rules, and the code prefixes that teach
 * them. Only fields with a clear set of codes: "quantitative science" or "a Science degree" stay
 * for a human.
 */
const DISCIPLINES: [RegExp, string[]][] = [
  [/^(?:geoscience|earth sciences?|geology)$/i, ['ERTH', 'GEOL']],
  [/^geography$/i, ['GEOG']],
  [/^chemistry$/i, ['CHEM']],
  [/^biology$/i, ['BIOL']],
  [/^(?:mathematics|maths|statistics)$/i, ['MAST']],
  [/^physics$/i, ['PHYC']],
  [/^psychology$/i, ['PSYC']],
  [/^environmental (?:studies|science)$/i, ['ENVS', 'EVSC']],
  [/^biochemistry$/i, ['BCMB']],
  [/^biotechnology$/i, ['BTCH']],
  [/^ecology$/i, ['ECOL']],
  [/^agriculture$/i, ['AGRI']],
  [/^biomedicine$/i, ['BIOM']],
  [/^italian(?: studies)?$/i, ['ITAL']],
  // A group of fields under one name: every code prefix that teaches one of them.
  [/^biological sciences?$/i, ['BIOL', 'BOTA', 'ZOOL', 'ECOL', 'GENE', 'BCMB', 'MIIM', 'ANAT', 'PHYS', 'PATH']],
]

/**
 * "12.5 credit points of Level 1 or Level 2 Geoscience, Geography, Chemistry or Biology subjects"
 * as a points rule over those levels and code prefixes. A trailing "(or equivalent …)" keeps the
 * sentence as a by-hand alternative. Anything with a field not in the list stays free text.
 */
export function parseDisciplinePoints(sentence: string): ReqExpr | null {
  // Levels only, no field: "A minimum of 25 credit points of Level 2 subjects".
  const plain = /^(?:completion of )?(?:a minimum of |at least )?(\d+(?:\.\d+)?) credit points? (?:of|in) ((?:level[- ]?\d)(?:\s*(?:,|or|and\/or|and|\/)\s*(?:level[- ]?)?\d)*)\s+(?:subjects?|study)\.?$/i.exec(sentence.trim())
  if (plain) return { points: { min: Number(plain[1]), levels: [...new Set([...(plain[2] as string).matchAll(/\d/g)].map((x) => Number(x[0])))] } }
  const m = /^(?:completion of )?(?:a minimum of |at least )?(\d+(?:\.\d+)?) credit points? (?:of|in) (?:an? )?((?:level[- ]?\d)(?:\s*(?:,|or|and\/or|and|\/)\s*(?:level[- ]?)?\d)*)\s+(.+?)(?:\s+subjects?\b(.*))?\.?$/i.exec(sentence.trim())
  if (!m) return null
  const levels = [...(m[2] as string).matchAll(/\d/g)].map((x) => Number(x[0]))
  const names = (m[3] as string).split(/\s*,\s*|\s+or\s+|\s+and\s+|\s*\/\s*/).filter(Boolean)
  const areas: string[] = []
  for (const n of names) {
    const hit = DISCIPLINES.find(([re]) => re.test(n.trim()))
    if (!hit) return null
    areas.push(...hit[1])
  }
  const rule: ReqExpr = { points: { min: Number(m[1]), levels: [...new Set(levels)], areas: [...new Set(areas)] } }
  const rest = (m[4] ?? "").replace(/^[\s.;]+|[\s.;]+$/g, '')
  if (!rest || /^\(?or (?:an? )?(?:approved )?equivalent\)?$/i.test(rest)) return rule
  if (/^\(?or equivalent,? (?:as )?approved by the subject co-?ordinator\)?$/i.test(rest)) return { any: [rule, { permission: 'coordinator', note: sentence.trim() }] }
  return { any: [rule, { manual: sentence.trim() }] }
}

/**
 * Free text the Handbook writes in a few fixed ways, as rules we can check:
 * - selection into (or admission to) a graduate course ("… specialisation in the MC-ENG Master of
 *   Engineering"): an undergraduate can't meet it, so it's an admission to that course;
 * - "N points of …, inclusive of M points of …": both, each read on its own;
 * - "completed at least N credit points prior to …": points of any study;
 * - points of named levels and fields (parseDisciplinePoints).
 * Null when it's none of these, so it stays for a human.
 */
export function structuredFromText(sentence: string): ReqExpr | null {
  const text = sentence.trim()
  // "… these can be taken at the same time": the rule, taken before or alongside.
  const together = /^(.+?)[;,]?\s*(?:\(?(?:these|which) can be taken (?:at the same time|concurrently)\)?|\(can be concurrent\))\.?$/i.exec(text)
  if (together) {
    const inner = structuredFromText(together[1] as string)
    if (inner && 'points' in inner) return { points: { ...inner.points, concurrent: true } }
    if (inner && 'subject' in inner) return { subject: inner.subject, concurrent: true }
    return null
  }
  const graduate = [...new Set(text.match(/\b(?:MC|GD|D)-[A-Z]{2,}\b/g) ?? [])]
  if (graduate.length && !/\bB-[A-Z]{2,}\b/.test(text) && /\b(?:selection|admission)\b/i.test(text)) {
    const options: ReqExpr[] = graduate.map((c) => ({ admission: c, note: text }))
    return options.length === 1 ? (options[0] as ReqExpr) : { any: options }
  }
  const inclusive = /^(.*?credit points?.*?),?\s+(?:inclusive of|including)\s+(.*?credit points?.*)$/i.exec(text)
  if (inclusive) {
    const first = structuredFromText(inclusive[1] as string)
    const second = structuredFromText(inclusive[2] as string)
    if (first && second) return { all: [first, second] }
  }
  const prior = /^(?:students must )?(?:have )?(?:completed|completion of) (?:at least |a minimum of )?(\d+(?:\.\d+)?) (?:credit )?points?(?: of (?:prior )?study)?(?: prior to [^.]*)?\.?$/i.exec(text)
  if (prior) return { points: { min: Number(prior[1]) } }
  return parseDisciplinePoints(text) ?? conditionFromText(text)
}

/** "Equivalent", "Equivalent.", "An approved equivalent": an option nobody can check. */
const BARE_EQUIVALENT = /^(?:an? )?(?:approved )?equivalent\.?$/i

/**
 * Takes out of an `any` list the bare "Equivalent" options (they never decide anything, so a
 * list the student hasn't met stays unknown because of them), and turns free-text conditions
 * structuredFromText can read into rules. The rest stays as it was.
 */
export function restructure(field: ReqField): ReqField {
  if (field === 'none' || field === 'unknown') return field
  const walk = (e: ReqExpr): ReqExpr | null => {
    if ('manual' in e) {
      const text = e.manual.trim().replace(/^equivalent\.?\s+(?=[A-Z])/, '')
      if (BARE_EQUIVALENT.test(text)) return null
      return structuredFromText(text) ?? e
    }
    if ('all' in e || 'any' in e) {
      const key = 'all' in e ? 'all' : 'any'
      const parts = (e as Record<string, ReqExpr[]>)[key]!
      // Only an option is dropped: a requirement that is nothing but "Equivalent" stays.
      const kept = parts.map((x) => (key === 'any' || !('manual' in x) ? walk(x) : (walk(x) ?? x))).filter(isExpr)
      if (kept.length === 0) return e
      return kept.length === 1 ? (kept[0] as ReqExpr) : ({ [key]: kept } as ReqExpr)
    }
    return e
  }
  return walk(field) ?? field
}

const ORDINAL: Record<string, number> = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3 }
const GRADE_MIN: Record<string, number> = { H1: 80, H2A: 75, H2B: 70, H3: 65, P: 50 }

/** Areas for a field name ("Italian Studies"), or null when it isn't one we know. */
function disciplineAreas(name: string): string[] | null {
  const parts = name.split(/\s*,\s*|\s+or\s+|\s+and\s+|\s*\/\s*/).filter(Boolean)
  const areas: string[] = []
  for (const n of parts) {
    const hit = DISCIPLINES.find(([re]) => re.test(n.trim()))
    if (!hit) return null
    areas.push(...hit[1])
  }
  return [...new Set(areas)]
}

// Words that name a selection rather than a permission anyone can ask for.
const APPLICATION = /\bapplications?\b|\bapply\b|\bselection process\b|\bselected\b|\bquotas?\b|\binterview\b|special entry conditions/i
const PERMISSION = /co-?ordinator|convenor|\bpermission\b|\bapproval\b|by arrangement with/i
// Conditions about who the student is, which a permission reading would lose.
const RESTRICTION = /\bcompletion of\b|\bcompleted\b|\bonly available to\b|\blimited to\b|\bmust be in\b|\benrolled in\b|\bcriteria for applying\b|\bcredit points\b|\bpoints of\b|\baverage\b(?! marks?\b)|\bWAM\b|\bsubjects? taught\b/i

/**
 * Conditions the Handbook states in words that we can type even when we can't check them:
 * points by level ("25 points at Level 1, and 37.5 points at Level 2"), averages and WAMs, a
 * course-specific rule ("B-SCI Students: …"), VCE results, placement and competency tests, the
 * coordinator's permission and application-only entry. Null when it's none of these.
 */
function conditionFromText(text: string): ReqExpr | null {
  const scoped = /^((?:B|D)-[A-Z]{2,}) students:\s*(.+)$/i.exec(text)
  if (scoped) {
    const inner = structuredFromText(scoped[2] as string)
    return inner ? { all: [{ admission: (scoped[1] as string).toUpperCase(), note: text }, inner] } : null
  }
  // "Completion of 25 points at Level 1, and 37.5 points at Level 2."
  if (/^(?:completion of )?\d+(?:\.\d+)? (?:credit )?points at level \d(?:,? and \d+(?:\.\d+)? (?:credit )?points at level \d)+\.?$/i.test(text)) {
    return { all: [...text.matchAll(/(\d+(?:\.\d+)?) (?:credit )?points at level (\d)/gi)].map((m) => ({ points: { min: Number(m[1]), levels: [Number(m[2])] } })) }
  }
  const average = averageFromText(text)
  if (average) return average
  const wam = /\bWAM of (?:at least )?(\d{2})\b/i.exec(text)
  if (wam && !CODE_ONE.test(text)) {
    const rule: ReqExpr = { wam: { min: Number(wam[1]) }, note: text }
    return APPLICATION.test(text) ? { all: [rule, { permission: 'application', note: text }] } : rule
  }
  // "100 credit points of undergraduate study completed Students are required to apply …".
  const pointsThen = /^(?:completion of )?(?:a minimum of |at least )?(\d+(?:\.\d+)?) credit points(?: of (?:undergraduate |prior )?study)?(?: completed)?[.,]?\s+(.+)$/i.exec(text)
  if (pointsThen && /^[A-Z]/.test(pointsThen[2] as string)) {
    const rest = permissionFromText(pointsThen[2] as string)
    if (rest) return { all: [{ points: { min: Number(pointsThen[1]) } }, rest] }
  }
  const school = schoolFromText(text)
  if (school) return school
  const placement = placementFromText(text)
  if (placement) return placement
  const permission = permissionFromText(text)
  if (permission) return permission
  // Several sentences, each a condition: all of them.
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/).filter((x) => x.trim() && !/^link\.?$/i.test(x.trim()))
  if (sentences.length >= 2) {
    const parts = sentences.map((x) => structuredFromText(x))
    if (parts.every(isExpr)) return { all: parts }
  }
  return null
}

/**
 * "normally an average of at least 75% in relevant 2nd and 3rd year subjects", or "A minimum of 25
 * credit points of Italian Studies subjects with an average grade of H2B or above".
 */
function averageFromText(text: string): ReqExpr | null {
  const years = /\baverage of (?:at least )?(\d{2})%? in (?:relevant )?(first|second|third|1st|2nd|3rd)(?: (?:and|or) (first|second|third|1st|2nd|3rd))? year(?: level)? subjects/i.exec(text)
  if (years && !CODE_ONE.test(text)) {
    const levels = [years[2], years[3]].filter(Boolean).map((x) => ORDINAL[(x as string).toLowerCase()] as number)
    return { average: { min: Number(years[1]), levels }, note: text }
  }
  const pointsAvg = /(?:a minimum of )?(\d+(?:\.\d+)?) credit points of (.+?) subjects with an average (?:grade |mark )?of (H1|H2A|H2B|H3|P|\d{2}%?) or (?:above|more)/i.exec(text)
  if (pointsAvg) {
    const areas = disciplineAreas(pointsAvg[2] as string)
    if (!areas) return null
    const grade = (pointsAvg[3] as string).toUpperCase()
    const min = GRADE_MIN[grade] ?? Number.parseInt(grade, 10)
    const rules: ReqExpr[] = [{ points: { min: Number(pointsAvg[1]), areas } }, { average: { min, areas }, note: text }]
    // "Additional entry requirements also apply": an application on top.
    if (APPLICATION.test(text) || /additional entry requirements/i.test(text)) rules.push({ permission: 'application', note: text })
    return { all: rules }
  }
  return null
}

/** "Study score of 30 or more in VCE Specialist Mathematics 3/4 or equivalent", "VCE Units 3/4 Chemistry". */
function schoolFromText(text: string): ReqExpr | null {
  if (!/\bVCE\b/.test(text) || CODE_ONE.test(text)) return null
  // A note about VCE students ("VCE Algorithmics students may …") or an equivalent spelled out.
  if (/\bstudents may\b|^(?:an )?approved equivalent|\badmission into\b(?!.*\bincluding admission)/i.test(text)) return null
  let t = text
  let alternative: ReqExpr | null = null
  const permission = /,?\s*or (?:permission|approval) (?:from|of) .+$/i.exec(t)
  if (permission) {
    alternative = { permission: 'coordinator', note: text }
    t = t.slice(0, permission.index)
  }
  const score = /\b(?:study score|score|mark) of (?:at least )?(\d{2})\b/i.exec(t) ?? /\b(\d{2}) \(or higher\)/.exec(t)
  let subject = t.slice(t.search(/\bVCE\b/) + 3)
  subject = subject
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:study )?score\b.*$/i, ' ')
    .replace(/,?\s*or (?:the )?equivalent.*$/i, ' ')
    .replace(/\bunits? 3\s*(?:and|&|\/)\s*4\b|\b3\s*(?:and|\/)\s*4\b/gi, ' ')
    .replace(/^\s*[-–]\s*/, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–,]+|[\s.,;]+$/g, '')
  if (!/^[A-Za-z][A-Za-z0-9/ ]{1,60}$/.test(subject) || subject.split(' ').length > 6 || /\b(?:students?|subjects?|enrol)\b/i.test(subject)) return null
  const rule: ReqExpr = { school: { subject, ...(score ? { minScore: Number(score[1]) } : {}) }, note: text }
  return alternative ? { any: [rule, alternative] } : rule
}

const NOT_A_LANGUAGE = new Set(['Language', 'Online', 'The', 'All', 'A', 'This', 'Link', 'Placement', 'New', 'Students'])

/** A language placement test, or a programming competency test. */
function placementFromText(text: string): ReqExpr | null {
  if (/programming competen(?:cy|ce)\b/i.test(text) && !CODE_ONE.test(text)) return { placement: 'programming', note: text }
  if (!/placement (?:test|procedure)|language questionnaire|entry point determined by/i.test(text)) return null
  // A permission that a test result only qualifies ("Permission … who demonstrate … through the placement test").
  if (/^(?:permission|approval)\b/i.test(text) || CODE_ONE.test(text)) return null
  const names = [
    ...text.matchAll(/\benrolling in ([A-Z][a-z]+)\b(?: at The University of Melbourne)? for the first time/g),
    ...text.matchAll(/\bdetermined by the ([A-Z][a-z]+) Program/g),
    ...text.matchAll(/\b([A-Z][a-z]+) (?:Language )?[Pp]lacement [Tt]est/g),
    ...text.matchAll(/\b[Pp]lacement [Tt]est of ([A-Z][a-z]+)/g),
    ...text.matchAll(/\bplaces you in ([A-Z][a-z]+)/g),
  ]
    .map((m) => m[1] as string)
    .filter((n) => !NOT_A_LANGUAGE.has(n))
  return { placement: names[0] ?? 'language', note: text }
}

/** The coordinator's permission, or entry by application / selection. */
function permissionFromText(text: string): ReqExpr | null {
  if (CODE_ONE.test(text) || RESTRICTION.test(text)) return null
  if (/\b(?:MC|B|D|GD|GC)-[A-Z]{2,}\b/.test(text) || namedComponents(text).length || admissionCourses(text).length) return null
  if (APPLICATION.test(text)) return { permission: 'application', note: text }
  if (PERMISSION.test(text)) return { permission: 'coordinator', note: text }
  return null
}
