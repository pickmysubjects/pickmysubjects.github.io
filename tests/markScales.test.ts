import { describe, expect, it } from 'vitest'
import { MARK_SCALES, MARK_SCALE_IDS, defaultMarkScale, isMarkScale } from '@/utils/markScales'
import { cleanProfiles } from '@/utils/sanitize'

describe('mark scales', () => {
  it('every scale has five bands', () => {
    for (const id of MARK_SCALE_IDS) expect(MARK_SCALES[id]).toHaveLength(5)
    expect(MARK_SCALE_IDS).toHaveLength(14)
    expect(MARK_SCALES.jp[2]).toBe(MARK_SCALES.jp[3])
  })

  it('defaults by locale, UniMelb with uni results', () => {
    const want = { en: 'vce', 'zh-CN': 'cn', 'zh-TW': 'tw', ja: 'jp', ko: 'kr5', vi: 'vn', ms: 'spm', id: 'id', hi: 'cbse' }
    for (const [loc, s] of Object.entries(want)) {
      expect(defaultMarkScale(loc, false)).toBe(s)
      expect(defaultMarkScale(loc, true)).toBe('unimelb')
    }
    expect(defaultMarkScale('xx', false)).toBe('vce')
  })

  it('sanitize keeps known scales and drops unknown ones', () => {
    expect(isMarkScale('toString')).toBe(false)
    const out = cleanProfiles({ a: { markScale: 'ib' }, b: { markScale: 'nope' }, c: { markScale: 3 } })
    expect(out.a!.markScale).toBe('ib')
    expect(out.b!).not.toHaveProperty('markScale')
    expect(out.c!).not.toHaveProperty('markScale')
  })
})
