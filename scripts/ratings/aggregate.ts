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

/** Answers an optional question needs before its average is published. */
export const MIN_ANSWERS = 3

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
  difficulty: number
  workload: number
  grading: number
  hoursMedian: number | null
  recommendRate: number | null
  /** Skills ticked by at least half the reviewers. */
  skills: string[]
  /** Grade bands reviewers chose to share, as counts. */
  grades: Record<string, number>
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

const GRADES = ['H1', 'H2A', 'H2B', 'H3', 'P', 'N']

export function rowsToObjects(values: string[][]): Record<string, string>[] {
  const [header, ...rows] = values
  if (!header) return []
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

export function aggregate(rows: Record<string, string>[], now = new Date()): AggregateResult {
  const seen = new Set<string>()
  const bySubject = new Map<string, Record<string, string>[]>()
  let rejected = 0

  for (const row of rows) {
    const code = (row[COLUMNS.code] ?? '').toUpperCase().replace(/\s/g, '')
    const year = Number(row[COLUMNS.year])
    const scores = [COLUMNS.difficulty, COLUMNS.workload, COLUMNS.generosity].map((c) => Number(row[c]))
    const valid =
      /^[A-Z]{4}\d{5}$/.test(code) &&
      Number.isInteger(year) &&
      year >= 2010 &&
      year <= now.getFullYear() &&
      scores.every((s) => Number.isInteger(s) && s >= 1 && s <= 5)
    // Identical answers submitted again (refresh, double click, simple spam) count once.
    const fingerprint = JSON.stringify(Object.entries(row).filter(([k]) => k !== COLUMNS.timestamp))
    if (!valid || seen.has(fingerprint)) {
      rejected++
      continue
    }
    seen.add(fingerprint)
    bySubject.set(code, [...(bySubject.get(code) ?? []), row])
  }

  const subjects: Record<string, SubjectAggregate> = {}
  for (const [code, list] of [...bySubject].sort(([a], [b]) => a.localeCompare(b))) {
    const num = (c: string) => list.map((r) => Number(r[c]))
    const hours = list.map((r) => Number(r[COLUMNS.hours])).filter((h) => Number.isFinite(h) && h > 0 && h <= 60)
    const recs = list.map((r) => r[COLUMNS.recommend]).filter((r): r is string => r === 'Yes' || r === 'No' || r === 'Maybe')
    const skillCounts = new Map<string, number>()
    for (const r of list) {
      for (const s of (r[COLUMNS.skills] ?? '').split(',').map((x) => x.trim())) {
        if ((SKILL_IDS as readonly string[]).includes(s)) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1)
      }
    }
    const grades: Record<string, number> = {}
    for (const r of list) {
      const g = r[COLUMNS.grade] ?? ''
      if (GRADES.includes(g)) grades[g] = (grades[g] ?? 0) + 1
    }
    // Optional 1–5 answers: blanks and anything out of range are ignored.
    const optional = (c: string): number | null => {
      const xs = list.map((r) => Number(r[c])).filter((x) => Number.isInteger(x) && x >= 1 && x <= 5)
      return xs.length >= MIN_ANSWERS ? round(trimmedMean(xs)) : null
    }
    subjects[code] = {
      reviews: list.length,
      difficulty: round(trimmedMean(num(COLUMNS.difficulty))),
      workload: round(trimmedMean(num(COLUMNS.workload))),
      grading: round(trimmedMean(num(COLUMNS.generosity))),
      hoursMedian: hours.length ? median(hours) : null,
      recommendRate: recs.length ? round(recs.filter((r) => r === 'Yes').length / recs.length) : null,
      skills: [...skillCounts].filter(([, n]) => n / list.length >= 0.5).map(([s]) => s).sort(),
      grades,
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
 * Mean after dropping the highest and lowest ~10% (at least one each side once
 * there are 5+ ratings), so a few extreme or retaliatory ratings can't swing a
 * subject. Below 5 ratings it's a plain mean.
 */
export function trimmedMean(xs: number[]): number {
  if (xs.length < 5) return mean(xs)
  const cut = Math.max(1, Math.floor(xs.length * 0.1))
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
