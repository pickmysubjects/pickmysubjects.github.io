import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { browseIndex } from '../src/engine/browse'
import { withYearLong } from '../src/engine/yearLongPeriods'

describe('a year-long subject in lists', () => {
  it('runs through Semester 2 as well as Semester 1', () => {
    expect(withYearLong({ yearLong: true }, ['semester-1'])).toEqual(['semester-1', 'semester-2'])
    expect(withYearLong({}, ['semester-1'])).toEqual(['semester-1'])
  })
  it('is listed for Semester 2 in the subject list', () => {
    const d = realData()
    const code = Object.values(d.subjects).find((s) => s.yearLong)?.code
    expect(code).toBeTruthy()
    const rows = browseIndex(Object.values(d.subjects), { course: 'B-ARTS', year: 2026 })
    expect(rows.find((r) => r.subject.code === code)?.periods).toContain('semester-2')
  })
})
