import { describe, expect, it } from 'vitest'
import { hreflangsFor } from '@/utils/hreflang'

describe('hreflangsFor', () => {
  it('declares Traditional Chinese pages for Hong Kong, Macau and zh-Hant too', () => {
    expect(hreflangsFor('zh-TW')).toEqual(['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant'])
  })
  it('adds zh-Hans to Simplified Chinese and leaves other locales alone', () => {
    expect(hreflangsFor('zh-CN')).toEqual(['zh-CN', 'zh-Hans'])
    expect(hreflangsFor('ja')).toEqual(['ja'])
  })
})
