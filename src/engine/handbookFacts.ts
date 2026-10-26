import { LANGUAGES } from './studentFacts'

/**
 * Facts read off a Handbook page's text: the attendance hurdle, whether it lists prescribed
 * texts, an open- or closed-book final exam, and the programming languages it names. Each is set
 * only when the text says it plainly; anything unclear stays undefined.
 */
export type Language = (typeof LANGUAGES)[number]

/** Class types an attendance requirement can name; none named means "classes" in general. */
export const ATTEND_CLASSES = ['tutorials', 'workshops', 'seminars', 'labs', 'practicals', 'studios', 'lectures'] as const
export type AttendClass = (typeof ATTEND_CLASSES)[number]
const CLASS_RE: Record<AttendClass, RegExp> = {
  tutorials: /\btutorials?\b/i,
  workshops: /\bworkshops?\b/i,
  seminars: /\bseminars?\b/i,
  labs: /\blab(?:s|oratory|oratories)?\b/i,
  practicals: /\bpracticals?\b/i,
  studios: /\bstudios?\b/i,
  // "Lectorials" are not lectures.
  lectures: /\blectures?\b/i,
}
export interface HandbookFacts {
  minAttendance?: number
  attendanceAppliesTo?: AttendClass[]
  prescribedTexts?: boolean
  examBook?: 'open' | 'closed'
  languages?: Language[]
  /** The sentence each fact came from, for checking by eye. */
  evidence: Partial<Record<'minAttendance' | 'prescribedTexts' | 'examBook' | 'languages', string>>
}

/** Lines, cut further at sentence ends and semicolons. */
function sentences(text: string): string[] {
  return text
    .split(/\r?\n/)
    // Requirement tables list other subjects by code and title ("COMP20005 … Computation in C").
    .filter((l) => !/\b[A-Z]{4}\d{5}\b/.test(l))
    .flatMap((l) => l.split('\t'))
    .flatMap((l) => l.split(/(?<=[.;])\s+(?=[A-Z(])|;\s*/))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** "Attendance at 80% of tutorials", "a minimum requirement of 80% attendance": one percentage only. */
export function extractAttendance(text: string): { value: number; sentence: string; appliesTo?: AttendClass[] } | undefined {
  const found = new Map<number, string>()
  for (const s of sentences(text)) {
    if (!/attend/i.test(s)) continue
    // Marks, late penalties and special-consideration exceptions carry percentages too.
    if (/\blate\b|penal|marks?\b|\bgrade|\bweight|\bscore|\bresult (?:of|for)\b|special consideration|lowered/i.test(s.replace(/\bsubmission of work\b/i, ''))) continue
    // "80% attendance", "attend (at least) 80%", or "80% of (all scheduled) tutorials" near "attend".
    const re = /(\d{2,3})\s?%\s+(?:(?!of\b)[a-z]+\s+){0,3}?attendance|\battend(?:ance)?\b[^%]{0,50}?\b(\d{2,3})\s?%\s*\)?\s*(?:\([^)]*\)\s*)?(?:of|at|in|or)\b/gi
    for (const m of s.matchAll(re)) {
      const n = Number(m[1] ?? m[2])
      if (n < 50 || n > 100) continue
      if (!found.has(n)) found.set(n, s)
    }
  }
  // Different shares for different classes ("75% of lectures; 100% of tutorials"): too unclear.
  const only = [...found][0]
  if (found.size !== 1 || !only) return undefined
  const [value, sentence] = only
  // What it applies to, from the words after the percentage or "attend" (not the hurdle's own label).
  const from = sentence.search(/\d{2,3}\s?%|\battend/i)
  const tail = sentence.slice(Math.max(0, from)).replace(/\bAttendance hurdle requirement:?/i, '')
    // "(may include lectures, tutorials …)" is a hedge, not a list of what counts.
    .replace(/\([^)]*\bmay include\b[^)]*\)?/gi, '')
    .replace(/\[[^\]]*\]?/g, '')
  // "… and 75% of all scheduled classes": every class counts, so no single type is named.
  const appliesTo = /\ball (?:scheduled |timetabled )?classes\b/i.test(tail) ? [] : ATTEND_CLASSES.filter((c) => CLASS_RE[c].test(tail))
  return appliesTo.length ? { value, sentence, appliesTo } : { value, sentence }
}

const NO_TEXTS = /\bno (?:specifically )?prescribed\b|\bno prescribed texts?\b|^none\.?$|\bnot require[^.]*prescribed\b|\bthere (?:is|are) no (?:set |required )?texts?\b/i
const NOT_A_CITATION = /^(?:you will be advised|students will be advised|readings?|subject readings|a subject reader|materials?|music scores|to be advised|tba|tbc|see |details)/i
const CITATION = /\b(?:19|20)\d{2}\b|\bISBN\b|\bedition\b|\b\d+(?:st|nd|rd|th) ed\b|\bpress\b|\bpublisher\b|\bpearson\b|\bwiley\b|\bspringer\b|\bmcgraw|\bcengage\b|\bhueber\b|\boxford\b|\bcambridge\b|\broutledge\b/i
const SECTION_END = /^(?:Recommended texts|Related Handbook entries|Breadth options|Subject notes|Additional (?:subject )?(?:information|material)|Available |Off-campus|Note:|Further information|Last updated)/i

