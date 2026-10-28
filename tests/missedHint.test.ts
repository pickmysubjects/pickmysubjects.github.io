import { describe, expect, it } from 'vitest'
import { missedHint } from '../src/components/layout/missedHint'

describe('a menu link into a missing part of a page', () => {
  const none = { plan: false, saved: 0 }

  it('opens the comparison instead of saying anything once two subjects are saved', () => {
    expect(missedHint('compare-title', { plan: false, saved: 3 })).toBeNull()
    expect(missedHint('compare-title', { plan: false, saved: 2 })).toBeNull()
  })

  it('asks for one more saved subject, or for some, never the wrong one', () => {
    expect(missedHint('compare-title', { plan: false, saved: 1 })?.key).toBe('menu.miss.compareOne')
    expect(missedHint('compare-title', none)?.key).toBe('menu.miss.shortlist')
  })

  it('keeps the plan hints', () => {
    expect(missedHint('heavy', none)?.key).toBe('menu.miss.plan')
    expect(missedHint('heavy', { plan: true, saved: 0 })?.key).toBe('menu.miss.noHeavy')
    expect(missedHint('calendar', { plan: true, saved: 0 })?.key).toBe('menu.miss.noDates')
    expect(missedHint('nothing-here', none)).toBeNull()
    expect(missedHint(null, none)).toBeNull()
  })
})
