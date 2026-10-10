import { describe, expect, it } from 'vitest'
import { discussionLinks } from '../src/utils/links'
import { LOCALE_CODES } from '../src/i18n/codes'

describe('discussion links', () => {
  it('put the page language’s own forums first, then the English sources', () => {
    for (const locale of LOCALE_CODES) {
      const links = discussionLinks('COMP10001', locale)
      expect(links.at(-4)?.label).toBe('StudentVIP')
      if (locale !== 'en') expect(links.length, locale).toBeGreaterThan(4)
      for (const l of links) expect(l.href).toMatch(/^https:\/\//)
    }
    expect(discussionLinks('COMP10001', 'ja')[0]?.label).toBe('Yahoo!知恵袋')
  })
})
