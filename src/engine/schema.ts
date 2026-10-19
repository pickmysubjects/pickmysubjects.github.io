import type { GradeOffset } from './grades'
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
  'languages',
  'lab',
  'fieldwork',
  'design',
  'business',
  // Read off the assessment, never tagged by hand: how a subject is marked suits some students.
  'exams',
  'teamwork',
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
  'management',
  'human-resources',
  'supply-chain',
  'entrepreneurship',
  'actuarial',
  'languages',
  'biology',
  'chemistry',
  'physics',
  'earth-science',
  'geography',
  'environment',
  'ecology',
  'engineering',
  'health',
  'agriculture',
  'psychology',
  'design',
  'ethics',
  'philosophy',
  'history',
  'science-communication',
  'politics',
  'society',
  'literature',
  'media',
  'art',
  'indigenous-studies',
  'architecture',
  'urban-planning',
  'property',
  'construction',
  'visual-communication',
  'performance',
  'film-and-screen',
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
  /** `concurrent`: may be taken in the same term as the subject that needs it. */
  | { subject: string; concurrent?: boolean }
  | { all: ReqExpr[] }
  | { any: ReqExpr[] }
  | { points: { min: number; level?: number; area?: string; levels?: number[]; areas?: string[]; from?: string[]; concurrent?: boolean } }
  | { admission: string; note?: string }
  /** Average mark (0–100) over the completed subjects of these levels / areas / codes. */
  | { average: { min: number; levels?: number[]; areas?: string[]; from?: string[] }; note?: string }
  /** Weighted average mark over everything completed. */
  | { wam: { min: number }; note?: string }
  // Conditions we can't check from a student's record. They evaluate like a free-text condition
  // (never blocking), but say plainly what the student has to do.
  /** A placement or competency test: a language name ("French"), "language" or "programming". */
  | { placement: string; note?: string }
  /** The coordinator's permission, or a place won through an application / selection. */
  | { permission: 'coordinator' | 'application'; note?: string }
  /** A school (VCE) result: a study score of at least `minScore`, or just having done it. */
  | { school: { subject: string; minScore?: number }; note?: string }
  | { manual: string }

/** Kinds of condition only the student can vouch for (see ReqExpr). */
export type AdvisoryKind = 'placement' | 'permission' | 'school'

/** `unknown` = not curated yet; `none` = verified to have no requirement. */
export type ReqField = 'unknown' | 'none' | ReqExpr

