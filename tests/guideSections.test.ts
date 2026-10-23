import { describe, expect, it } from 'vitest'
import { categoryOfTopic, GUIDE_CATEGORIES, GUIDE_TOPICS, guidePageOf, topicPath } from '@/utils/guideSections'

describe('guide sections', () => {
  it('every topic anchor lives in exactly one category', () => {
    const all = GUIDE_CATEGORIES.flatMap((c) => GUIDE_TOPICS[c])
    expect(new Set(all).size).toBe(all.length)
  })
  it('sends an old anchor to the page that now holds it', () => {
    expect(categoryOfTopic('wam')).toBe('basics')
    expect(topicPath('fail')).toBe('guide/semester/#fail')
    expect(topicPath('nope')).toBe('guide/')
  })
  it('reads the page from the address', () => {
    expect(guidePageOf('')).toEqual({ kind: 'overview' })
    expect(guidePageOf('enrolling')).toEqual({ kind: 'category', category: 'enrolling' })
    expect(guidePageOf('key-dates')).toEqual({ kind: 'extra', page: 'key-dates', category: 'help' })
  })
})
