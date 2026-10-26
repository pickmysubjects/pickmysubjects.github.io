/**
 * "What I wish I knew" comments from the ratings sheet → data/real/comments.json.
 *
 * A comment is published only when all of these hold:
 * - the maintainer ticked the sheet's "Show" column for that row (manual approval);
 * - it passes `screenComment` (no emails, phone numbers, links, student numbers, @handles,
 *   named staff; not too long), checked again here even when approved;
 * - its subject has at least MIN_COMMENTS such comments.
 * Each published comment carries only its text, the term and the app language.
 */
import { createHash } from 'node:crypto'
import { COLUMNS, screenRows } from './aggregate'
import { MAX_COMMENT_LENGTH, MIN_COMMENTS, type StudentComment } from '../../src/engine/comments'
import { PERIODS, type Period } from '../../src/engine/schema'
import { LOCALE_CODES, type LocaleCode } from '../../src/i18n/codes'

/** Sheet columns this file reads, besides the shared ones in COLUMNS. */
export const COMMENT_COLUMNS = {
  wish: 'What I wish I knew',
  language: 'App language',
  // Added by hand by the maintainer (a checkbox); TRUE = approved.
  show: 'Show',
} as const

const SEMESTERS: Record<string, Period> = {
  Summer: 'summer',
  'Semester 1': 'semester-1',
  Winter: 'winter',
  'Semester 2': 'semester-2',
}

const PATTERNS: RegExp[] = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // email
  /@\w/, // @handle
  /\bhttps?:\/\/|\bwww\.|\b[\w-]+\.(com|net|org|io|edu|au|me|ly|gg|cn|co)\b/i, // link
  /\d{6,}/, // student number or any long id
  /(?:\+?\d[\d\s().-]{6,}\d)/, // phone number written with spaces or dashes
  // A named member of staff: "Dr Smith", "Prof. Jane Lee", "tutor John Smith", "王老师".
  /\b(?:dr|prof|professor|tutor|lecturer|coordinator|mr|mrs|ms|miss)\.?\s+[A-Z][a-z]+/i,
  /[一-鿿]{1,3}(?:老师|教授|老師)/,
  /(?:老师|教授|老師|導師|导师)\s*[A-Z][a-z]+/,
]

/**
 * The automatic filter. Returns the trimmed text, or null when the comment must not be published.
 * Conservative: anything that might identify someone drops the whole comment; nothing is edited.
 */
export function screenComment(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length < 3 || text.length > MAX_COMMENT_LENGTH) return null
  if (PATTERNS.some((p) => p.test(text))) return null
  return text
}

/** A stable id for the Report link: never the row number. */
export function commentId(code: string, text: string): string {
  return createHash('sha256').update(`${code}\n${text}`).digest('hex').slice(0, 12)
}

/** Whether the maintainer ticked "Show" (a checkbox reads TRUE). */
function approved(row: Record<string, string>): boolean {
  return (row[COMMENT_COLUMNS.show] ?? '').trim().toUpperCase() === 'TRUE'
}

const termKey = (c: StudentComment) => c.year * 10 + (c.period ? PERIODS.indexOf(c.period) + 1 : 0)

/**
 * Pure: raw rows in, the file out. Rows pass the same spam screen as ratings, then approval and the
 * filter. Order: newest term first, then a fixed shuffle (by the text's hash), so the order doesn't
 * reveal when each comment arrived.
 */
export function buildComments(rows: Record<string, string>[], now: Date, known?: Set<string>): Record<string, StudentComment[]> {
  const kept = screenRows(rows, now, known, (r) => (r[COMMENT_COLUMNS.wish] ?? '') !== '' && approved(r))
  const bySubject = new Map<string, StudentComment[]>()
  for (const r of kept) {
    const text = screenComment(r[COMMENT_COLUMNS.wish] ?? '')
    const year = Number(r[COLUMNS.year])
    if (text === null || !Number.isInteger(year)) continue
    const code = r[COLUMNS.code] as string
    const id = commentId(code, text)
    const list = bySubject.get(code) ?? []
    if (list.some((c) => c.id === id)) continue
    const period = SEMESTERS[r[COLUMNS.semester] ?? '']
    const lang = (LOCALE_CODES as readonly string[]).includes(r[COMMENT_COLUMNS.language] ?? '') ? (r[COMMENT_COLUMNS.language] as LocaleCode) : 'en'
    list.push({ id, text, year, ...(period ? { period } : {}), lang })
    bySubject.set(code, list)
  }
  const out: Record<string, StudentComment[]> = {}
  for (const [code, list] of [...bySubject].sort(([a], [b]) => a.localeCompare(b))) {
    // Below the threshold nothing about the subject's comments is written.
    if (list.length < MIN_COMMENTS) continue
    out[code] = [...list].sort((a, b) => termKey(b) - termKey(a) || a.id.localeCompare(b.id))
  }
  return out
}
