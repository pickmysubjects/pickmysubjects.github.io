/**
 * Turns raw rating rows (one per form response) into per-subject aggregates.
 * Only numbers and counts leave this function — free text ("What I wish I knew")
 * and anything that could identify a person are never published.
 */
import { fitGrades } from '../../src/engine/gradeModel'
import type { FittedModel } from '../../src/engine/fitted'
import { SKILLS } from '../../src/engine/schema'
import { isRatingTag } from '../../src/engine/ratingTags'

/** Form question titles, exactly as created in the Google Form (see docs/ratings-setup.md). */
export const COLUMNS = {
  timestamp: 'Timestamp',
  code: 'Subject code',
  year: 'Year taken',
  semester: 'Semester taken',
  difficulty: 'Difficulty',
  workload: 'Workload',
  generosity: 'Marking generosity',
  hours: 'Hours per week',
  grade: 'Grade band',
  skills: 'Skills used',
  recommend: 'Would you recommend it',
  // Optional questions, added to the form later.
  examDifficulty: 'Exam difficulty',
  usefulness: 'Usefulness',
  interest: 'Interest',
  teaching: 'Teaching',
  overall: 'Overall',
  // Sent only with a grade band (rating form or the My page card); feeds grade-offsets.json.
  wamBand: 'WAM range without this subject',
  // Optional checkboxes; the choices are the tag ids in src/engine/ratingTags.ts.
  tags: 'Tags',
} as const

/** Questions whose answer makes a row count as a rating. */
const ANSWER_COLUMNS = [
  COLUMNS.difficulty,
  COLUMNS.workload,
  COLUMNS.generosity,
  COLUMNS.hours,
  COLUMNS.skills,
  COLUMNS.recommend,
  COLUMNS.examDifficulty,
  COLUMNS.usefulness,
  COLUMNS.interest,
  COLUMNS.teaching,
  COLUMNS.overall,
  COLUMNS.tags,
] as const

/** Answers an optional question needs before its average is published. */
export const MIN_ANSWERS = 3
/** Ratings a subject needs before anything about it is published (the privacy page promises 3). */
export const MIN_REVIEWS = 3
/** At most this many ratings per subject per day count, so a burst can't take over a subject. */
export const MAX_PER_SUBJECT_PER_DAY = 10

// Every skill the rating form offers, except the two read off the assessment (exams, teamwork).
export const SKILL_IDS = SKILLS.filter((s) => s !== 'exams' && s !== 'teamwork')

export interface SubjectAggregate {
  reviews: number
  /** Each average is null until at least MIN_ANSWERS people answered that question. */
  difficulty: number | null
  workload: number | null
  grading: number | null
  /** Median of the hours people reported; null until MIN_ANSWERS gave a usable number. */
  hoursMedian: number | null
  /** Share answering Yes among Yes/Maybe/No answers; null until MIN_ANSWERS answered. */
  recommendRate: number | null
  /** Skills ticked by at least half the reviewers. */
  skills: string[]
  /** Optional 1–5 questions; null until at least MIN_ANSWERS people answered. */
  examDifficulty: number | null
  usefulness: number | null
  interest: number | null
  teaching: number | null
  /** Overall 1–5 score, and how many gave one (the count rating markup needs). */
  overall: number | null
  overallCount: number
  /** How many reviewers ticked each tag (known tag ids only); left out when nobody ticked one. */
  tags?: Record<string, number>
}

export interface AggregateResult {
  subjects: Record<string, SubjectAggregate>
  accepted: number
  rejected: number
}

export function rowsToObjects(values: string[][]): Record<string, string>[] {
  const [header, ...rows] = values
  if (!header) return []
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

/** Subject codes as typed vary ("comp 10001"); everything downstream uses one form. */
export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, '')
}

/**
 * The anti-spam filter every published output goes through: a real subject code, a plausible
 * year (when given), at least one answer that path cares about (`answered`), at most
 * MAX_PER_SUBJECT_PER_DAY rows per subject per day, and identical resubmissions counted once.
 * Returned rows carry the normalised code, so "COMP10001" and "comp 10001" are one subject.
 */
