/**
 * Grade bands as students share them: the mark never leaves the browser, only its band and the
 * five-point range of the student's WAM (without that subject), so a band can be read against
 * how strong a student is overall without ever linking one person's subjects together.
 */
export const GRADE_BANDS = ['H1', 'H2A', 'H2B', 'H3', 'P', 'N'] as const
export type GradeBand = (typeof GRADE_BANDS)[number]

export function bandOf(mark: number): GradeBand {
  if (mark >= 80) return 'H1'
  if (mark >= 75) return 'H2A'
  if (mark >= 70) return 'H2B'
  if (mark >= 65) return 'H3'
  if (mark >= 50) return 'P'
  return 'N'
}

/** A typical mark inside a band, for averaging (H1 spans 80–100, so a little above its floor). */
export const BAND_MID: Record<GradeBand, number> = { H1: 85, H2A: 77, H2B: 72, H3: 67, P: 57, N: 40 }

/** "70–74": the five-point range a WAM falls in. */
export function wamBandOf(wam: number): string {
  const low = Math.max(0, Math.min(95, Math.floor(wam / 5) * 5))
  return `${low}–${low + 4}`
}

/** The middle of a "70–74" range, or null when it can't be read. */
export function wamBandMid(band: string): number | null {
  const m = /^(\d{1,2})[–-](\d{1,3})$/.exec(band.trim())
  if (!m) return null
  const low = Number(m[1])
  const high = Number(m[2])
  return high - low === 4 && low % 5 === 0 ? low + 2 : null
}

/** A subject's grading next to students' own level, published once enough people shared. */
export interface GradeOffset {
  /** Marks above (+) or below (−) the WAM of those who took it, shrunk toward 0 when few shared. */
  offset: number
  n: number
}

/** Shares needed before a subject's offset is published at all, and how hard small counts are pulled to 0. */
export const MIN_GRADE_SHARES = 5
const SHRINK = 5

/** Per subject: how far its bands sit above or below the sharers' WAMs. Unknown codes and malformed rows are dropped. */
export function gradeOffsets(rows: { code: string; band: string; wamBand: string }[], known?: Set<string>): Record<string, GradeOffset> {
  const diffs = new Map<string, number[]>()
  for (const r of rows) {
    const code = r.code.trim().toUpperCase()
    if (!/^[A-Z]{4}\d{5}$/.test(code) || (known && !known.has(code))) continue
    const band = r.band.trim().toUpperCase() as GradeBand
    const wam = wamBandMid(r.wamBand)
    if (!GRADE_BANDS.includes(band) || wam === null) continue
    diffs.set(code, [...(diffs.get(code) ?? []), BAND_MID[band] - wam])
  }
  const out: Record<string, GradeOffset> = {}
  for (const [code, ds] of [...diffs].sort(([a], [b]) => a.localeCompare(b))) {
    if (ds.length < MIN_GRADE_SHARES) continue
    const mean = ds.reduce((a, b) => a + b, 0) / ds.length
    out[code] = { offset: Math.round(((mean * ds.length) / (ds.length + SHRINK)) * 10) / 10, n: ds.length }
  }
  return out
}
