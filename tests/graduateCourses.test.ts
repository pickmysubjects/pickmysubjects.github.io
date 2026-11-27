import { describe, expect, it } from 'vitest'
import { courseFileSchema } from '../src/engine/schema'
import { isGraduateCourse } from '../src/engine/expr'
import { isMasterCourse } from '../src/composables/useStudyLevel'
import { realData } from './realData'

describe('graduate courses', () => {
  it('counts MC- codes as master’s, and old-style codes only when flagged', () => {
    realData()
    expect(isMasterCourse('MC-IT-200')).toBe(true)
    // 841AC is the Bachelor of Oral Health: an old-style code that is not a master's.
    expect(isMasterCourse('841AC')).toBe(false)
    expect(isGraduateCourse('841AC')).toBe(false)
    expect(isMasterCourse('B-SCI')).toBe(false)
  })

  it('registers a course file with graduate: true', () => {
    expect(isMasterCourse('999ZZ')).toBe(false)
    courseFileSchema.parse({ code: '999ZZ', title: 'Test master', year: 2027, total_points: 100, standard_load: 50, graduate: true, rules: [] })
    expect(isMasterCourse('999ZZ')).toBe(true)
    expect(isGraduateCourse('999ZZ')).toBe(true)
  })
})

describe('admission lists with old-style course codes', async () => {
  const { structuredFromText } = await import('../src/engine/handbookPaste')
  it('reads an old-style code written before a master’s title, never a bachelor’s', () => {
    const r = structuredFromText('Admission into or selection of one of the following: MC-IB Master of International Business 761EM Master of Engineering Management')
    expect(JSON.stringify(r)).toContain('"admission":"761EM"')
    expect(JSON.stringify(r)).toContain('"admission":"MC-IB"')
    expect(structuredFromText('Admission into the 841AC Bachelor of Oral Health')).toBeNull()
  })
})

describe('renamed course codes', async () => {
  const { admits } = await import('../src/engine/expr')
  it('reads "admission to MC-AEMTRCS" (the old code on subject pages) as MC-APPECON', () => {
    expect(admits('MC-APPECON', 'MC-AEMTRCS')).toBe(true)
    expect(admits('MC-IT-200', 'MC-AEMTRCS')).toBe(false)
  })
})
