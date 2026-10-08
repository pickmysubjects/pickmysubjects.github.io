import { z } from 'zod'

/**
 * Data-file schemas. YAML files use snake_case keys; everything the engine and
 * UI consume is camelCase. These schemas are the single source of truth for
 * the shape of curated data.
 */

export const PERIODS = ['summer', 'semester-1', 'winter', 'semester-2'] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS: Record<Period, string> = {
  summer: 'Summer',
  'semester-1': 'Semester 1',
  winter: 'Winter',
  'semester-2': 'Semester 2',
}

/** Skills a subject leans on; students rate themselves on the same list. */
export const SKILLS = [
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
export type Skill = (typeof SKILLS)[number]

/** What a subject is about — the vocabulary students pick interests from. */
export const TOPICS = [
  'programming',
  'algorithms',
  'software-engineering',
  'ai',
  'machine-learning',
  'data-science',
  'databases',
  'security',
  'systems',
  'graphics',
  'theory',
  'mathematics',
  'calculus',
  'linear-algebra',
  'pure-maths',
  'probability',
  'statistics',
  'optimisation',
  'modelling',
  'economics',
  'finance',
  'accounting',
  'marketing',
  'law',
  'business',
  'languages',
  'biology',
  'chemistry',
  'physics',
  'earth-science',
  'environment',
  'psychology',
  'design',
  'ethics',
  'philosophy',
  'history',
  'science-communication',
] as const
export type Topic = (typeof TOPICS)[number]

/** Kinds of assessment task, as students think of them. */
export const ASSESSMENT_KINDS = [
  'exam',
  'test',
  'quiz',
  'assignment',
  'project',
  'report',
  'presentation',
  'participation',
] as const
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number]

const assessmentTask = z
  .object({
    kind: z.enum(ASSESSMENT_KINDS),
    weight: z.number().min(0).max(100),
    group: z.boolean().optional(), // done in a group, at least partly
    hurdle: z.boolean().optional(), // must be passed on its own to pass the subject
  })
  .strict()

// Links rendered from data: only https on the Handbook's own site (no javascript: or data: URLs).
const handbookUrl = z.url({ protocol: /^https$/, hostname: /^handbook\.unimelb\.edu\.au$/ })

const SUBJECT_CODE = /^[A-Z]{4}\d{5}$/
const subjectCode = z.string().regex(SUBJECT_CODE, 'expected a code like COMP10001')

/** Requirement expression used for prerequisites and corequisites. */
export type ReqExpr =
  | { subject: string }
  | { all: ReqExpr[] }
  | { any: ReqExpr[] }
  | { points: { min: number; level?: number; area?: string; from?: string[] } }
  | { admission: string; note?: string }
  | { manual: string }

/** `unknown` = not curated yet; `none` = verified to have no requirement. */
export type ReqField = 'unknown' | 'none' | ReqExpr

const reqExpr: z.ZodType<ReqExpr> = z.lazy(() =>
  z.union([
    // A bare subject code is shorthand for { subject: CODE }.
    subjectCode.transform((code) => ({ subject: code })),
    z.object({ subject: subjectCode }).strict(),
    z.object({ all: z.array(reqExpr).min(1) }).strict(),
    z.object({ any: z.array(reqExpr).min(1) }).strict(),
    z
      .object({
        points: z
          .object({
            min: z.number().positive(),
            level: z.number().int().min(1).max(9).optional(),
            area: z.string().optional(),
            from: z.array(subjectCode).optional(),
          })
          .strict(),
      })
      .strict(),
    z.object({ admission: z.string().min(1), note: z.string().optional() }).strict(),
    z.object({ manual: z.string().min(1) }).strict(),
  ]),
)

const reqField = z
  .union([z.literal('unknown'), z.literal('none'), reqExpr])
  .default('unknown') as z.ZodType<ReqField>

const offerings = z
  .union([
    z.literal('unknown'),
    // Keyed by year; YAML integer keys arrive as strings.
    z.record(z.string().regex(/^\d{4}$/), z.array(z.enum(PERIODS))),
  ])
  .default('unknown')

/** Aggregated crowd signals on a 1–5 scale. Only demo data carries these today. */
const signals = z
  .object({
    // Every question is optional for students, so each average may be missing.
    difficulty: z.number().min(1).max(5).optional(),
    workload: z.number().min(1).max(5).optional(),
    grading: z.number().min(1).max(5).optional(), // 5 = generous marking
    reviews: z.number().int().nonnegative(),
    // Optional questions; present once enough students answered them.
    examDifficulty: z.number().min(1).max(5).optional(),
    usefulness: z.number().min(1).max(5).optional(),
    interest: z.number().min(1).max(5).optional(),
    teaching: z.number().min(1).max(5).optional(),
    hours: z.number().positive().max(60).optional(), // median hours a week students report
  })
  .strict()

