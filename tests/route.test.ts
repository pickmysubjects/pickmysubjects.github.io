import { describe, expect, it } from 'vitest'
import { movedTo, parsePath } from '../src/composables/useView'

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
