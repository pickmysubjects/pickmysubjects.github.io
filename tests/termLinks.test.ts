import { describe, expect, it } from 'vitest'
import { sectionClaims, termSegments, type TermContext } from '../src/utils/termLinks'

const ctx = (over: Partial<TermContext> = {}): TermContext => {
  const claim = sectionClaims()
  const owner = {}
  return { page: 'guide/semester/', section: 'drop', subjects: new Set(['COMP10001']), claim: (id) => claim(id, owner), ...over }
}
const links = (text: string, c = ctx()) => termSegments(text, c).filter((s) => s.to).map((s) => `${s.text}→${s.to}`)

describe('term links', () => {
  it('links terms in any language around them, and subject codes we have', () => {
    expect(links('census date（免费退课截止日）之前：免费退')).toEqual(['census date→guide/key-dates/'])
    expect(links('Your WAM and COMP10001 and XXXX99999')).toEqual(['WAM→guide/basics/#wam', 'COMP10001→subject/COMP10001/'])
    expect(links('ハードルがある科目')).toEqual(['ハードル→guide/semester/#hurdles'])
  })

  it('links each term once per section, and keeps the text whole', () => {
    // One section, two sentences (each its own TermText, so its own owner).
    const claim = sectionClaims()
    const first = {}
    const second = {}
    const base = { page: 'guide/semester/', section: 'drop' }
    const text = 'WAM here, and WAM again.'
    const segs = termSegments(text, { ...base, claim: (id) => claim(id, first) })
    expect(segs.map((s) => s.text).join('')).toBe(text)
    expect(segs.filter((s) => s.to)).toHaveLength(1)
    expect(links('Also WAM.', { ...base, claim: (id) => claim(id, second) })).toEqual([])
    // The first sentence re-rendered (a language switch) keeps its link.
    expect(termSegments(text, { ...base, claim: (id) => claim(id, first) }).filter((s) => s.to)).toHaveLength(1)
  })

  it('never links to where the reader already is', () => {
    expect(links('special consideration', ctx({ section: 'special-consideration' }))).toEqual([])
    expect(links('census date', ctx({ page: 'guide/key-dates/', section: 'dates' }))).toEqual([])
    // The same page but another section is fine.
    expect(links('hurdles', ctx({ section: 'drop' }))).toEqual(['hurdles→guide/semester/#hurdles'])
  })

  it('matches whole words only', () => {
    expect(links('WAMs, censuses, breadthless')).toEqual([])
    expect(links('my.unimelb and SWAM')).toEqual([])
  })
})
