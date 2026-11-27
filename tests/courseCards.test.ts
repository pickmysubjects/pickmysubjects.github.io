import { describe, expect, it } from 'vitest'
import { courseCardId, isCourseCard, withCourseCards } from '../src/engine/courseCards'
import { isGraduateCode } from '../src/engine/graduateCourses'
import { majorOverview } from '../src/engine'
import { realData } from './realData'

describe('course cards (browsing a master’s with no specialisations)', () => {
  const data = realData()
  const cards = withCourseCards(data)

  it('adds one card per master’s course without specialisations, and none for others', () => {
    const withSpecs = new Set(data.components.map((c) => c.course))
    const added = cards.components.filter((c) => isCourseCard(c.id))
    expect(added.length).toBeGreaterThan(0)
    for (const c of added) {
      expect(isGraduateCode(c.course)).toBe(true)
      expect(withSpecs.has(c.course)).toBe(false)
    }
    expect(added.some((c) => c.id === courseCardId('MC-MTRNENG'))).toBe(true)
    expect(added.some((c) => c.course === 'MC-SOFTENG')).toBe(false)
  })

  it('leaves the planner’s data alone', () => {
    expect(data.components.some((c) => isCourseCard(c.id))).toBe(false)
    expect(withCourseCards(data)).toBe(cards)
  })

  it('shows the course’s compulsory subjects and choices', () => {
    const o = majorOverview(cards, courseCardId('MC-MTRNENG'), 'MC-MTRNENG')!
    expect(o.core).toEqual(expect.arrayContaining(['ENGR90037', 'ENGR90038', 'COMP90041']))
    expect(o.choices.some((c) => c.from.includes('ELEN90090'))).toBe(true)
  })
})
