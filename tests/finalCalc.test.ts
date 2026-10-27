import { describe, expect, it } from 'vitest'
import { finalNeeds, partsFromAssessment, percentOf, type CalcPart } from '../src/engine/finalCalc'
import { LOCALE_CODES } from '../src/i18n/codes'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { ja } from '../src/i18n/messages/ja'
import { ko } from '../src/i18n/messages/ko'
import { vi } from '../src/i18n/messages/vi'
import { id } from '../src/i18n/messages/id'
import { ms } from '../src/i18n/messages/ms'
import { hi } from '../src/i18n/messages/hi'

const need = (parts: CalcPart[], band: string) => finalNeeds(parts)!.bands.find((b) => b.band === band)!

describe('finalNeeds', () => {
  const parts: CalcPart[] = [
    { kind: 'assignment', weight: 20, score: 80 },
    { kind: 'assignment', weight: 20, score: 70 },
    { kind: 'exam', weight: 60, hurdle: true },
  ]

  it('works out the exam mark for each band from the weights', () => {
    // 16 + 14 = 30 banked; H1 starts at 79.5 (rounds to 80), so 49.5 more out of 60.
    const r = finalNeeds(parts)!
    expect(r.earned).toBe(30)
    expect(r.leftWeight).toBe(60)
    expect(need(parts, 'H1')).toMatchObject({ needed: 83, status: 'possible' })
    expect(need(parts, 'P')).toMatchObject({ needed: 33, status: 'possible' })
    expect(r.roundingMatters).toBe(true)
  })

  it('rounds the needed mark up, so it is always enough', () => {
    const p: CalcPart[] = [{ kind: 'test', weight: 30, score: 71 }, { kind: 'exam', weight: 70 }]
    // (79.5 − 21.3) / 70 = 83.14… → 84
    expect(need(p, 'H1').needed).toBe(84)
  })

  it('says not possible past 100% and already secured at or below 0', () => {
    const low: CalcPart[] = [{ kind: 'assignment', weight: 50, score: 20 }, { kind: 'exam', weight: 50 }]
    expect(need(low, 'H1').status).toBe('impossible')
    expect(need(low, 'P')).toMatchObject({ needed: 79, status: 'possible' })
    const high: CalcPart[] = [{ kind: 'assignment', weight: 70, score: 100 }, { kind: 'exam', weight: 30 }]
    expect(need(high, 'P')).toMatchObject({ needed: 0, status: 'secured' })
    expect(finalNeeds(high)!.best).toBe(100)
  })

  it('lists hurdles still to come, done ones not', () => {
    expect(finalNeeds(parts)!.hurdlesLeft.map((h) => h.kind)).toEqual(['exam'])
    const done = parts.map((p) => ({ ...p, score: 60 }))
    expect(finalNeeds(done)!.hurdlesLeft).toEqual([])
  })

  it('with everything done, gives the final mark against each band', () => {
    const done: CalcPart[] = [{ kind: 'assignment', weight: 40, score: 75 }, { kind: 'exam', weight: 60, score: 75 }]
    expect(need(done, 'H2A')).toMatchObject({ needed: null, status: 'secured' })
    expect(need(done, 'H1')).toMatchObject({ needed: null, status: 'impossible' })
    // 79.6 rounds to 80: an H1, as on the rest of the site.
    const edge: CalcPart[] = [{ kind: 'assignment', weight: 40, score: 79 }, { kind: 'exam', weight: 60, score: 80 }]
    expect(need(edge, 'H1').status).toBe('secured')
  })

  it('scales typed weights that do not add up to 100', () => {
    const p: CalcPart[] = [{ kind: 'assignment', weight: 1, score: 50 }, { kind: 'exam', weight: 1 }]
    expect(finalNeeds(p)!.earned).toBe(25)
    expect(need(p, 'P').needed).toBe(49)
  })

  it('handles missing data', () => {
    expect(finalNeeds([])).toBeNull()
    expect(finalNeeds([{ kind: 'exam', weight: 0 }])).toBeNull()
    expect(partsFromAssessment('unknown')).toEqual([])
    expect(partsFromAssessment(undefined)).toEqual([])
    // Nothing done yet: the needed average is the band itself.
    expect(need([{ kind: 'exam', weight: 100, hurdle: true }], 'H2B').needed).toBe(70)
  })

  it('reads the Handbook parts with their hurdles', () => {
    expect(partsFromAssessment([{ kind: 'exam', weight: 60, hurdle: true }, { kind: 'quiz', weight: 40 }])).toEqual([
      { kind: 'exam', weight: 60, hurdle: true },
      { kind: 'quiz', weight: 40 },
    ])
  })
})

