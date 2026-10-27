import { ASSESSMENT_KINDS, type AssessmentKind } from '@/engine/schema'
import { usePersisted } from './usePersisted'

/**
 * What a student typed into the final calculator, per subject, kept in this browser only (never
 * sent, not in the backup file). `parts` is set only once they changed the Handbook's list.
 */
export interface CalcRow {
  kind: AssessmentKind
  weight: number
  hurdle?: boolean
  /** Raw score and what it's out of, as typed; '' when not done yet. */
  score: number | ''
  outOf: number | ''
}

export interface CalcEntry {
  rows: CalcRow[]
  /** True once the rows differ from the Handbook's (edited, added or removed). */
  custom?: boolean
}

const num = (x: unknown): number | '' => (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1000 ? x : '')

/** Exported for tests: puts a saved copy back in shape, dropping anything broken. */
export function cleanCalc(raw: unknown): Record<string, CalcEntry> {
  const out: Record<string, CalcEntry> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [code, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Z]{4}\d{5}$/.test(code) || !v || typeof v !== 'object' || !Array.isArray((v as CalcEntry).rows)) continue
    const rows = (v as CalcEntry).rows
      .filter((r) => r && (ASSESSMENT_KINDS as readonly string[]).includes(r.kind))
      .slice(0, 30)
      .map((r): CalcRow => ({ kind: r.kind, weight: typeof r.weight === 'number' && r.weight >= 0 && r.weight <= 100 ? r.weight : 0, ...(r.hurdle ? { hurdle: true } : {}), score: num(r.score), outOf: num(r.outOf) }))
    out[code] = { rows, ...((v as CalcEntry).custom ? { custom: true } : {}) }
  }
  return out
}

const saved = usePersisted<Record<string, CalcEntry>>('sc:finalCalc', {}, cleanCalc)

export function useFinalCalc() {
  return saved
}
