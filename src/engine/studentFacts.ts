import { z } from 'zod'

/**
 * Facts students report that the Handbook doesn't say (exam format, recordings, group work,
 * extra cost, programming languages). Collected by optional questions on the ratings
 * form and published per subject only once enough students agree (scripts/ratings/aggregate.ts).
 *
 * Question titles and option labels are exactly as on the Google Form (docs/ratings-setup.md):
 * the aggregation matches on them, and the rating form sends them as the answer values.
 */

/** Students who must give the same answer before it is shown. */
export const MIN_FACT_AGREE = 3
/** Share of (sure) answers the top answer needs before it is shown. */
export const FACT_MAJORITY = 0.6

/** Single-choice questions: form option label → id; a null id ("Not sure") counts as no answer. */
export const FACT_QUESTIONS = {
  exam: {
    title: 'Final exam',
    options: { 'Open book': 'open', 'Closed book': 'closed', 'No final exam': 'none', 'Not sure': null },
  },
  lectures: {
    title: 'Lectures recorded',
    options: { Yes: 'yes', Some: 'some', No: 'no' },
  },
  groups: {
    title: 'Group work',
    options: { 'Groups assigned': 'assigned', 'Choose your own group': 'choose', 'No group work': 'none' },
  },
  cost: {
    title: 'Had to buy a textbook or online homework access',
    options: { Yes: 'yes', No: 'no' },
  },
} as const

export type FactKey = keyof typeof FACT_QUESTIONS
export const FACT_KEYS = Object.keys(FACT_QUESTIONS) as FactKey[]

/** Checkbox question: the languages a subject used. "None" is an answer but never shown. */
export const LANGUAGES_TITLE = 'Programming languages used'
export const LANGUAGES = ['Python', 'R', 'Java', 'C', 'C++', 'JavaScript', 'SQL', 'MATLAB'] as const
export const NO_LANGUAGE = 'None'

/** The ids each single-choice question can publish ("Not sure" never is). */
const IDS = {
  exam: ['open', 'closed', 'none'],
  lectures: ['yes', 'some', 'no'],
  groups: ['assigned', 'choose', 'none'],
  cost: ['yes', 'no'],
} as const satisfies Record<FactKey, readonly [string, ...string[]]>

const agreed = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({ value: z.enum(values), count: z.number().int().min(MIN_FACT_AGREE) }).strict()

/** One subject's published facts; `n` is how many students answered at least one of the questions. */
export const studentFactsSchema = z
  .object({
    n: z.number().int().min(MIN_FACT_AGREE),
    exam: agreed(IDS.exam).optional(),
    lectures: agreed(IDS.lectures).optional(),
    groups: agreed(IDS.groups).optional(),
    cost: agreed(IDS.cost).optional(),
    languages: z.partialRecord(z.enum(LANGUAGES), z.number().int().min(MIN_FACT_AGREE)).optional(),
  })
  .strict()
export type StudentFacts = z.output<typeof studentFactsSchema>
