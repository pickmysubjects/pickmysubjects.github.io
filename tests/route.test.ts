import { describe, expect, it } from 'vitest'
import { parsePath } from '../src/composables/useView'

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
