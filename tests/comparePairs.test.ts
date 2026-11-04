import { describe, expect, it } from 'vitest'
import { comparePairs, isComparePair, pairFromSlug, pairSlug } from '@/engine/comparePairs'
import { realData } from './realData'

const data = realData()

describe('subject pairs with their own compare page', () => {
  it('has one address per pair, whichever comes first', () => {
    expect(pairSlug('MAST10021', 'MAST10006')).toBe('MAST10006-vs-MAST10021')
    expect(pairFromSlug('mast10006-vs-mast10021')).toEqual(['MAST10006', 'MAST10021'])
    expect(pairFromSlug('MAST10006')).toBeNull()
    expect(pairFromSlug('MAST10006-vs-MAST10006')).toBeNull()
  })

  it('pairs subjects a student picks between, not the same subject at another level', () => {
    const pairs = comparePairs(data.subjects).map((p) => p.join(' '))
    expect(pairs).toContain('MAST10006 MAST10021')
    expect(new Set(pairs).size).toBe(pairs.length)
    for (const p of comparePairs(data.subjects)) {
      expect(data.subjects[p[0]]!.title.toLowerCase()).not.toBe(data.subjects[p[1]]!.title.toLowerCase())
      expect(isComparePair(data.subjects, p[0], p[1]) && isComparePair(data.subjects, p[1], p[0])).toBe(true)
    }
  })
})
