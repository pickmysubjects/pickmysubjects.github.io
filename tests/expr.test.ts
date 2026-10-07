import { describe as group, expect, it } from 'vitest'
import { describe, evaluate, evaluateField, referencedSubjects } from '../src/engine/expr'
import { subjectFileSchema } from '../src/engine/schema'
import { subject } from './helpers'

const subjects = {
  AAAA10001: subject({ code: 'AAAA10001', level: 1 }),
  AAAA20001: subject({ code: 'AAAA20001', level: 2 }),
  BBBB20001: subject({ code: 'BBBB20001', level: 2 }),
}
const ctx = (done: string[], admittedCourse?: string) => ({ completed: new Set(done), subjects, admittedCourse })

group('schema', () => {
  it('expands a bare subject code into a subject node', () => {
    const s = subject({ code: 'AAAA30001', prerequisites: { all: ['AAAA10001', 'AAAA20001'] } })
    expect(s.prerequisites).toEqual({ all: [{ subject: 'AAAA10001' }, { subject: 'AAAA20001' }] })
  })

  it('defaults uncurated fields to unknown, never to none', () => {
    const s = subject({ code: 'AAAA30001' })
    expect(s.prerequisites).toBe('unknown')
    expect(s.offerings).toBe('unknown')
    expect(s.nonAllowed).toBe('unknown')
  })

  it('rejects malformed subject codes', () => {
    const r = subjectFileSchema.safeParse({ code: 'COMP1001', title: 'x', level: 1, points: 12.5, source_year: 2026 })
    expect(r.success).toBe(false)
  })
})

group('evaluate', () => {
  const both = { all: [{ subject: 'AAAA10001' }, { subject: 'AAAA20001' }] }

  it('all-of needs every part', () => {
    expect(evaluate(both, ctx(['AAAA10001'])).status).toBe('fail')
    expect(evaluate(both, ctx(['AAAA10001'])).unmet).toEqual(['AAAA20001'])
    expect(evaluate(both, ctx(['AAAA10001', 'AAAA20001'])).status).toBe('ok')
  })

  it('one-of is satisfied by any part', () => {
    const e = { any: [{ subject: 'AAAA10001' }, { subject: 'BBBB20001' }] }
    expect(evaluate(e, ctx(['BBBB20001'])).status).toBe('ok')
    expect(evaluate(e, ctx([])).status).toBe('fail')
  })

  it('manual text is unknown, and unknown never becomes ok on its own', () => {
    const e = { any: [{ subject: 'AAAA10001' }, { manual: 'Permission of coordinator' }] }
    expect(evaluate(e, ctx([])).status).toBe('unknown')
    expect(evaluate(e, ctx(['AAAA10001'])).status).toBe('ok')
    expect(evaluate({ all: [{ subject: 'AAAA10001' }, { manual: 'x' }] }, ctx(['AAAA10001'])).status).toBe('unknown')
  })

  it('a failing branch dominates all-of even when another branch is unknown', () => {
    expect(evaluate({ all: [{ subject: 'AAAA10001' }, { manual: 'x' }] }, ctx([])).status).toBe('fail')
  })

  it('counts points by level', () => {
    const e = { points: { min: 25, level: 2 } }
    expect(evaluate(e, ctx(['AAAA20001'])).status).toBe('fail')
    expect(evaluate(e, ctx(['AAAA20001', 'BBBB20001'])).status).toBe('ok')
    expect(evaluate(e, ctx(['AAAA10001', 'AAAA20001'])).status).toBe('fail')
  })

  it('treats completed-but-uncurated subjects as possibly counting', () => {
    expect(evaluate({ points: { min: 25 } }, ctx(['AAAA10001', 'ZZZZ10001'])).status).toBe('unknown')
  })

  it('checks admission against the student course', () => {
    const e = { admission: 'MC-SOFTENG' }
    expect(evaluate(e, ctx([], 'B-SCI')).status).toBe('fail')
    expect(evaluate(e, ctx([], 'MC-SOFTENG')).status).toBe('ok')
    expect(evaluate(e, ctx([])).status).toBe('unknown')
  })

  it('field shortcuts', () => {
    expect(evaluateField('none', ctx([])).status).toBe('ok')
    expect(evaluateField('unknown', ctx([])).status).toBe('unknown')
  })
})

group('describe / referencedSubjects', () => {
  it('describes nested expressions readably', () => {
    const e = { any: [{ all: [{ subject: 'COMP10002' }, { subject: 'COMP20008' }] }, { admission: 'MC-SOFTENG' }] }
    expect(describe(e)).toBe('(COMP10002 and COMP20008) or admission to MC-SOFTENG')
    expect(referencedSubjects(e)).toEqual(['COMP10002', 'COMP20008'])
  })
})
