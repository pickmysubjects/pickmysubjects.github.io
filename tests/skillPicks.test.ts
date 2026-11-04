import { describe, expect, it } from 'vitest'
import { skillPicks } from '@/engine/skillPicks'
import { standingOf } from '@/engine/recommend'
import { realData } from './realData'

const data = realData()
const standing = (done: string[]) => standingOf({ results: done.map((code) => ({ code, mark: 70 })), credit: [], confirmed: [] } as never, data)

describe('subjects that would give a student a skill a job asks for', () => {
  it('lists subjects that teach it, in the student’s degree, not done or planned', () => {
    // ACCT10002 is the financial accounting subject for students outside Commerce (breadth in Science).
    const r = skillPicks('Financial Accounting', { data, course: 'B-SCI', done: [], planned: [], standing: standing([]) })
    expect(r.picks).toContain('ACCT10002')
    expect(r.planned).toEqual([])
    // Commerce doesn't count it: its own accounting subjects are ACCT10001 and up.
    expect(skillPicks('Financial Accounting', { data, course: 'B-COM', done: [], planned: [], standing: standing([]) }).picks).not.toContain('ACCT10002')
  })

  it('says when a planned subject already gives it, and never suggests one done or planned', () => {
    const r = skillPicks('Financial Accounting', { data, course: 'B-SCI', done: [], planned: ['ACCT10002'], standing: standing([]) })
    expect(r.planned).toEqual(['ACCT10002'])
    expect(r.picks).not.toContain('ACCT10002')
  })

  it('leaves out a subject that clashes with one done (non-allowed)', () => {
    const r = skillPicks('Microsoft Excel', { data, course: 'B-COM', done: ['ECON10005'], planned: [], standing: standing(['ECON10005']) })
    for (const c of r.picks) {
      const s = data.subjects[c]!
      expect(s.nonAllowed === 'unknown' ? [] : s.nonAllowed).not.toContain('ECON10005')
    }
  })

  it('suggests nothing for a skill no subject teaches', () => {
    expect(skillPicks('Building Relationships', { data, course: 'B-SCI', done: [], planned: [], standing: standing([]) }).picks).toEqual([])
  })
})