export function screenRows(
  rows: Record<string, string>[],
  now: Date,
  known: Set<string> | undefined,
  answered: (row: Record<string, string>) => boolean,
): Record<string, string>[] {
  const seen = new Set<string>()
  const perDay = new Map<string, number>()
  const out: Record<string, string>[] = []
  for (const raw of rows) {
    const code = normaliseCode(raw[COLUMNS.code] ?? '')
    const row: Record<string, string> = { ...raw, [COLUMNS.code]: code }
    const yearText = row[COLUMNS.year] ?? ''
    const year = Number(yearText)
    const yearOk = yearText === '' || (Number.isInteger(year) && year >= 2010 && year <= now.getFullYear())
    const valid = /^[A-Z]{4}\d{5}$/.test(code) && yearOk && answered(row) && (!known || known.has(code))
    // Identical answers submitted again (refresh, double click, simple spam) count once.
    const fingerprint = JSON.stringify(Object.entries(row).filter(([k]) => k !== COLUMNS.timestamp))
    // The date part of the form's timestamp ("2026/10/07 10:00:00" or "07/10/2026 …").
    const dayKey = `${code}|${(row[COLUMNS.timestamp] ?? '').split(/[ T]/)[0]}`
    if (!valid || seen.has(fingerprint) || (perDay.get(dayKey) ?? 0) >= MAX_PER_SUBJECT_PER_DAY) continue
    seen.add(fingerprint)
    perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1)
    out.push(row)
  }
  return out
}

/** A row that answers at least one rating question. */
function rated(row: Record<string, string>): boolean {
  return ANSWER_COLUMNS.some((c) => (row[c] ?? '') !== '')
}

/** Rated subjects needed before the rating prior is estimated from the ratings. */
export const MIN_PRIOR_SUBJECTS = 30

/**
 * How many reviews the site-wide average should count as (RATING_PRIOR_REVIEWS in recommend.ts),
 * by normal–normal empirical Bayes: the spread of single ratings within a subject over the real
 * spread between subjects. Ease per rating is read as recommend.ts reads it (difficulty, workload
 * and generosity on 0–1). Undefined until MIN_PRIOR_SUBJECTS subjects have MIN_REVIEWS ratings.
 */
export function fitRatingPrior(kept: Record<string, string>[]): number | undefined {
  const one = (r: Record<string, string>, c: string) => {
    const x = Number(r[c])
    return Number.isInteger(x) && x >= 1 && x <= 5 ? x : undefined
  }
  const bySubject = new Map<string, number[]>()
  for (const r of kept) {
    const d = one(r, COLUMNS.difficulty)
    const w = one(r, COLUMNS.workload)
    const g = one(r, COLUMNS.generosity)
    const parts = [d === undefined ? undefined : 5 - d, w === undefined ? undefined : 5 - w, g === undefined ? undefined : g - 1].filter((x): x is number => x !== undefined)
    if (!parts.length) continue
    const code = r[COLUMNS.code] as string
    bySubject.set(code, [...(bySubject.get(code) ?? []), parts.reduce((a, b) => a + b, 0) / (4 * parts.length)])
  }
  const groups = [...bySubject.values()].filter((xs) => xs.length >= MIN_REVIEWS)
  if (groups.length < MIN_PRIOR_SUBJECTS) return undefined
  const means = groups.map((xs) => mean(xs))
  const within = groups.reduce((a, xs, i) => a + xs.reduce((b, x) => b + (x - means[i]!) ** 2, 0), 0) / groups.reduce((a, xs) => a + xs.length - 1, 0)
  const grand = mean(means)
  const spread = means.reduce((a, m) => a + (m - grand) ** 2, 0) / (means.length - 1)
  const between = Math.max(1e-4, spread - mean(groups.map((xs) => within / xs.length)))
  return Math.round(Math.max(0.25, Math.min(50, within / between)) * 10) / 10
}

/**
 * `known` limits output to subjects in the dataset, so spam with made-up codes
 * can't bloat the published file. Grade bands are never published.
 */
