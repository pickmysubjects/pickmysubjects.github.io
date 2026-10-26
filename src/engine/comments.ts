import { z } from 'zod'
import { PERIODS } from './schema'
import { LOCALE_CODES } from '../i18n/codes'

/** Approved comments a subject needs before any of them is shown (or committed). */
export const MIN_COMMENTS = 3
/** Longest comment published; longer ones are dropped, not cut. */
export const MAX_COMMENT_LENGTH = 400

/**
 * One published "What I wish I knew" comment. Only these fields leave the private sheet: no
 * timestamp finer than the term and nothing else from the row, so a comment can't be tied to a
 * grade band or a rating. `id` is a hash of the subject and text (used by the Report link).
 */
export const studentCommentSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{12}$/),
    text: z.string().min(1).max(MAX_COMMENT_LENGTH),
    year: z.number().int().min(2010).max(2100),
    period: z.enum(PERIODS).optional(),
    lang: z.enum(LOCALE_CODES),
  })
  .strict()
export type StudentComment = z.output<typeof studentCommentSchema>

/** data/<set>/comments.json: subject code → its comments, only for subjects with MIN_COMMENTS+. */
export const commentsFileSchema = z.record(
  z.string().regex(/^[A-Z]{4}\d{5}$/),
  z.array(studentCommentSchema).min(MIN_COMMENTS),
)