describe('percentOf', () => {
  it('turns score / out of into a percentage and rejects nonsense', () => {
    expect(percentOf(18, 20)).toBe(90)
    expect(percentOf(72)).toBe(72)
    expect(percentOf(21, 20)).toBeNull()
    expect(percentOf(5, 0)).toBeNull()
    expect(percentOf(-1, 10)).toBeNull()
  })
})

describe('calc text', () => {
  const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
  it('has every calc string in all nine languages', () => {
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [k] : keys(v).map((x) => `${k}.${x}`)))
    const want = keys(en.calc).sort()
    for (const code of LOCALE_CODES) {
      const m = MESSAGES[code] as typeof en
      expect(keys(m.calc).sort(), code).toEqual(want)
      expect(m.seo.calcTitle, code).toBeTruthy()
      expect(m.seo.calcDesc, code).toBeTruthy()
    }
  })
})

describe('cleanCalc', () => {
  it('keeps good saved rows and drops broken ones', async () => {
    const { cleanCalc } = await import('../src/engine/finalCalc')
    expect(
      cleanCalc({
        COMP10001: { rows: [{ kind: 'exam', weight: 60, hurdle: true, score: 'x', outOf: 50 }, { kind: 'nope', weight: 1 }], custom: true },
        bad: { rows: [] },
      }),
    ).toEqual({ COMP10001: { rows: [{ kind: 'exam', weight: 60, hurdle: true, score: '', outOf: 50 }], custom: true } })
    expect(cleanCalc(null)).toEqual({})
  })
})

describe('finalBand', () => {
  it('grades a finished subject from the exact mark, not the one-decimal display', async () => {
    const { finalBand } = await import('../src/engine/finalCalc')
    // 79.45 shows as 79.5 but rounds to 79: H2A, not H1.
    const r = finalNeeds([{ kind: 'exam', weight: 100, score: 79.45 }])!
    expect(r.earned).toBe(79.5)
    expect(finalBand(r)).toBe('H2A')
    expect(finalBand(finalNeeds([{ kind: 'exam', weight: 100, score: 79.5 }])!)).toBe('H1')
    expect(finalBand(finalNeeds([{ kind: 'exam', weight: 100, score: 49.4 }])!)).toBe('N')
  })
  it('gives the whole mark UniMelb uses once every part is done', () => {
    // 79.45 shows as 79.5 in the working, but the final mark is 79 (H2A); 79.5 is 80.
    expect(finalNeeds([{ kind: 'exam', weight: 100, score: 79.45 }])!.mark).toBe(79)
    expect(finalNeeds([{ kind: 'exam', weight: 100, score: 79.5 }])!.mark).toBe(80)
    expect(finalNeeds([{ kind: 'assignment', weight: 30, score: 75 }, { kind: 'exam', weight: 70, score: 84.5 }])!.mark).toBe(82)
    // Parts still to come: no final mark yet.
    expect(finalNeeds([{ kind: 'assignment', weight: 30, score: 75 }, { kind: 'exam', weight: 70 }])!.mark).toBeNull()
  })
  it('a hurdle marked under 50% caps the grade at NH, or N when the total fails anyway', async () => {
    const { finalBand } = await import('../src/engine/finalCalc')
    const missed = finalNeeds([{ kind: 'assignment', weight: 50, score: 95 }, { kind: 'exam', weight: 50, hurdle: true, score: 45 }])!
    expect(missed.mark).toBe(70)
    expect(missed.hurdlesMissed.map((h) => h.kind)).toEqual(['exam'])
    expect(finalBand(missed)).toBe('NH')
    expect(finalBand(missed, true)).toBe('NH')
    const both = finalNeeds([{ kind: 'assignment', weight: 50, score: 40 }, { kind: 'exam', weight: 50, hurdle: true, score: 30 }])!
    expect(finalBand(both)).toBe('N')
    // Passed at 50%, or not a hurdle: nothing changes.
    expect(finalBand(finalNeeds([{ kind: 'assignment', weight: 50, score: 95 }, { kind: 'exam', weight: 50, hurdle: true, score: 50 }])!)).toBe('H2B')
    expect(finalBand(finalNeeds([{ kind: 'assignment', weight: 50, score: 95 }, { kind: 'exam', weight: 50, score: 45 }])!)).toBe('H2B')
    // Still to come: the miss is known before the end.
    expect(finalNeeds([{ kind: 'test', weight: 20, hurdle: true, score: 30 }, { kind: 'exam', weight: 80 }])!.hurdlesMissed).toHaveLength(1)
  })
  it('only knows P or N for a pass/fail subject', async () => {
    const { finalBand } = await import('../src/engine/finalCalc')
    expect(finalBand(finalNeeds([{ kind: 'exam', weight: 100, score: 90 }])!, true)).toBe('P')
    expect(finalBand(finalNeeds([{ kind: 'exam', weight: 100, score: 40 }])!, true)).toBe('N')
  })
})