export function aggregate(rows: Record<string, string>[], now = new Date(), known?: Set<string>): AggregateResult {
  const bySubject = new Map<string, Record<string, string>[]>()

  const kept = screenRows(rows, now, known, rated)
  for (const row of kept) {
    const code = row[COLUMNS.code] as string
    bySubject.set(code, [...(bySubject.get(code) ?? []), row])
  }
  const rejected = rows.length - kept.length

  const subjects: Record<string, SubjectAggregate> = {}
  for (const [code, list] of [...bySubject].sort(([a], [b]) => a.localeCompare(b))) {
    // Below the threshold a published average would be one person's own answers.
    if (list.length < MIN_REVIEWS) continue
    const hours = list.map((r) => Number(r[COLUMNS.hours])).filter((h) => Number.isFinite(h) && h > 0 && h <= 60)
    const recs = list.map((r) => r[COLUMNS.recommend]).filter((r): r is string => r === 'Yes' || r === 'No' || r === 'Maybe')
    const skillCounts = new Map<string, number>()
    for (const r of list) {
      for (const s of (r[COLUMNS.skills] ?? '').split(',').map((x) => x.trim())) {
        if ((SKILL_IDS as readonly string[]).includes(s)) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)
      }
    }
    // Tags: each known id counts once per rating; anything else (an old or made-up choice) is dropped.
    const tagCounts = new Map<string, number>()
    for (const r of list) {
      for (const x of new Set((r[COLUMNS.tags] ?? '').split(',').map((y) => y.trim()))) {
        if (isRatingTag(x)) tagCounts.set(x, (tagCounts.get(x) ?? 0) + 1)
      }
    }
    // Optional 1–5 answers: blanks and anything out of range are ignored.
    const scores = (c: string): number[] => list.map((r) => Number(r[c])).filter((x) => Number.isInteger(x) && x >= 1 && x <= 5)
    const optional = (c: string): number | null => {
      const xs = scores(c)
      return xs.length >= MIN_ANSWERS ? round(trimmedMean(xs)) : null
    }
    subjects[code] = {
      reviews: list.length,
      difficulty: optional(COLUMNS.difficulty),
      workload: optional(COLUMNS.workload),
      grading: optional(COLUMNS.generosity),
      hoursMedian: hours.length >= MIN_ANSWERS ? median(hours) : null,
      recommendRate: recs.length >= MIN_ANSWERS ? round(recs.filter((r) => r === 'Yes').length / recs.length) : null,
      skills: [...skillCounts].filter(([, n]) => n / list.length >= 0.5).map(([s]) => s).sort(),
      examDifficulty: optional(COLUMNS.examDifficulty),
      usefulness: optional(COLUMNS.usefulness),
      interest: optional(COLUMNS.interest),
      teaching: optional(COLUMNS.teaching),
      overall: optional(COLUMNS.overall),
      overallCount: scores(COLUMNS.overall).length,
      ...(tagCounts.size ? { tags: Object.fromEntries([...tagCounts].sort(([a], [b]) => a.localeCompare(b))) } : {}),
    }
  }
  return { subjects, accepted: rows.length - rejected, rejected }
}

/**
 * Everything the daily job publishes, from the sheet's raw values: per-subject rating aggregates,
 * grade offsets from bands sent with a WAM range, and the model numbers fitted from both once
 * there is enough of each (only summary numbers, never rows). Free text ("What I wish I knew", app
 * language) never reaches either output. Pure, so it's tested without the sheet.
 */
export function buildRatingFiles(values: string[][], known?: Set<string>, now = new Date()) {
  const rows = rowsToObjects(values)
  const result = aggregate(rows, now, known)
  // A band can come alone (the My page card), so these rows skip the "answered a rating" rule,
  // but otherwise pass the same spam filter as ratings.
  const graded = screenRows(rows, now, known, (r) => (r[COLUMNS.grade] ?? '') !== '' && (r[COLUMNS.wamBand] ?? '') !== '').map((r) => ({
    code: r[COLUMNS.code] ?? '',
    band: r[COLUMNS.grade] ?? '',
    wamBand: r[COLUMNS.wamBand] ?? '',
    year: r[COLUMNS.year] ?? '',
  }))
  // Older bands count for less (see AGE_WEIGHT): assessment changes over the years. With enough
  // bands the grade model's own numbers are fitted from them (gradeModel.ts).
  const grades = fitGrades(graded, known, { year: now.getFullYear() })
  const model: FittedModel = {}
  if (grades.fitted) model.grade = { ...grades.model, rows: grades.rows }
  const ratingPrior = fitRatingPrior(screenRows(rows, now, known, rated))
  if (ratingPrior !== undefined) model.ratingPrior = ratingPrior
  return { ratings: result.subjects, offsets: grades.offsets, model, accepted: result.accepted, rejected: result.rejected }
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/**
 * Mean after dropping the highest and lowest ~20% (at least one each side once
 * there are 5+ ratings), so a few extreme or retaliatory ratings can't swing a
 * subject. Below 5 ratings it's a plain mean.
 */
export function trimmedMean(xs: number[]): number {
  if (xs.length < 5) return mean(xs)
  const cut = Math.max(1, Math.floor(xs.length * 0.2))
  return mean([...xs].sort((a, b) => a - b).slice(cut, xs.length - cut))
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

function round(x: number): number {
  return Math.round(x * 10) / 10
}
