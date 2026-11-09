/**
 * Mark scales a student can read the five strength levels in (Hard, Weak, OK, Good, Strong).
 * Only the labels change: levels are stored as 1–5 whatever the scale, so the engine never sees this.
 * A rough guide, not an official conversion (see docs research notes on high-school scales).
 */
export const MARK_SCALES = {
  unimelb: ['<60', '60–64', '65–74', '75–79', '80+'],
  vce: ['<25', '25–29', '30–33', '34–37', '38+'],
  // NSW HSC performance bands (Band 6 is the top).
  hsc: ['1–2', '3', '4', '5', '6'],
  ib: ['1–3', '4', '5', '6', '7'],
  alevel: ['D–E', 'C', 'B', 'A', 'A*'],
  // Hong Kong DSE levels (5** is the top).
  hkdse: ['1–2', '3', '4', '5', '5*–5**'],
  us: ['≤C', 'B−–B', 'B+', 'A−', 'A'],
  // A subject's score as students know it: out of 100, or out of 150 for Chinese, maths and
  // English (the same share, side by side, so nobody has to convert).
  cn: ['<70｜<105', '70–79｜105–119', '80–84｜120–127', '85–89｜128–134', '90+｜135+'],
  tw: ['≤7', '8–9', '10–11', '12', '13–15'],
  // 評定平均 in the five bands Japanese school reports (調査書, 学習成績の状況) use: E ≤1.8,
  // D 1.9–2.6, C 2.7–3.4, B 3.5–4.2, A 4.3–5.0. Whole grades alone would give two levels one label.
  jp: ['≤1.8', '1.9–2.6', '2.7–3.4', '3.5–4.2', '4.3–5.0'],
  kr9: ['7–9', '5–6', '4', '3', '1–2'],
  kr5: ['5', '4', '3', '2', '1'],
  vn: ['<6.5', '6.5–7.4', '7.5–7.9', '8.0–8.9', '9.0+'],
  spm: ['≤C+', 'B–B+', 'A−', 'A', 'A+'],
  id: ['<75', '75–82', '83–86', '87–90', '91+'],
  cbse: ['≤C1', 'B2', 'B1', 'A2', 'A1'],
  // A plain percentage, for school systems not listed (Canadian provinces, many others).
  pct: ['<60%', '60–69%', '70–79%', '80–89%', '90%+'],
} as const satisfies Record<string, readonly [string, string, string, string, string]>

export type MarkScale = keyof typeof MARK_SCALES
export const MARK_SCALE_IDS = Object.keys(MARK_SCALES) as MarkScale[]

const BY_LOCALE: Record<string, MarkScale> = {
  en: 'vce', 'zh-CN': 'cn', 'zh-TW': 'tw', ja: 'jp', ko: 'kr5', vi: 'vn', ms: 'spm', id: 'id', hi: 'cbse',
}

// English is read everywhere: the browser's region says which school system is likelier
// (en-GB → A-Level, en-HK → DSE…). Australia and anywhere else keep VCE (most UniMelb students).
const BY_REGION: Record<string, MarkScale> = { GB: 'alevel', SG: 'alevel', US: 'us', IN: 'cbse', HK: 'hkdse', CA: 'pct' }

/**
 * With uni results, UniMelb marks; otherwise the usual high-school scale for the site language,
 * and for English the browser's region (`browserLang`, e.g. "en-GB").
 */
export function defaultMarkScale(locale: string, hasUniResults: boolean, browserLang: string = typeof navigator === 'undefined' ? '' : navigator.language): MarkScale {
  if (hasUniResults) return 'unimelb'
  if (locale === 'en') {
    const region = /^en-([A-Za-z]{2})$/i.exec(browserLang)?.[1]?.toUpperCase()
    if (region && BY_REGION[region]) return BY_REGION[region]
  }
  return BY_LOCALE[locale] ?? 'vce'
}

export function isMarkScale(x: unknown): x is MarkScale {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(MARK_SCALES, x)
}