export const subjectFileSchema = z
  .object({
    code: subjectCode,
    title: z.string().min(1),
    level: z.number().int().min(1).max(9),
    points: z.number().positive(),
    area: z.string().optional(),
    offerings,
    prerequisites: reqField,
    corequisites: reqField,
    non_allowed: z.union([z.literal('unknown'), z.array(subjectCode)]).default('unknown'),
    categories: z.record(z.string(), z.enum(['science', 'breadth', 'discipline'])).default({}),
    skills: z.array(z.enum(SKILLS)).default([]),
    topics: z.array(z.enum(TOPICS)).default([]),
    // Semester version from the Handbook; weights add up to 100.
    assessment: z
      .array(assessmentTask)
      .min(1)
      .refine((tasks) => Math.abs(tasks.reduce((sum, t) => sum + t.weight, 0) - 100) < 0.01, 'weights must add up to 100')
      .optional(),
    weekly_contact_hours: z.number().positive().max(40).optional(),
    min_attendance: z.number().min(1).max(100).optional(), // % of classes you must attend
    signals: signals.optional(),
    handbook: handbookUrl.optional(),
    source_year: z.number().int(),
    verified_on: z.union([z.iso.date(), z.null()]).default(null),
    notes: z.string().optional(),
    // A subject the University stops running keeps its file (plans and records still name it):
    // the first year it no longer runs, and what students take instead, if anything.
    discontinued_from: z.number().int().optional(),
    replaced_by: z.array(subjectCode).default([]),
  })
  .strict()
  .transform((s) => ({
    code: s.code,
    title: s.title,
    level: s.level,
    points: s.points,
    area: s.area ?? s.code.slice(0, 4),
    offerings: s.offerings,
    prerequisites: s.prerequisites,
    corequisites: s.corequisites,
    nonAllowed: s.non_allowed,
    categories: s.categories,
    skills: s.skills,
    topics: s.topics,
    assessment: s.assessment,
    weeklyContactHours: s.weekly_contact_hours,
    minAttendance: s.min_attendance,
    signals: s.signals,
    handbook: s.handbook,
    sourceYear: s.source_year,
    verifiedOn: s.verified_on,
    notes: s.notes,
    discontinuedFrom: s.discontinued_from,
    replacedBy: s.replaced_by,
    // Filled in from data/<set>/discussions/ when there is one.
    discussion: undefined as DiscussionSummary | undefined,
  }))

export type Subject = z.output<typeof subjectFileSchema>

/**
 * A short summary of what students say about a subject on a public review site,
 * kept apart from our own ratings: no scores, never mixed into averages, always
 * linked to the source. Staff are never named.
 */
export const discussionFileSchema = z
  .object({
    code: subjectCode,
    source: z.literal('StudentVIP'),
    url: z.string().regex(/^https:\/\/studentvip\.com\.au\/unimelb\/subjects\/[a-z]{4}\d{5}$/),
    reviews: z.number().int().positive(), // how many reviews the summary is based on
    from: z.number().int(),
    to: z.number().int(),
    checked: z.iso.date(),
    points: z
      .array(z.object({ en: z.string().min(10).max(220), zh: z.string().min(4).max(120) }).strict())
      .min(1)
      .max(5),
  })
  .strict()

export type DiscussionSummary = z.output<typeof discussionFileSchema>
export type SubjectCategory = 'science' | 'breadth' | 'discipline'

const ruleBase = { id: z.string().min(1), description: z.string().min(1) }

const courseRule = z.discriminatedUnion('kind', [
  z
    .object({
      ...ruleBase,
      kind: z.literal('compulsory'),
      subjects: z.array(subjectCode).min(1),
      first_semester: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      ...ruleBase,
      kind: z.literal('points'),
      min: z.number().nonnegative().optional(),
      max: z.number().positive().optional(),
      level: z.number().int().optional(),
      category: z.string().optional(),
    })
    .strict(),
  z.object({ ...ruleBase, kind: z.literal('major'), count: z.number().int().positive() }).strict(),
  z
    .object({ ...ruleBase, kind: z.literal('specialisation'), max: z.number().int().nonnegative() })
    .strict(),
  z
    .object({
      ...ruleBase,
      kind: z.literal('level1-areas'),
      min_areas: z.number().int().positive(),
      max_points_per_area: z.number().positive(),
      category: z.string().optional(),
    })
    .strict(),
  z
    .object({
      ...ruleBase,
      kind: z.literal('progression'),
      before_level: z.number().int(),
      level: z.number().int(),
      min_points: z.number().positive(),
    })
    .strict(),
])