const reqExpr: z.ZodType<ReqExpr> = z.lazy(() =>
  z.union([
    // A bare subject code is shorthand for { subject: CODE }.
    subjectCode.transform((code) => ({ subject: code })),
    z.object({ subject: subjectCode, concurrent: z.boolean().optional() }).strict(),
    z.object({ all: z.array(reqExpr).min(1) }).strict(),
    z.object({ any: z.array(reqExpr).min(1) }).strict(),
    z
      .object({
        points: z
          .object({
            min: z.number().positive(),
            level: z.number().int().min(1).max(9).optional(),
            area: z.string().optional(),
            // Any of these levels / code prefixes ("Level 1 or 2 Geography or Chemistry").
            levels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
            areas: z.array(z.string().regex(/^[A-Z]{4}$/)).min(1).optional(),
            from: z.array(subjectCode).optional(),
            // May be taken in the same term as the subject that needs it.
            concurrent: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    z.object({ admission: z.string().min(1), note: z.string().optional() }).strict(),
    z
      .object({
        average: z
          .object({
            min: z.number().min(0).max(100),
            levels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
            areas: z.array(z.string().regex(/^[A-Z]{4}$/)).min(1).optional(),
            from: z.array(subjectCode).min(1).optional(),
          })
          .strict(),
        note: z.string().optional(),
      })
      .strict(),
    z.object({ wam: z.object({ min: z.number().min(0).max(100) }).strict(), note: z.string().optional() }).strict(),
    z.object({ placement: z.string().min(1), note: z.string().optional() }).strict(),
    z.object({ permission: z.enum(['coordinator', 'application']), note: z.string().optional() }).strict(),
    z
      .object({
        school: z.object({ subject: z.string().min(1), minScore: z.number().int().min(1).max(50).optional() }).strict(),
        note: z.string().optional(),
      })
      .strict(),
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

/** Aggregated crowd signals on a 1–5 scale. */
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
    recommend: z.number().min(0).max(1).optional(), // share who would recommend it
    overall: z.number().min(1).max(5).optional(),
    overallCount: z.number().int().nonnegative().optional(), // how many gave an overall score
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
    // Where breadth students may only enrol in some of the periods (ECON10004: not semester 1),
    // those periods; used whenever the subject counts as breadth for the student's course.
    // Course titles the Handbook lists as able to take it as breadth ([] = none); absent when unknown.
    breadth_for: z.array(z.string().min(1)).optional(),
    // Subjects the Handbook recommends having done first (background knowledge, not a requirement).
    recommended: z.array(subjectCode).default([]),
    breadth_offerings: z.record(z.string().regex(/^\d{4}$/), z.array(z.enum(PERIODS))).optional(),
    prerequisites: reqField,
    corequisites: reqField,
    non_allowed: z.union([z.literal('unknown'), z.array(subjectCode)]).default('unknown'),
    categories: z.record(z.string(), z.enum(['science', 'commerce', 'arts', 'design', 'breadth', 'core'])).default({}),
    skills: z.array(z.enum(SKILLS)).default([]),
    topics: z.array(z.enum(TOPICS)).default([]),
    // Semester version from the Handbook; weights add up to 100.
    assessment: z
      .array(assessmentTask)
      .min(1)
      .refine((tasks) => Math.abs(tasks.reduce((sum, t) => sum + t.weight, 0) - 100) < 0.01, 'weights must add up to 100')
      .optional(),
    weekly_contact_hours: z.number().positive().max(40).optional(),
    // Marked pass/fail only: no mark, and it doesn't count in the WAM.
    pass_fail: z.boolean().optional(),
    min_attendance: z.number().min(1).max(100).optional(), // % of classes you must attend
    signals: signals.optional(),
    handbook: handbookUrl.optional(),
    source_year: z.number().int(),
    verified_on: z.union([z.iso.date(), z.null()]).default(null),
    notes: z.string().optional(),
    // A subject the University stops running keeps its file (plans and records still name it):
    // the first year it no longer runs, and what students take instead, if anything.
    discontinued_from: z.number().int().optional(),
    // Taught only at a campus far from Parkville (e.g. "Dookie"): not suggested unless the student's major needs it.
    campus: z.string().optional(),
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
    breadthOfferings: s.breadth_offerings,
    breadthFor: s.breadth_for,
    recommended: s.recommended,
    prerequisites: s.prerequisites,
    corequisites: s.corequisites,
    nonAllowed: s.non_allowed,
    categories: s.categories,
    skills: s.skills,
    topics: s.topics,
    assessment: s.assessment,
    weeklyContactHours: s.weekly_contact_hours,
    passFail: s.pass_fail === true,
    minAttendance: s.min_attendance,
    signals: s.signals,
    handbook: s.handbook,
    sourceYear: s.source_year,
    verifiedOn: s.verified_on,
    notes: s.notes,
    discontinuedFrom: s.discontinued_from,
    campus: s.campus,
    replacedBy: s.replaced_by,
    // Filled in from data/<set>/discussions/ (StudentVIP) and discussions/reddit/, in DISCUSSION_SOURCES order.
    discussions: undefined as DiscussionSummary[] | undefined,
    // How its grades sit against sharers' WAMs (scripts/ratings → grade-offsets.json), once 5+ shared.
    gradeOffset: undefined as GradeOffset | undefined,
    // Filled in from data/<set>/about/ when there is one.
    about: undefined as SubjectAbout | undefined,
    // Filled in from data/<set>/subject-titles.yaml: the title in Chinese, for Chinese readers.
    titles: undefined as SubjectTitles | undefined,
  }))

export type Subject = z.output<typeof subjectFileSchema>

/** Our own translation of a subject's title, so Chinese readers can recognise and search for it. */
const subjectTitles = z.object({ zh: z.string().min(1).max(40), 'zh-TW': z.string().min(1).max(40).optional() }).strict()
export type SubjectTitles = z.output<typeof subjectTitles>
export const subjectTitlesFileSchema = z.record(subjectCode, subjectTitles)

/**
 * One piece of our own wording in every language the site has: English and Chinese written
 * together, the others translated from the English (left out until they are).
 */
const OTHER_LANGS = ['zh-TW', 'ja', 'ko', 'vi', 'ms', 'id', 'hi'] as const
const localized = (en: number, zh: number) =>
  z
    .object({
      en: z.string().min(10).max(en),
      zh: z.string().min(4).max(zh),
      ...Object.fromEntries(OTHER_LANGS.map((l) => [l, z.string().min(2).max(Math.round(en * 1.8)).optional()])),
    })
    .strict() as z.ZodType<Localized>
export type Localized = { en: string; zh: string } & Partial<Record<(typeof OTHER_LANGS)[number], string>>
const enZh = localized

/**
 * A short summary of what students say about a subject in one public place (StudentVIP reviews,
 * r/unimelb threads), kept apart from our own ratings: no scores, never mixed into averages,
 * always linked to the source. Staff are never named. A subject can have one per source.
 */
const discussionBase = {
  code: subjectCode,
  from: z.number().int(),
  to: z.number().int(),
  checked: z.iso.date(),
  points: z.array(localized(220, 120)).min(1).max(5),
  // What the summary's own points say about the work and the difficulty, read off them so the
  // semester check can use it before our own ratings come in. Left out when they don't say.
  // When older and newer posts disagree, the newest decide: subjects change.
  workload: z.enum(['light', 'heavy', 'mixed']).optional(),
  difficulty: z.enum(['easy', 'hard', 'mixed']).optional(),
}
export const discussionFileSchema = z.discriminatedUnion('source', [
  z
    .object({
      source: z.literal('StudentVIP'),
      url: z.string().regex(/^https:\/\/studentvip\.com\.au\/unimelb\/subjects\/[a-z]{4}\d{5}$/),
      reviews: z.number().int().positive(), // how many reviews the summary is based on
      ...discussionBase,
    })
    .strict(),
  z
    .object({
      source: z.literal('Reddit'),
      // An r/unimelb search or thread.
      url: z.string().regex(/^https:\/\/www\.reddit\.com\/r\/unimelb\/\S+$/),
      threads: z.number().int().positive(), // how many distinct threads the summary is based on
      ...discussionBase,
    })
    .strict(),
])

export type DiscussionSummary = z.output<typeof discussionFileSchema>

/** Sources in the order a subject lists them. */
export const DISCUSSION_SOURCES = ['StudentVIP', 'Reddit'] as const

/** How many reviews (StudentVIP) or threads (Reddit) a summary is based on. */
export function discussionCount(d: DiscussionSummary): number {
  return d.source === 'StudentVIP' ? d.reviews : d.threads
}

/**
 * What a subject's summaries say together about its difficulty or workload. The rule: only
 * sources that give a verdict count; if they all give the same one, that is the verdict; if
 * they disagree (say StudentVIP "mixed", Reddit "hard"), there is none, since we can't tell
 * which is right. `n` adds up the reviews/threads behind the agreeing sources.
 */
export function discussionVerdict<K extends 'difficulty' | 'workload'>(
  list: readonly DiscussionSummary[] | undefined,
  field: K,
): { value: NonNullable<DiscussionSummary[K]>; n: number } | undefined {
  const said = (list ?? []).filter((d) => d[field] !== undefined)
  const value = said[0]?.[field]
  if (value === undefined || said.some((d) => d[field] !== value)) return undefined
  return { value: value as NonNullable<DiscussionSummary[K]>, n: said.reduce((a, d) => a + discussionCount(d), 0) }
}

/**
 * What a subject is about, in a sentence, and what you can do after it: our own short
 * wording of the Handbook's overview and learning outcomes, so a student gets the gist
 * without the Handbook's length. English and Chinese; other languages show the English.
 */

export const aboutFileSchema = z
  .object({
    code: subjectCode,
    learn: enZh(140, 50),
    outcomes: z.array(enZh(80, 30)).min(1).max(3),
    // The Handbook year the wording follows.
    year: z.number().int(),
  })
  .strict()

export type SubjectAbout = z.output<typeof aboutFileSchema>
// 'core': counts towards the course total only, in none of its category rules (B-SCI's SCIE10005).
export type SubjectCategory = 'science' | 'commerce' | 'arts' | 'design' | 'breadth' | 'core'

const componentReq = z.union([
  z.object({ all: z.array(subjectCode).min(1) }).strict(),
  z.object({ choose: z.object({ points: z.number().positive(), from: z.array(subjectCode).min(1) }).strict() }).strict(),
])

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
  z
    .object({
      ...ruleBase,
      kind: z.literal('major'),
      count: z.number().int().positive(),
      // Most majors a student may complete (B-ARTS: "between one and two"); defaults to `count`.
      max: z.number().int().positive().optional(),
      // A subject counts towards one major or minor only: for every pair (true), or only for
      // these pairs of component ids (B-COM: Management and Marketing share their capstones).
      no_double_count: z.union([z.boolean(), z.array(z.tuple([z.string(), z.string()]))]).default(false),
    })
    .strict(),
  z
    .object({ ...ruleBase, kind: z.literal('specialisation'), max: z.number().int().nonnegative() })
    .strict(),
  // Optional minors: at most `max` of them (B-ARTS: one). `informal`: this course's picks of this
  // kind are informal specialisations (B-DES), which a plan holds the same way as a minor.
  z.object({ ...ruleBase, kind: z.literal('minor'), max: z.number().int().nonnegative(), informal: z.boolean().default(false) }).strict(),
  z
    .object({
      ...ruleBase,
      kind: z.literal('level1-areas'),
      min_areas: z.number().int().positive(),
      max_points_per_area: z.number().positive(),
      category: z.string().optional(),
    })
    .strict(),
  // At most `max` points from any one discipline (a subject's area, its code prefix), across
  // all levels. An exception lifts it for a combination of components the Handbook allows: the
  // subjects of the last listed component then don't count (Geography major + Environmental
  // Studies minor in B-ARTS).
  z
    .object({
      ...ruleBase,
      kind: z.literal('area-cap'),
      max: z.number().positive(),
      category: z.string().optional(),
      exceptions: z.array(z.object({ components: z.array(z.string()).min(2) }).strict()).default([]),
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
  // Complete one of these paths; each path is a list of "all"/"choose" requirements, like a major's.
  z
    .object({ ...ruleBase, kind: z.literal('requirement'), paths: z.array(z.array(componentReq).min(1)).min(1) })
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
    // Subjects with no category of their own for this course get one from their area (code
    // prefix): the course's own areas are `home`, every other subject is `other` (e.g. breadth).
    area_categories: z.object({ home: z.string().optional(), areas: z.array(z.string().regex(/^[A-Z]{4}$/)).default([]), other: z.string() }).strict().optional(),
    // Subjects this course's students can't count (closed to new students): they get no category
    // for it, so suggestions and the planner leave them out.
    closed: z.array(subjectCode).default([]),
    // False while a course is still being entered: its data is checked, but students can't pick it yet.
    listed: z.boolean().default(true),
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
    areaCategories: c.area_categories,
    closed: c.closed,
    listed: c.listed,
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
      return { id: r.id, description: r.description, kind: r.kind, count: r.count, max: Math.max(r.max ?? r.count, r.count), noDoubleCount: r.no_double_count as boolean | [string, string][] }
    case 'area-cap':
      return { id: r.id, description: r.description, kind: r.kind, max: r.max, category: r.category, exceptions: r.exceptions }
    case 'specialisation':
      return { id: r.id, description: r.description, kind: r.kind, max: r.max }
    case 'minor':
      return { id: r.id, description: r.description, kind: r.kind, max: r.max, informal: r.informal }
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
    case 'requirement':
      return { id: r.id, description: r.description, kind: r.kind, paths: r.paths as ComponentReq[][] }
  }
}

export type CourseRule =
  | { id: string; description: string; kind: 'compulsory'; subjects: string[]; firstSemester: boolean }
  | { id: string; description: string; kind: 'points'; min?: number; max?: number; level?: number; category?: string }
  | { id: string; description: string; kind: 'major'; count: number; max: number; noDoubleCount: boolean | [string, string][] }
  | { id: string; description: string; kind: 'area-cap'; max: number; category?: string; exceptions: { components: string[] }[] }
  | { id: string; description: string; kind: 'specialisation'; max: number }
  | { id: string; description: string; kind: 'minor'; max: number; informal: boolean }
  | {
      id: string
      description: string
      kind: 'level1-areas'
      minAreas: number
      maxPointsPerArea: number
      category?: string
    }
  | { id: string; description: string; kind: 'progression'; beforeLevel: number; level: number; minPoints: number }
  | { id: string; description: string; kind: 'requirement'; paths: ComponentReq[][] }

export type Course = z.output<typeof courseFileSchema>


export type ComponentReq = { all: string[] } | { choose: { points: number; from: string[] } }

// At most `max` points from these subjects across the whole major (French: one "other" elective in all).
const componentLimit = z.object({ max: z.number().positive(), from: z.array(subjectCode).min(1) }).strict()
export type ComponentLimit = z.output<typeof componentLimit>

export const componentFileSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    course: z.string().min(1),
    year: z.number().int(),
    kind: z.enum(['major', 'specialisation', 'minor']),
    title: z.string().min(1),
    points: z.number().positive(),
    requires_major: z.array(z.string()).default([]),
    // An informal specialisation (B-DES: 25 points of level 3, separate from the formal ones): a
    // plan holds it in its minors, not as its specialisation. Only on kind specialisation.
    informal: z.boolean().default(false),
    // Components that can't be taken alongside this one (Handbook "Diversity of study" pairs).
    not_with: z.array(z.string()).default([]),
    requirements: z.union([z.literal('unknown'), z.array(componentReq)]).default('unknown'),
    // Several ways through, one to complete (a language major's entry points, by prior knowledge).
    // `requirements` is then left out; the first route stands in wherever one list is needed.
    routes: z
      .array(z.object({ title: z.string().min(1), note: z.string().optional(), requirements: z.array(componentReq).min(1), limits: z.array(componentLimit).optional() }).strict())
      .min(2)
      .optional(),
    limits: z.array(componentLimit).default([]),
    handbook: handbookUrl.optional(),
    verified_on: z.union([z.iso.date(), z.null()]).default(null),
    // First commencement year whose students can no longer choose it (still shown to earlier ones).
    closed_from: z.number().int().optional(),
    // Subjects a student in this major can't count as breadth (too close to the major): listed
    // codes, every subject with one of these code prefixes, minus any `except` codes.
    non_allowed_breadth: z
      .object({
        subjects: z.array(subjectCode).default([]),
        areas: z.array(z.string().regex(/^[A-Z]{4}$/)).default([]),
        except: z.array(subjectCode).default([]),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((c) => !c.informal || c.kind === 'specialisation', { message: 'informal is only for kind specialisation', path: ['informal'] })
  .transform((c) => ({
    id: c.id,
    course: c.course,
    year: c.year,
    kind: c.kind,
    informal: c.informal,
    title: c.title,
    points: c.points,
    requiresMajor: c.requires_major,
    notWith: c.not_with,
    requirements: (c.routes ? c.routes[0]!.requirements : c.requirements) as 'unknown' | ComponentReq[],
    routes: c.routes as { title: string; note?: string; requirements: ComponentReq[]; limits?: ComponentLimit[] }[] | undefined,
    limits: c.limits as ComponentLimit[],
    handbook: c.handbook,
    verifiedOn: c.verified_on,
    closedFrom: c.closed_from,
    nonAllowedBreadth: c.non_allowed_breadth as NonAllowedBreadth | undefined,
  }))

export interface NonAllowedBreadth {
  subjects: string[]
  areas: string[]
  except: string[]
}

export type Component = z.output<typeof componentFileSchema>

export interface Dataset {
  name: 'real' | 'demo'
  generatedAt: string
  subjects: Record<string, Subject>
  courses: Course[]
  components: Component[]
}
