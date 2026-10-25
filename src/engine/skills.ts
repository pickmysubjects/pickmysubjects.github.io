import type { Dataset, ReqExpr, ReqField, Skill, Subject } from './schema'

/**
 * What a subject leans on, for judging a semester's load and keeping a student's weak
 * spots apart. Hand-tagged skills win; for the rest they're worked out from what the data
 * does say: the area, the title, the assessment, and the subjects it requires.
 *
 * Checked blind against the 179 hand-tagged subjects: precision / recall about 93/82 for
 * maths, 79/79 programming, 94/67 statistics, 89/53 writing, 83/58 lab (the area code alone
 * found almost no statistics, writing or lab). Every curated subject is hand-tagged now, so
 * this guess is only for subjects not curated yet.
 */

const MATHS_AREAS = new Set(['MAST', 'PHYC', 'ACTL', 'ELEN', 'MCEN', 'CVEN', 'CHEN', 'BMEN', 'ENGR'])
const PROGRAMMING_AREAS = new Set(['COMP', 'SWEN', 'INFO'])
// The Faculty of Business and Economics' areas, and business law.
const BUSINESS_AREAS = new Set(['ACCT', 'ACTL', 'BUSA', 'CMCE', 'ECOM', 'ECON', 'FNCE', 'MGMT', 'MKTG', 'BLAW'])
// Wet labs, plus the engineering labs and the field-and-lab earth sciences.
const LAB_AREAS = new Set(['CHEM', 'BCMB', 'MIIM', 'PATH', 'BIOL', 'GENE', 'ZOOL', 'BOTA', 'ANAT', 'PHRM', 'BTCH', 'PHYS', 'NEUR', 'FOOD', 'ANSC', 'VETS', 'AGRI', 'ERTH', 'ELEN', 'BMEN', 'CEDB'])

// Language programs; a numbered title ("Spanish 3") is a language-practice level.
const LANGUAGE_AREAS = new Set(['ARBC', 'CHIN', 'FREN', 'GERM', 'HEBR', 'INDO', 'ITAL', 'JAPN', 'KORE', 'RUSS', 'SPAN'])

// Music subjects that train musicianship (playing, singing, hearing and reading music, writing
// it down) rather than writing about it.
const MUSICIANSHIP_TITLE =
  /performance|ensemble|aural|musicianship|theory|harmony|counterpoint|composition|composing|conduct|orchestra|choir|choral|keyboard|piano|voice|vocal|instrument|improvis|practical|studio|techniques?\b|arranging|orchestration|songwrit|repertoire|chamber|recital|band\b|jazz/i

const TITLE: Partial<Record<Skill, RegExp>> = {
  fieldwork: /\bfield\b|field class|excursion/i,
  maths:
    /calculus|algebra|mathemat|differential|real analysis|complex analysis|vector|geometry|number theory|topolog|optimi[sz]ation|mechanics|quantum|electromagnet|microeconomics|finance|financial decision|econometric/i,
  statistics:
    /statistic|probabilit|stochastic|inference|regression|econometric|data analysis|biostat|actuarial|research methods|quantitative|machine learning|data processing/i,
  programming: /programming|computing|software|algorithm|data structure|machine learning|computational|database|web |coding|data science/i,
  // Whole words: "culture" must not match Agriculture or Horticulture.
  writing: /\b(writing|essays?|communication|law|history|philosophy|marketing|macroeconomic|accounting reports|society|ethics|cultures?)\b/i,
}
const UX_TITLE = /\bdesign\b|\buser\b|usability|interaction|experience/i
const STATS_TITLE = /statistic|probabilit|stochastic|inference/i
/** Skills that carry over from a required subject (you can't do the follow-on without them). */
const INHERITED: Skill[] = ['maths', 'statistics']

/** Subjects every way of meeting the requirement includes (an "or" only counts what all branches share). */
function required(field: ReqField): string[] {
  if (field === 'none' || field === 'unknown') return []
  const walk = (e: ReqExpr): string[] =>
    'subject' in e
      ? [e.subject]
      : 'all' in e
        ? e.all.flatMap(walk)
        : 'any' in e && e.any.length
          ? e.any.map(walk).reduce((a, b) => a.filter((x) => b.includes(x)))
          : []
  return walk(field)
}

