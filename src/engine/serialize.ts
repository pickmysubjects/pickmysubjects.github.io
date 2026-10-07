import { stringify } from 'yaml'
import type { PasteResult } from './handbookPaste'
import type { ReqExpr, ReqField } from './schema'

/** Inverse of the schema's shorthand: { subject: X } becomes "X" for compact YAML. */
export function compactReq(field: ReqField): unknown {
  if (field === 'none' || field === 'unknown') return field
  return compact(field)
}

function compact(e: ReqExpr): unknown {
  if ('subject' in e) return e.subject
  if ('all' in e) return { all: e.all.map(compact) }
  if ('any' in e) return { any: e.any.map(compact) }
  return e
}

export interface SubjectDraft {
  code: string
  title: string
  level: number
  points: number
  year: number
  handbook?: string
}

/**
 * A ready-to-review subject file built from a paste. Today's date goes in
 * `verified_on` because a human is expected to check it before committing.
 */
export function subjectYaml(draft: SubjectDraft, parsed: PasteResult, today = new Date()): string {
  const doc: Record<string, unknown> = {
    code: draft.code,
    title: draft.title,
    level: draft.level,
    points: draft.points,
    offerings: parsed.offerings === 'unknown' ? 'unknown' : { [String(draft.year)]: parsed.offerings },
    prerequisites: compactReq(parsed.prerequisites),
    corequisites: compactReq(parsed.corequisites),
    non_allowed: parsed.nonAllowed,
    ...(parsed.assessment === 'unknown' ? {} : { assessment: parsed.assessment }),
    ...(parsed.weeklyContactHours ? { weekly_contact_hours: parsed.weeklyContactHours } : {}),
    handbook: draft.handbook ?? `https://handbook.unimelb.edu.au/${draft.year}/subjects/${draft.code.toLowerCase()}`,
    source_year: draft.year,
    verified_on: localDate(today),
  }
  return stringify(doc, { lineWidth: 0 })
}

/** YYYY-MM-DD in the user's own timezone (toISOString would give the UTC date). */
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
