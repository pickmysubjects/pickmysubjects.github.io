/**
 * Writes data/real/tools.yaml: the software and programming languages each subject teaches or
 * uses, from two places, kept apart because they're not equally sure:
 *
 * - handbook: named in the subject's own Handbook text (overview, learning outcomes, generic
 *   skills), from the Handbook pages copied into the inbox. Prerequisite lists and the rest of
 *   the page are left out, so another subject's title can't count.
 * - students: named in our summaries of what students say (data/real/discussions/). A subject
 *   can change its language, so the page says these come from students.
 *
 * The Handbook rarely names a tool (COMP10001 says "a high-level procedural programming
 * language"); that's why the second list exists.
 *
 *   npm run tools                      # inbox at ~/Projects/subject-compass-inbox
 *   SUBJECT_INBOX=/path npm run tools
 *
 * Without the inbox, the Handbook lists already in tools.yaml are kept.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import { ROOT } from './dataset'

const INBOX = process.env.SUBJECT_INBOX ?? join(homedir(), 'Projects', 'subject-compass-inbox')
const OUT = join(ROOT, 'data', 'real', 'tools.yaml')

/** Tool name → how it's written. Short names need context ("R" alone is a letter, "C" a grade). */
export const TOOLS: Record<string, RegExp> = {
  Python: /\bPython\b/,
  R: /\b(?:the R (?:programming |statistical )?(?:language|software|package|environment)|R programming|R software|RStudio|in R\b|using R\b|R and Python|Python and R)/,
  SQL: /\bSQL\b/,
  Excel: /\bExcel\b/,
  MATLAB: /\bMATLAB\b|\bMatlab\b/,
  Stata: /\bStata\b/,
  SPSS: /\bSPSS\b/,
  SAS: /\bSAS\b/,
  Java: /\bJava\b(?!Script)/,
  JavaScript: /\bJavaScript\b/,
  C: /\b(?:the C programming language|C programming|programming in C|in C\b|written in C\b|language such as C\b)/,
  'C++': /\bC\+\+/,
  Haskell: /\bHaskell\b/,
  Prolog: /\bProlog\b/,
  Tableau: /\bTableau\b/,
  'Power BI': /\bPower ?BI\b/,
  GIS: /\b(?:GIS|ArcGIS|QGIS)\b/,
  AutoCAD: /\bAutoCAD\b/,
  Revit: /\bRevit\b/,
  Rhino: /\bRhino(?:ceros)?\b/,
  SolidWorks: /\bSolid[Ww]orks\b/,
  LaTeX: /\bLaTeX\b/,
  Git: /\bGit(?:Hub)?\b/,
  Linux: /\b(?:Linux|Unix)\b/,
  Unity: /\bUnity (?:game )?engine\b|\bUnity3D\b/,
  Figma: /\bFigma\b/,
  'Adobe Creative Suite': /\b(?:Photoshop|Illustrator|InDesign|Adobe Creative)\b/,
  Mathematica: /\bMathematica\b/,
  Arduino: /\bArduino\b/,
}

export function toolsIn(text: string): string[] {
  return Object.entries(TOOLS)
    .filter(([, rx]) => rx.test(text))
    .map(([name]) => name)
}

// The parts of a Handbook page that say what the subject itself teaches.
const KEEP = /^(Overview|Intended learning outcomes|Generic skills)\b/
const STOP = /^(Eligibility and requirements|Prerequisites|Corequisites|Non-allowed subjects|Assessment|Dates and times|Further information|Last updated)\b/

/** Each subject's teaching text from the copied Handbook pages: the longest copy of each page. */
export function handbookTexts(files: string[]): Record<string, string> {
  const pages: Record<string, string> = {}
  for (const file of files) {
    // Each page starts with its title line: "Genetic Analysis (GENE30004)".
    const parts = readFileSync(file, 'utf8').split(/^[^\n]{3,120} \(([A-Z]{4}\d{5})\)[ \t]*\n/m)
    for (let i = 1; i < parts.length; i += 2) {
      const code = parts[i]!
      const body = parts[i + 1] ?? ''
      if (body.trim().length > (pages[code]?.length ?? 0)) pages[code] = body.trim()
    }
  }
  const out: Record<string, string> = {}
  for (const [code, body] of Object.entries(pages)) {
    let on = false
    const keep: string[] = []
    for (const line of body.split('\n')) {
      if (KEEP.test(line)) on = true
      else if (STOP.test(line)) on = false
      if (on) keep.push(line)
    }
    out[code] = keep.join('\n')
  }
  return out
}

// A tool named only to compare ("very different from everyday languages like Java or Python")
// isn't one the subject uses: drop from the comparison word to the end of its sentence.
const CONTRAST = /\b(?:different from|unlike|compared (?:to|with)|rather than|instead of)\b[^.;!?]*/gi

/** What students' words say a subject uses, comparisons left out. */
export function studentTools(text: string): string[] {
  return toolsIn(text.replace(CONTRAST, ''))
}

/** Every English string in a parsed YAML value. */
function english(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(english)
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => (k === 'en' && typeof x === 'string' ? [x] : english(x)))
  return []
}

function main(): void {
  const old: Record<string, { handbook?: string[]; students?: string[] }> = existsSync(OUT) ? (parse(readFileSync(OUT, 'utf8')) ?? {}) : {}
  const handbook: Record<string, string[]> = {}
  if (existsSync(INBOX)) {
    const files = readdirSync(INBOX).filter((f) => f.endsWith('.txt')).map((f) => join(INBOX, f))
    for (const [code, text] of Object.entries(handbookTexts(files))) {
      const tools = toolsIn(text)
      if (tools.length) handbook[code] = tools
    }
  } else {
    console.warn(`No inbox at ${INBOX}: keeping the Handbook lists already in tools.yaml.`)
    for (const [code, t] of Object.entries(old)) if (t.handbook?.length) handbook[code] = t.handbook
  }
  const students: Record<string, string[]> = {}
  const dir = join(ROOT, 'data', 'real', 'discussions')
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.yaml'))) {
    const d = parse(readFileSync(join(dir, f), 'utf8')) as { code: string }
    const tools = studentTools(english(d).join('\n'))
    if (tools.length) students[d.code] = tools
  }
  const codes = [...new Set([...Object.keys(handbook), ...Object.keys(students)])].sort()
  const lines = [
    '# Generated by `npm run tools` (scripts/extract-tools.ts): do not edit by hand.',
    '# Software and programming languages each subject teaches or uses. handbook: named in its',
    "# Handbook text; students: named in what students say about it (data/real/discussions/).",
  ]
  for (const code of codes) {
    const h = handbook[code] ?? []
    // What the Handbook already names isn't repeated as students' word.
    const s = (students[code] ?? []).filter((x) => !h.includes(x))
    const parts = [h.length ? `handbook: [${h.join(', ')}]` : '', s.length ? `students: [${s.join(', ')}]` : ''].filter(Boolean)
    if (parts.length) lines.push(`${code}: { ${parts.join(', ')} }`)
  }
  writeFileSync(OUT, lines.join('\n') + '\n')
  console.log(`${codes.length} subjects: ${Object.keys(handbook).length} from the Handbook, ${Object.keys(students).length} from students → ${OUT}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
