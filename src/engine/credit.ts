import type { Dataset, Subject } from './schema'

/**
 * Credit (advanced standing) the University granted for study elsewhere — TAFE, another
 * university, Trinity College Foundation — without naming a Melbourne subject ("unspecified" or
 * "general" credit): only points, a level and maybe a category. Credit for a named subject
 * ("specified" credit) is a subject row on the record with `credit: true` and no mark.
 * Credit counts towards points, level and category rules like a passed subject; it never counts
 * in the WAM (it has no mark), and it has no discipline area of its own.
 */
export interface Credit {
  points: number
  level: 1 | 2 | 3
  /** One of the course's subject categories ("science", "breadth"…); missing: not known. */
  category?: string
  /** The student's own name for it ("TAFE Diploma"). */
  label?: string
}

/** Most points one credit line can hold (a whole year, twice over). */
export const CREDIT_MAX_POINTS = 200
/** What the plan builder and course rules see credit as: stand-in subjects with these codes. */
const CREDIT_PREFIX = 'CREDIT-'
/** The area of a stand-in subject: none a real subject has, so area rules leave it alone. */
export const CREDIT_AREA = '(credit)'

export const isCreditCode = (code: string): boolean => code.startsWith(CREDIT_PREFIX)

/** Stand-in codes for the credit lines, one each, in order. */
export function creditCodes(credit: readonly Credit[] | undefined): string[] {
  return (credit ?? []).map((_, i) => `${CREDIT_PREFIX}${i + 1}`)
}

/** Points of credit, optionally only at one level. */
export function creditPoints(credit: readonly Credit[] | undefined, level?: number): number {
  return (credit ?? []).filter((c) => level === undefined || c.level === level).reduce((sum, c) => sum + c.points, 0)
}

function standIn(code: string, c: Credit, course: string): Subject {
  return {
    code,
    title: c.label || 'Credit',
    level: c.level,
    points: c.points,
    area: CREDIT_AREA,
    offerings: {},
    yearLong: false,
    breadthOfferings: undefined,
    breadthFor: undefined,
    recommended: [],
    prerequisites: 'none',
    corequisites: 'none',
    nonAllowed: [],
    categories: c.category ? { [course]: c.category as Subject['categories'][string] } : {},
    skills: [],
    topics: [],
    assessment: undefined,
    weeklyContactHours: undefined,
    passFail: false,
    minAttendance: undefined,
    signals: undefined,
    handbook: undefined,
    sourceYear: 0,
    verifiedOn: null,
    notes: undefined,
    discontinuedFrom: undefined,
    campus: undefined,
    replacedBy: [],
    discussions: undefined,
    comments: undefined,
    studentFacts: undefined,
    gradeOffset: undefined,
    about: undefined,
    titles: undefined,
  } as Subject
}

const cache = new WeakMap<Dataset, Map<string, Dataset>>()

/**
 * The dataset with the credit lines as stand-in subjects (codes from creditCodes), for the
 * course rules and the plan builder: they then count credit like any completed subject. The same
 * credit gives back the same dataset, so caches keyed on it keep working.
 */
export function withCredit(data: Dataset, credit: readonly Credit[] | undefined, course: string): Dataset {
  if (!credit?.length) return data
  const key = `${course}|${JSON.stringify(credit)}`
  const byKey = cache.get(data) ?? new Map<string, Dataset>()
  cache.set(data, byKey)
  const hit = byKey.get(key)
  if (hit) return hit
  const codes = creditCodes(credit)
  const subjects = { ...data.subjects }
  credit.forEach((c, i) => {
    subjects[codes[i]!] = standIn(codes[i]!, c, course)
  })
  const view = { ...data, subjects }
  byKey.set(key, view)
  return view
}
