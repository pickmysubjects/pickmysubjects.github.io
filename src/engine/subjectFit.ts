import { periodsFor } from './availability'
import { easeVerdictLists, LIST_TOP, listPlace, rankable, rankSubject, type ListPlace, type RankDirection, type RankReason } from './easeRanking'
import type { Note } from './plan'
import { recommend, type Exclusion, type Profile, type Recommendation, type RecommendOptions } from './recommend'
import type { Dataset, Subject } from './schema'

/**
 * The subject page's "Is it hard? Is it right for me?" card, from the engine's existing parts
 * only: the easy and hard lists (easeRanking) for difficulty, and the same recommend() run as
 * Find subjects' "sort for me" for fit. Nothing here scores anything on its own.
 */

// ---------- difficulty ----------

export type DifficultyLevel = 'easier' | 'average' | 'harder' | 'unknown'
/** Why a subject isn't on its degree's lists at all (rankable() says no). */
export type Unranked = 'graduate' | 'passFail' | 'campus' | 'notRunning' | 'notInCourse'

export interface Difficulty {
  level: DifficultyLevel
  /** Its place on the easy or hard list for `course` (every place, not only the top), when it's on one. */
  place: ListPlace | null
  /** Up to three reasons for the verdict, strongest first ('firstYear' only when nothing else). */
  reasons: RankReason[]
  /** Nobody has reviewed or rated it: the verdict rests on Handbook facts alone. */
  factsOnly: boolean
  /** Left off the lists, and why; the verdict is then what the lists' own rules would say. */
  unranked?: Unranked
}

const MAX_DIFFICULTY_REASONS = 3

function unrankedWhy(s: Subject, course: string): Unranked {
  if (s.level > 3) return 'graduate'
  if (s.passFail) return 'passFail'
  if (s.campus) return 'campus'
  if (course && !s.categories[course]) return 'notInCourse'
  return 'notRunning'
}

const notFirstYear = (r: RankReason) => r.key !== 'firstYear'

/**
 * How hard a subject is, as the easy and hard lists for `course` in `year` see it. `subjects`
 * should be the course's view of the data (forCourse), as the list pages and the header chip use.
 * On the easy list: easier; on the hard list: harder; ranked but on neither: about average.
 * Nothing reviewed and no assessment recorded: not enough to say (never a guess).
 */
export function subjectDifficulty(subjects: Record<string, Subject>, code: string, course: string, year: number): Difficulty {
  const s = subjects[code]
  const unknown: Difficulty = { level: 'unknown', place: null, reasons: [], factsOnly: true }
  if (!s) return unknown
  const easy = rankSubject(s, 'easy')
  const hard = rankSubject(s, 'hard')
  if (!easy || !hard) return unknown
  const factsOnly = easy.reviews === null
  // Weekly hours alone (no assessment, no reviews) is too little to call it either way.
  if (factsOnly && !s.assessment) return unknown

  const pick = (rows: RankReason[]) => {
    const real = rows.filter(notFirstYear)
    return (real.length ? real : rows).slice(0, MAX_DIFFICULTY_REASONS)
  }
  const verdict = (direction: RankDirection | null): Pick<Difficulty, 'level' | 'reasons'> =>
    direction === 'easy'
      ? { level: 'easier', reasons: pick(easy.reasons) }
      : direction === 'hard'
        ? { level: 'harder', reasons: pick(hard.reasons) }
        : // On neither list: what pulls each way, the strongest of each first.
          { level: 'average', reasons: interleave(easy.reasons.filter(notFirstYear), hard.reasons.filter(notFirstYear)).slice(0, MAX_DIFFICULTY_REASONS) }

  if (!rankable(s, course, year)) {
    const lean = easeVerdictLists(easy, hard)
    return { ...verdict(lean), place: null, factsOnly, unranked: unrankedWhy(s, course) }
  }
  // Every place, so the verdict is exactly the lists' own (the header chip shows the top LIST_TOP).
  const place = listPlace(subjects, code, course, year, Infinity)
  return { ...verdict(place?.direction ?? null), place, factsOnly }
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]!)
    if (b[i]) out.push(b[i]!)
  }
  return out
}

/** Whether a list place is near enough the top for the subject page to call it out. */
export const nearTop = (p: ListPlace | null) => p !== null && p.place <= LIST_TOP

// ---------- fit for the student ----------

export type FitBand = 'great' | 'good' | 'ok'

/** The fit badge's words for a betterThan share: the same cut-offs everywhere it's shown. */
export function fitBand(betterThan: number): FitBand {
  return betterThan >= 90 ? 'great' : betterThan >= 60 ? 'good' : 'ok'
}

/** Has the student told us anything to sort by: marks, strengths or interests. */
export function hasFitProfile(p: Pick<Profile, 'results' | 'skills' | 'interests'>): boolean {
  return p.results.length > 0 || Object.keys(p.skills).length > 0 || p.interests.length > 0
}

/** Reasons a Find subjects row already shows as its own fact pills (exam share, class hours). */
export const SHOWN_AS_FACTS: ReadonlySet<string> = new Set(['noExam', 'smallExam', 'bigExam', 'fewHours', 'manyHours'])

/** The first reasons a suggestion suits the student, as a Find subjects row lists them. */
export function leadReasons(rec: Recommendation, n = 3): Note[] {
  return rec.reasons.filter((x) => !SHOWN_AS_FACTS.has(x.key)).slice(0, n)
}

/** Cautions the card adds beside recommend()'s own: closed to the degree, not running this year. */
export type FitCaution = { key: 'closed' } | { key: 'notThisYear'; year: number }

export type SubjectFit =
  | { kind: 'fit'; rec: Recommendation; band: FitBand; reasons: Note[]; cautions: FitCaution[] }
  | { kind: 'out'; why: Exclusion; cautions: FitCaution[] }
  /** Not in the data at all. */
  | { kind: 'missing' }

export interface FitContext {
  /** The year the page shows (its runs line), for "not running this year". */
  year: number
  /** recommend()'s list for this profile and these options, when the caller already has it. */
  recs?: Recommendation[]
  skipped?: Map<string, Exclusion>
}

/**
 * How `code` fits this student, read from the very list "sort for me" builds with the same
 * options, so the card and Find subjects always agree (same betterThan, band and first reasons).
 * Left out of that list: why, instead of a score.
 */
export function subjectFit(data: Dataset, profile: Profile, opts: RecommendOptions, code: string, ctx: FitContext): SubjectFit {
  const s = data.subjects[code]
  if (!s) return { kind: 'missing' }
  let recs = ctx.recs
  let skipped = ctx.skipped
  if (!recs || !skipped) {
    skipped = new Map()
    recs = recommend(data, profile, { ...opts, skipped })
  }
  const cautions: FitCaution[] = []
  if (opts.course && data.courses.some((c) => c.code === opts.course && c.closed.includes(code))) cautions.push({ key: 'closed' })
  if (s.offerings !== 'unknown' && periodsFor(s, ctx.year).length === 0) cautions.push({ key: 'notThisYear', year: ctx.year })
  const rec = recs.find((r) => r.code === code)
  if (rec) return { kind: 'fit', rec, band: fitBand(rec.betterThan), reasons: leadReasons(rec), cautions }
  return { kind: 'out', why: skipped.get(code) ?? { key: 'filtered' }, cautions }
}
