import { describe, expect, it } from 'vitest'
import { subjectRoles } from '../src/engine/roles'
import { demo } from './helpers'
import { buildDataset } from '../scripts/dataset'

describe('subjectRoles (real data)', () => {
  const { dataset: data } = buildDataset('real')
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
