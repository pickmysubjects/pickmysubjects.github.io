/**
 * Turns raw rating rows (one per form response) into per-subject aggregates.
 * Only numbers and counts leave this function — free text ("What I wish I knew")
 * and anything that could identify a person are never published.
 */

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
] as const

/** Answers an optional question needs before its average is published. */
export const MIN_ANSWERS = 3
/** Ratings a subject needs before anything about it is published (the privacy page promises 3). */
export const MIN_REVIEWS = 3
/** At most this many ratings per subject per day count, so a burst can't take over a subject. */
export const MAX_PER_SUBJECT_PER_DAY = 10

export const SKILL_IDS = [
  'programming',
  'algorithms',
  'maths',
  'statistics',
  'data',
  'systems',
  'writing',
  'presentation',
  'lab',
  'design',
  'business',
] as const

export interface SubjectAggregate {
  reviews: number
  /** Each average is null until at least MIN_ANSWERS people answered that question. */
  difficulty: number | null
  workload: number | null
  grading: number | null
  hoursMedian: number | null
  recommendRate: number | null
  /** Skills ticked by at least half the reviewers. */
  skills: string[]
  /** Optional 1–5 questions; null until at least MIN_ANSWERS people answered. */
  examDifficulty: number | null
  usefulness: number | null
  interest: number | null
  teaching: number | null
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

/**
 * `known` limits output to subjects in the dataset, so spam with made-up codes
 * can't bloat the published file. Grade bands are never published.
 */
export function aggregate(rows: Record<string, string>[], now = new Date(), known?: Set<string>): AggregateResult {
  const seen = new Set<string>()
  const perDay = new Map<string, number>()
  const bySubject = new Map<string, Record<string, string>[]>()
  let rejected = 0

  for (const row of rows) {
    const code = (row[COLUMNS.code] ?? '').toUpperCase().replace(/\s/g, '')
    // Every question is optional: a row counts if it's for a real subject and
    // answers at least one question. A year, when given, must be plausible.
    const yearText = row[COLUMNS.year] ?? ''
    const year = Number(yearText)
    const yearOk = yearText === '' || (Number.isInteger(year) && year >= 2010 && year <= now.getFullYear())
    const answered = ANSWER_COLUMNS.some((c) => (row[c] ?? '') !== '')
    const valid = /^[A-Z]{4}\d{5}$/.test(code) && yearOk && answered && (!known || known.has(code))
    // Identical answers submitted again (refresh, double click, simple spam) count once.
    const fingerprint = JSON.stringify(Object.entries(row).filter(([k]) => k !== COLUMNS.timestamp))
    // The date part of the form's timestamp ("2026/10/07 10:00:00" or "07/10/2026 …").
    const dayKey = `${code}|${(row[COLUMNS.timestamp] ?? '').split(/[ T]/)[0]}`
    if (!valid || seen.has(fingerprint) || (perDay.get(dayKey) ?? 0) >= MAX_PER_SUBJECT_PER_DAY) {
      rejected++
      continue
    }
    seen.add(fingerprint)
    perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1)
    bySubject.set(code, [...(bySubject.get(code) ?? []), row])
  }

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
    // Optional 1–5 answers: blanks and anything out of range are ignored.
    const optional = (c: string): number | null => {
      const xs = list.map((r) => Number(r[c])).filter((x) => Number.isInteger(x) && x >= 1 && x <= 5)
      return xs.length >= MIN_ANSWERS ? round(trimmedMean(xs)) : null
    }
    subjects[code] = {
      reviews: list.length,
      difficulty: optional(COLUMNS.difficulty),
      workload: optional(COLUMNS.workload),
      grading: optional(COLUMNS.generosity),
      hoursMedian: hours.length ? median(hours) : null,
      recommendRate: recs.length ? round(recs.filter((r) => r === 'Yes').length / recs.length) : null,
      skills: [...skillCounts].filter(([, n]) => n / list.length >= 0.5).map(([s]) => s).sort(),
      examDifficulty: optional(COLUMNS.examDifficulty),
      usefulness: optional(COLUMNS.usefulness),
      interest: optional(COLUMNS.interest),
      teaching: optional(COLUMNS.teaching),
    }
  }
  return { subjects, accepted: rows.length - rejected, rejected }
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
