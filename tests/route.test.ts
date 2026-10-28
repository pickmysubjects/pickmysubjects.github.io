import { describe, expect, it } from 'vitest'
import { keepsScroll, movedTo, parsePath } from '../src/composables/useView'
import { majorsAddress, majorsAnchorKind, majorsFromQuery } from '../src/utils/majorsAddress'

describe('parsePath', () => {
  it('reads a subject address, with or without a trailing slash', () => {
    expect(parsePath('subject/COMP30027')).toMatchObject({ view: 'subject', param: 'COMP30027' })
    expect(parsePath('subject/COMP30027/')).toMatchObject({ view: 'subject', param: 'COMP30027' })
  })

  it('falls back to home for unknown pages', () => {
    expect(parsePath('nope').view).toBe('home')
    expect(parsePath('').view).toBe('home')
  })

  it('keeps the query and survives a cut-off code', () => {
    expect(parsePath('feedback', '?topic=data').query.get('topic')).toBe('data')
    expect(parsePath('subject/COMP%3').param).toBe('COMP%3')
  })
})

describe('moved pages', () => {
  it('opens the old suggestions page as Find subjects sorted for the student', () => {
    expect(parsePath('recommend/').view).toBe('recommend')
    expect(movedTo('recommend')).toBe('subjects/?mine=1')
    expect(movedTo('subjects')).toBeNull()
  })

  it('opens a subject code typed after subjects/ as that subject page', () => {
    expect(movedTo('subjects', 'easy')).toBeNull()
    expect(movedTo('subjects', 'POLS30011')).toBe('subject/POLS30011')
    expect(movedTo('subjects', 'comp10001')).toBe('subject/COMP10001')
  })
})

describe('scroll on Back and Forward', () => {
  it('keeps the place when only the query changes on the same page', () => {
    expect(keepsScroll(parsePath('subjects/', '?level=1'), parsePath('subjects/', '?level=1&exam=0'))).toBe(true)
    expect(keepsScroll(parsePath('subjects/easy/'), parsePath('subjects/easy/', '?q=data'))).toBe(true)
    // A ready-made list is Find subjects with filters set, so stepping to or from one keeps it too.
    expect(keepsScroll(parsePath('subjects/', '?exam=0&level=1'), parsePath('subjects/no-exam/'))).toBe(true)
  })

  it('starts another page at the top', () => {
    expect(keepsScroll(parsePath('subjects/'), parsePath('subject/COMP10001'))).toBe(false)
    expect(keepsScroll(parsePath('subject/COMP10001'), parsePath('subject/COMP20003'))).toBe(false)
    expect(keepsScroll(parsePath('majors/'), parsePath('majors/arts-history'))).toBe(false)
    expect(keepsScroll(null, parsePath('subjects/'))).toBe(false)
  })
})

describe('the majors list address', () => {
  const defaults = { degree: 'B-SCI', kind: 'major' }

  it('writes the choices that differ from the defaults and reads them back', () => {
    const c = { degree: 'B-ARTS', kind: 'minor', field: 'languages', q: 'data science' }
    const address = majorsAddress(c, defaults)
    expect(address).toBe('majors/?degree=B-ARTS&kind=minor&field=languages&q=data+science')
    const [path, search] = address.split('?')
    expect(majorsFromQuery(parsePath(path!, `?${search}`).query)).toEqual(c)
  })

  it('is the bare list at the defaults', () => {
    expect(majorsAddress({ degree: 'B-SCI', kind: 'major', field: '', q: '' }, defaults)).toBe('majors/')
    expect(majorsFromQuery(new URLSearchParams())).toEqual({ degree: '', kind: '', field: '', q: '' })
  })

  it('opens an old link to a kind section on that kind', () => {
    expect(majorsAnchorKind('#minors-title')).toBe('minor')
    expect(majorsAnchorKind('specs-title')).toBe('specialisation')
    expect(majorsAnchorKind('informals-title')).toBe('informal')
    expect(majorsAnchorKind('sec-results')).toBeNull()
  })
})
