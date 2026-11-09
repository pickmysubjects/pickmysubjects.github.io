import { describe, expect, it } from 'vitest'
import { MARK_SCALES, MARK_SCALE_IDS, defaultMarkScale, isMarkScale } from '@/utils/markScales'
import { cleanProfiles } from '@/utils/sanitize'

describe('mark scales', () => {
  it('every scale has five bands', () => {
    for (const id of MARK_SCALE_IDS) expect(MARK_SCALES[id]).toHaveLength(5)
    expect(MARK_SCALE_IDS).toHaveLength(17)
    // Every level has its own label, so a student can tell which one is theirs.
    for (const id of MARK_SCALE_IDS) expect(new Set(MARK_SCALES[id]).size).toBe(5)
  })

  it('defaults by locale, UniMelb with uni results', () => {
    const want = { en: 'vce', 'zh-CN': 'cn', 'zh-TW': 'tw', ja: 'jp', ko: 'kr5', vi: 'vn', ms: 'spm', id: 'id', hi: 'cbse' }
    for (const [loc, s] of Object.entries(want)) {
      expect(defaultMarkScale(loc, false, '')).toBe(s)
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

  it('for English, follows the browser region, else VCE', () => {
    expect(defaultMarkScale('en', false, 'en-GB')).toBe('alevel')
    expect(defaultMarkScale('en', false, 'en-HK')).toBe('hkdse')
    expect(defaultMarkScale('en', false, 'en-US')).toBe('us')
    expect(defaultMarkScale('en', false, 'en-AU')).toBe('vce')
    expect(defaultMarkScale('en', false, 'en-NZ')).toBe('vce')
    expect(defaultMarkScale('en', true, 'en-GB')).toBe('unimelb')
    // Another site language keeps its own scale whatever the browser says.
    expect(defaultMarkScale('zh-CN', false, 'en-GB')).toBe('cn')
  })
})
