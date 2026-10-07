import { describe, expect, it } from 'vitest'
import { summariseAssessment } from '../src/utils/assessment'
import { subject } from './helpers'

describe('summariseAssessment', () => {
  it('adds up each kind and the group share, biggest first', () => {
    const s = subject({
      code: 'AAAA10001',
      assessment: [
        { kind: 'project', weight: 20 },
        { kind: 'project', weight: 20, group: true },
        { kind: 'exam', weight: 60, hurdle: true },
      ],
    })
    expect(summariseAssessment(s.assessment)).toEqual({
      parts: [
        { kind: 'exam', weight: 60 },
        { kind: 'project', weight: 40 },
      ],
      exam: 60,
      group: 20,
      examHurdle: true,
      otherHurdle: false,
    })
  })

  it('reports no exam and hurdles elsewhere, and nothing when assessment is unknown', () => {
    const s = subject({ code: 'AAAA10001', assessment: [{ kind: 'project', weight: 100, group: true, hurdle: true }] })
    expect(summariseAssessment(s.assessment)).toMatchObject({ exam: 0, group: 100, examHurdle: false, otherHurdle: true })
    expect(summariseAssessment(subject({ code: 'AAAA10002' }).assessment)).toBeNull()
    expect(summariseAssessment('unknown')).toBeNull()
  })
})
