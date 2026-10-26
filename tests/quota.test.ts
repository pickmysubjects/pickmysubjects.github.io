import { describe, expect, it } from 'vitest'
import { isQuotaSubject } from '../src/engine/quota'
import { realData } from './realData'

const base = { notes: undefined, about: undefined, prerequisites: 'none', corequisites: 'none', recommended: [] } as unknown as Parameters<typeof isQuotaSubject>[0]

describe('isQuotaSubject', () => {
  it('reads the Handbook phrasings for a cap on places', () => {
    for (const notes of ['Quotas apply.', 'Quota of 30 students.', 'Places are limited.', 'places are quota-limited', 'A limited number of places'])
      expect(isQuotaSubject({ ...base, notes })).toBe(true)
  })

  it('leaves out look-alikes', () => {
    for (const notes of ['Uses quotation marks.', 'Enrolment is limited to BSc students.', 'Seminar places are listed on the LMS.'])
      expect(isQuotaSubject({ ...base, notes })).toBe(false)
  })

  it('finds quota text inside requisite notes too, and tags a few dozen real subjects', () => {
    expect(isQuotaSubject({ ...base, prerequisites: { all: [{ permission: 'application', note: 'A quota of 24 applies.' }] } as never })).toBe(true)
    const n = Object.values(realData().subjects).filter(isQuotaSubject).length
    expect(n).toBeGreaterThan(20)
    expect(n).toBeLessThan(80)
  })
})
