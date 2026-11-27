import { describe, expect, it } from 'vitest'
import { masterPlanningOpen } from '../src/release'

describe("master's planning opens with 1.2.0", () => {
  it('closed before 1.2.0, open from it', () => {
    expect(masterPlanningOpen('1.1.0')).toBe(false)
    expect(masterPlanningOpen('1.1.9')).toBe(false)
    expect(masterPlanningOpen('1.2.0')).toBe(true)
    expect(masterPlanningOpen('2.0.0')).toBe(true)
  })
})
