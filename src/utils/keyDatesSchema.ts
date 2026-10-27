import { z } from 'zod'

export const KEY_DATE_KINDS = ['teaching', 'orientation', 'selfEnrol', 'employability', 'census', 'break', 'withdraw', 'swotvac', 'exams', 'results', 'supp', 'reenrol', 'reenrolLate'] as const
export type KeyDateKind = (typeof KEY_DATE_KINDS)[number]
export const KEY_DATE_TERMS = ['summer', 'semester-1', 'winter', 'semester-2'] as const
export type KeyDateTerm = (typeof KEY_DATE_TERMS)[number]

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), 'not a real date')

/** One file in data/real/keyDates/: one academic year, every row with its official source. */
export const keyDatesFileSchema = z.strictObject({
  year: z.number().int().min(2020).max(2100),
  checked: isoDate,
  dates: z.array(
    z
      .strictObject({
        kind: z.enum(KEY_DATE_KINDS),
        term: z.enum(KEY_DATE_TERMS),
        start: isoDate,
        end: isoDate.optional(),
        source: z.string().regex(/^https:\/\/students\.unimelb\.edu\.au\//),
      })
      .refine((d) => !d.end || d.start <= d.end, 'start must not be after end'),
  ),
})
export type KeyDatesFile = z.output<typeof keyDatesFileSchema>
