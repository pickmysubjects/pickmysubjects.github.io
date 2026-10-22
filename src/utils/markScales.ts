/**
 * Mark scales a student can read the five strength levels in (Hard, Weak, OK, Good, Strong).
 * Only the labels change: levels are stored as 1–5 whatever the scale, so the engine never sees this.
 * A rough guide, not an official conversion (see docs research notes on high-school scales).
 */
export const MARK_SCALES = {
  unimelb: ['<60', '60–69', '70–74', '75–79', '80+'],
  vce: ['<25', '25–29', '30–33', '34–37', '38+'],
  ib: ['1–3', '4', '5', '6', '7'],
  alevel: ['D–E', 'C', 'B', 'A', 'A*'],
  us: ['≤C', 'B−–B', 'B+', 'A−', 'A'],
  cn: ['<70', '70–79', '80–84', '85–89', '90+'],
  tw: ['≤7', '8–9', '10–11', '12', '13–15'],
  jp: ['1–2', '3', '4', '4', '5'],
  kr9: ['7–9', '5–6', '4', '3', '1–2'],
  kr5: ['5', '4', '3', '2', '1'],
  vn: ['<6.5', '6.5–7.4', '7.5–7.9', '8.0–8.9', '9.0+'],
  spm: ['≤C+', 'B–B+', 'A−', 'A', 'A+'],
  id: ['<75', '75–82', '83–86', '87–90', '91+'],
  cbse: ['≤C1', 'B2', 'B1', 'A2', 'A1'],
} as const satisfies Record<string, readonly [string, string, string, string, string]>

export type MarkScale = keyof typeof MARK_SCALES
export const MARK_SCALE_IDS = Object.keys(MARK_SCALES) as MarkScale[]

const BY_LOCALE: Record<string, MarkScale> = {
  en: 'vce', 'zh-CN': 'cn', 'zh-TW': 'tw', ja: 'jp', ko: 'kr5', vi: 'vn', ms: 'spm', id: 'id', hi: 'cbse',
}

/** With uni results, UniMelb marks; otherwise the usual high-school scale for the site language. */
export function defaultMarkScale(locale: string, hasUniResults: boolean): MarkScale {
  return hasUniResults ? 'unimelb' : (BY_LOCALE[locale] ?? 'vce')
}

export function isMarkScale(x: unknown): x is MarkScale {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(MARK_SCALES, x)
}