export const courseFileSchema = z
  .object({
    code: z.string().min(1),
    title: z.string().min(1),
    year: z.number().int(),
    total_points: z.number().positive(),
    standard_load: z.number().positive(),
    categories: z.array(z.string()).default([]),
    rules: z.array(courseRule),
    handbook: handbookUrl.optional(),
    verified_on: z.union([z.iso.date(), z.null()]).default(null),
  })
  .strict()
  .transform((c) => ({
    code: c.code,
    title: c.title,
    year: c.year,
    totalPoints: c.total_points,
    standardLoad: c.standard_load,
    categories: c.categories,
    rules: c.rules.map(camelRule),
    handbook: c.handbook,
    verifiedOn: c.verified_on,
  }))

function camelRule(r: z.output<typeof courseRule>): CourseRule {
  switch (r.kind) {
    case 'compulsory':
      return { id: r.id, description: r.description, kind: r.kind, subjects: r.subjects, firstSemester: r.first_semester }
    case 'points':
      return { id: r.id, description: r.description, kind: r.kind, min: r.min, max: r.max, level: r.level, category: r.category }
    case 'major':
      return { id: r.id, description: r.description, kind: r.kind, count: r.count }
    case 'specialisation':
      return { id: r.id, description: r.description, kind: r.kind, max: r.max }
    case 'level1-areas':
      return {
        id: r.id,
        description: r.description,
        kind: r.kind,
        minAreas: r.min_areas,
        maxPointsPerArea: r.max_points_per_area,
        category: r.category,
      }
    case 'progression':
      return {
        id: r.id,
        description: r.description,
        kind: r.kind,
        beforeLevel: r.before_level,
        level: r.level,
        minPoints: r.min_points,
      }
  }
}

export type CourseRule =
  | { id: string; description: string; kind: 'compulsory'; subjects: string[]; firstSemester: boolean }
  | { id: string; description: string; kind: 'points'; min?: number; max?: number; level?: number; category?: string }
  | { id: string; description: string; kind: 'major'; count: number }
  | { id: string; description: string; kind: 'specialisation'; max: number }
  | {
      id: string
      description: string
      kind: 'level1-areas'
      minAreas: number
      maxPointsPerArea: number
      category?: string
    }
  | { id: string; description: string; kind: 'progression'; beforeLevel: number; level: number; minPoints: number }

export type Course = z.output<typeof courseFileSchema>

const componentReq = z.union([
  z.object({ all: z.array(subjectCode).min(1) }).strict(),
  z.object({ choose: z.object({ points: z.number().positive(), from: z.array(subjectCode).min(1) }).strict() }).strict(),
])

export type ComponentReq = { all: string[] } | { choose: { points: number; from: string[] } }

export const componentFileSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    course: z.string().min(1),
    year: z.number().int(),
    kind: z.enum(['major', 'specialisation']),
    title: z.string().min(1),
    points: z.number().positive(),
    requires_major: z.array(z.string()).default([]),
    requirements: z.union([z.literal('unknown'), z.array(componentReq)]).default('unknown'),
    handbook: handbookUrl.optional(),
    verified_on: z.union([z.iso.date(), z.null()]).default(null),
  })
  .strict()
  .transform((c) => ({
    id: c.id,
    course: c.course,
    year: c.year,
    kind: c.kind,
    title: c.title,
    points: c.points,
    requiresMajor: c.requires_major,
    requirements: c.requirements as 'unknown' | ComponentReq[],
    handbook: c.handbook,
    verifiedOn: c.verified_on,
  }))

export type Component = z.output<typeof componentFileSchema>

export interface Dataset {
  name: 'real' | 'demo'
  generatedAt: string
  subjects: Record<string, Subject>
  courses: Course[]
  components: Component[]
  /** Semester-load cutoffs worked out when the data is built (see termStress). */
  stressCutoffs?: {
    typical: Record<'time' | 'effort' | 'stress', number>
    high: Record<'time' | 'effort' | 'stress', number>
    heavy: number
    veryHeavy: number
  }
}
