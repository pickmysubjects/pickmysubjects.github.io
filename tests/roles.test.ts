import { describe, expect, it } from 'vitest'
import { subjectRoles } from '../src/engine/roles'
import { demo } from './helpers'
import { realData } from './realData'

describe('subjectRoles (real data)', () => {
  const data = realData()
  const roles = (code: string) => subjectRoles(data, code, 'B-SCI').map((r) => `${r.component}:${r.role}${r.via ? `>${r.via}` : ''}`)

  it('marks compulsory subjects of a major', () => {
    expect(roles('COMP30023')).toContain('computing-and-software-systems:core')
  })

  it('marks a subject that can\'t be skipped on the way to a major', () => {
    // COMP20007's prerequisites have no way round COMP10002.
    expect(roles('COMP10002')).toContain('data-science:pathway>COMP30027')
  })

  it('marks a usual first step that has alternatives as a route, not a must', () => {
    // COMP10002 can also follow COMP10003 or the programming competency test.
    expect(roles('COMP10001')).toContain('computing-and-software-systems:route>COMP30022')
  })

  it('marks options', () => {
    expect(roles('COMP30027')).toContain('artificial-intelligence:option')
  })

  it('works on the demo data too', () => {
    expect(() => subjectRoles(demo(), 'AAAA10001', 'X')).not.toThrow()
  })
})

describe('a major’s overview is worked out once', () => {
  // Every suggestion list with a major, the plan's stress check (every major of the student's
  // course and of B-SCI) and the plan builder ask for it: uncached, a non-Science student's first
  // planner view spent seconds on it, the page frozen.
  it('returns the same overview again without working it out anew, and the same answer', async () => {
    const { majorOverview, planRoles } = await import('../src/engine/roles')
    const data = realData()
    const first = majorOverview(data, 'computing-and-software-systems', 'B-SCI')
    expect(first?.core).toContain('COMP30023')
    expect(majorOverview(data, 'computing-and-software-systems', 'B-SCI')).toBe(first)
    // Another view of the data (another degree's) is its own.
    const other = { ...data, subjects: { ...data.subjects } }
    expect(majorOverview(other, 'computing-and-software-systems', 'B-SCI')).toEqual(first)
    expect(majorOverview(other, 'computing-and-software-systems', 'B-SCI')).not.toBe(first)
    const roles = planRoles(data, 'B-SCI', 2026, ['computing-and-software-systems'])
    expect([...roles.required]).toEqual(expect.arrayContaining(first!.core))
  })
})