/** "Prescribed texts" then a citation (true) or "There are no … prescribed …" / "None" (false). */
export function extractPrescribedTexts(text: string): { value: boolean; sentence: string } | undefined {
  const lines = text.split(/\r?\n/)
  let out: { value: boolean; sentence: string } | undefined
  for (let i = 0; i < lines.length; i++) {
    // The heading alone on its line, or run together with what follows ("Prescribed textsWu …").
    const head = /^\s*(?:Further information\s*Texts\s*)?Prescribed texts:?\s*(.*)$/i.exec(lines[i]!.replace(/^.*Further informationTexts/, ''))
    if (!head) continue
    const body: string[] = head[1]?.trim() ? [head[1].trim()] : []
    for (let j = i + 1; j < lines.length && body.length < 3; j++) {
      const l = lines[j]!.trim()
      if (!l) continue
      if (SECTION_END.test(l)) break
      body.push(l)
    }
    const first = body[0]
    if (!first) continue
    let value: boolean | undefined
    if (NO_TEXTS.test(first)) value = false
    else if (!NOT_A_CITATION.test(first) && first.length >= 15 && CITATION.test(body.join(' '))) value = true
    if (value === undefined) continue
    if (out && out.value !== value) return undefined
    out = { value, sentence: first.slice(0, 200) }
  }
  // An inline "Prescribed Texts: There is no prescribed text." in the overview.
  if (!out) {
    const m = /Prescribed Texts?:\s*(There (?:is|are) no prescribed texts?\.?)/i.exec(text)
    if (m) out = { value: false, sentence: m[1]! }
  }
  return out
}

/** A final exam described as open- or closed-book (quizzes and tests don't count). */
export function extractExamBook(text: string): { value: 'open' | 'closed'; sentence: string } | undefined {
  const found = new Map<'open' | 'closed', string>()
  for (const s of sentences(text)) {
    const m = /\b(open|closed)[- ]?book\b/i.exec(s)
    if (!m || !/\bexam(?:ination)?s?\b/i.test(s) || /\bquiz|\btests?\b|\bassessments\b/i.test(s)) continue
    const v = m[1]!.toLowerCase() as 'open' | 'closed'
    if (!found.has(v)) found.set(v, s)
  }
  const only = [...found][0]
  if (found.size !== 1 || !only) return undefined
  const [value, sentence] = only
  return { value, sentence }
}

// Words that show a sentence is about programming or software.
const PROGRAMMING = /\bprogram(?:s|ming|med)?\b|\b(?:programming|high-level|scripting|computer) languages?\b|\bcod(?:e|ing)\b|\bscripts?\b|\bsoftware\b|\bpackage\b|\bstatistical environment\b|\bcomputing\b|\bcomputation\b|\blibrar(?:y|ies)\b|\bnotebook\b|\bqueries\b|\bdatabase\b|\brelational\b|\bsimulation\b|\binstalled\b/i
// Background the subject assumes rather than uses ("Knowledge of Python is a benefit").
const BACKGROUND = /\bknowledge of\b|\bfamiliarity with\b|\bexperience (?:with|in)\b|\bis a benefit\b|\bassumed\b/i

/** Each language's own test: R and C need an unmistakable programming phrase around them. */
const LANGUAGE_RE: Record<Language, RegExp> = {
  Python: /\bPython\b/,
  R: /\b(?:in|using|with|base|language|package|software) R\b(?![&'])(?! [A-Z][a-z])|\bR (?:statistical|programming|language|software|package|Studio|Markdown)\b|\bRStudio\b|\bR\/Posit\b/,
  Java: /\bJava\b(?!\s*(?:Sea|island|nese))/,
  C: /\b(?:in|language|such as|programming in) C\b(?![+#&'])(?! [A-Z][a-z]| (?:major|minor|sharp|flat|grade)\b)|\bC (?:language|programming)\b/,
  'C++': /\bC\+\+/,
  JavaScript: /\bJavaScript\b/,
  SQL: /\bSQL\b/,
  MATLAB: /\bMATLAB\b|\bMatlab\b/,
}

/** Programming languages named in a programming context, in LANGUAGES order. */
export function extractLanguages(text: string): { value: Language[]; sentence: string } | undefined {
  const hits = new Map<Language, string>()
  for (const s of sentences(text)) {
    if (!PROGRAMMING.test(s) || BACKGROUND.test(s)) continue
    for (const lang of LANGUAGES) if (!hits.has(lang) && LANGUAGE_RE[lang].test(s)) hits.set(lang, s)
  }
  if (!hits.size) return undefined
  const value = LANGUAGES.filter((l) => hits.has(l))
  return { value, sentence: value.map((l) => `${l}: ${hits.get(l)}`).join(' | ') }
}

export function extractHandbookFacts(text: string): HandbookFacts {
  const facts: HandbookFacts = { evidence: {} }
  const a = extractAttendance(text)
  if (a) {
    facts.minAttendance = a.value
    facts.evidence.minAttendance = a.sentence
    if (a.appliesTo) facts.attendanceAppliesTo = a.appliesTo
  }
  const p = extractPrescribedTexts(text)
  if (p) ((facts.prescribedTexts = p.value), (facts.evidence.prescribedTexts = p.sentence))
  const e = extractExamBook(text)
  if (e) ((facts.examBook = e.value), (facts.evidence.examBook = e.sentence))
  const l = extractLanguages(text)
  if (l) ((facts.languages = l.value), (facts.evidence.languages = l.sentence))
  return facts
}