function inferred(s: Subject, data: Dataset | undefined): Skill[] {
  const area = s.area ?? s.code.slice(0, 4)
  const out = new Set<Skill>()
  // Entry by the coordinator's permission alone marks a research project: what it takes depends
  // on the project, so the area says nothing about it (its written work still counts below).
  const projectOnly = typeof s.prerequisites === 'object' && 'permission' in s.prerequisites
  if (MATHS_AREAS.has(area) && !projectOnly && !(area === 'MAST' && STATS_TITLE.test(s.title))) out.add('maths')
  if (area === 'MAST' && STATS_TITLE.test(s.title)) out.add('maths').add('statistics')
  // Information systems' user-experience subjects (interaction design, usability) aren't programming.
  if (PROGRAMMING_AREAS.has(area) && !(area === 'INFO' && UX_TITLE.test(s.title))) out.add('programming')
  if (BUSINESS_AREAS.has(area)) out.add('business')
  if (LANGUAGE_AREAS.has(area) && /\b\d+$/.test(s.title)) out.add('languages')
  if (area === 'MUSI' && MUSICIANSHIP_TITLE.test(s.title)) out.add('music')
  // Econometrics is applied statistics.
  if (area === 'ECOM') out.add('maths').add('statistics')
  // Finance is built on financial maths, and economics past first year on mathematical models:
  // the quantitative side of commerce, as opposed to its written and case-based side.
  if (area === 'FNCE' || (area === 'ECON' && s.level >= 2)) out.add('maths')
  for (const [skill, rx] of Object.entries(TITLE) as [Skill, RegExp][]) if (rx.test(s.title)) out.add(skill)
  const tasks = s.assessment ?? []
  // Reports (talks at half weight) worth a fifth of the mark: written work is a real part of it.
  // In a lab or field subject, reports are mostly write-ups of practical work, so it takes more.
  const written = tasks.reduce((a, t) => a + (t.kind === 'report' ? t.weight : t.kind === 'presentation' ? t.weight * 0.5 : 0), 0)
  if (written >= (LAB_AREAS.has(area) ? 60 : 20)) out.add('writing')
  // A field subject's practical work is outdoors, not in a lab.
  if (LAB_AREAS.has(area) && !out.has('fieldwork') && (tasks.some((t) => t.kind === 'report') || (s.weeklyContactHours ?? 0) >= 5)) out.add('lab')
  for (const code of data ? required(s.prerequisites) : []) {
    const before = data?.subjects[code]
    // One step back only, from hand tags or the area: a long chain of guesses drifts.
    const theirs = before ? (before.skills.length ? before.skills : areaOnly(before)) : []
    for (const k of theirs) if (INHERITED.includes(k)) out.add(k)
  }
  return [...out]
}

function areaOnly(s: Subject): Skill[] {
  const area = s.area ?? s.code.slice(0, 4)
  return [...(MATHS_AREAS.has(area) ? (['maths'] as Skill[]) : []), ...(PROGRAMMING_AREAS.has(area) ? (['programming'] as Skill[]) : [])]
}

const CACHE = new WeakMap<Subject, Skill[]>()

export function skillsOf(s: Subject, data?: Dataset): Skill[] {
  const hit = data ? CACHE.get(s) : undefined
  if (hit) return hit
  const out = [...(s.skills.length ? s.skills : inferred(s, data)), ...markedBy(s)]
  if (data) CACHE.set(s, out)
  return out
}

/** Skills read off the assessment rather than the subject matter. */
export const MARKING_SKILLS: readonly Skill[] = ['exams', 'teamwork']

/** Final exams worth half the mark or more, and group work worth a fifth or more. */
const EXAM_SHARE = 50
const GROUP_SHARE = 20

/** How much of the mark a marking skill covers: exams' share, or group work's share (0–100). */
export function markingShare(s: Subject, k: Skill): number {
  const tasks = s.assessment ?? []
  const pick = k === 'exams' ? (t: (typeof tasks)[number]) => t.kind === 'exam' : k === 'teamwork' ? (t: (typeof tasks)[number]) => t.group === true : () => false
  return Math.round(tasks.filter(pick).reduce((a, t) => a + t.weight, 0))
}

/** What the way a subject is marked asks of you, from its assessment. */
function markedBy(s: Subject): Skill[] {
  const out: Skill[] = []
  if (markingShare(s, 'exams') >= EXAM_SHARE) out.push('exams')
  if (markingShare(s, 'teamwork') >= GROUP_SHARE) out.push('teamwork')
  return out
}

/**
 * A usual mark below this in a skill's subjects is a weak spot: the semester check reads it so
 * (termStress, from two or more marks), and My page's suggested level calls it "Weak" or below.
 */
export const WEAK_MARK = 65

/**
 * A level (1–5) from a usual mark, on the same bands My record shows (UniMelb grades). Level 3
 * ("OK") starts at WEAK_MARK, so the level a student is offered and the semester check agree on
 * what counts as weak.
 */
export function levelFromMark(mark: number): number {
  return mark >= 80 ? 5 : mark >= 75 ? 4 : mark >= WEAK_MARK ? 3 : mark >= 60 ? 2 : 1
}

/**
 * What the student's own marks say about each skill: the average mark in subjects that use it
 * (a retake counts as the average of its attempts; pass/fail subjects have no mark), with two or
 * more marked subjects. Offered as a suggestion only: rewriting the self-rating from marks made
 * the mark predictions worse when tested.
 */
export function skillsFromMarks(
  results: { code: string; mark?: number }[],
  data: Dataset,
): Partial<Record<Skill, { level: number; avg: number; codes: string[] }>> {
  const attempts = new Map<string, number[]>()
  for (const r of results) if (r.mark !== undefined && data.subjects[r.code] && !data.subjects[r.code]!.passFail) attempts.set(r.code, [...(attempts.get(r.code) ?? []), r.mark])
  const bySkill = new Map<Skill, { code: string; mark: number }[]>()
  for (const [code, ms] of attempts) {
    const mark = ms.reduce((a, b) => a + b, 0) / ms.length
    for (const k of skillsOf(data.subjects[code]!, data)) bySkill.set(k, [...(bySkill.get(k) ?? []), { code, mark }])
  }
  const out: Partial<Record<Skill, { level: number; avg: number; codes: string[] }>> = {}
  for (const [k, xs] of bySkill) {
    if (xs.length < 2) continue
    const avg = Math.round(xs.reduce((a, x) => a + x.mark, 0) / xs.length)
    out[k] = { level: levelFromMark(avg), avg, codes: xs.map((x) => x.code) }
  }
  return out
}
