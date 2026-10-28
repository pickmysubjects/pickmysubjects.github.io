import { describe, expect, it } from 'vitest'
import { checkTerms } from '../src/engine/planCheck'
import { simplifyFor } from '../src/engine/expr'
import { unlockList } from '../src/engine/unlocks'
import { prereqGist } from '../src/i18n/gist'
import { describeReq } from '../src/i18n/format'
import { dataset, subject } from './helpers'

const intro = subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1', 'semester-2'] } })
const next = subject({ code: 'AAAA10002', prerequisites: { any: [{ any: [{ subject: 'AAAA10001' }, { subject: 'AAAA10003' }] }, { placement: 'programming' }] }, offerings: { 2026: ['semester-1', 'semester-2'] } })
// Needs AAAA10002 alone.
const strict = subject({ code: 'AAAA20001', level: 2, prerequisites: { subject: 'AAAA10002' }, categories: { 'B-SCI': 'science' }, offerings: { 2026: ['semester-1', 'semester-2'] } })
// Needs AAAA10002 or AAAA10001: met by the earlier one.
const either = subject({ code: 'AAAA20002', level: 2, prerequisites: { any: [{ subject: 'AAAA10001' }, { subject: 'AAAA10002' }] }, categories: { 'B-SCI': 'science' }, offerings: { 2026: ['semester-1', 'semester-2'] } })
const later = subject({ code: 'AAAA20003', level: 2, prerequisites: { subject: 'AAAA10002' }, categories: { 'B-SCI': 'science' }, offerings: { 2026: ['semester-1', 'semester-2'] } })
const graduate = subject({ code: 'AAAA90001', level: 9, prerequisites: { subject: 'AAAA10002' }, offerings: { 2026: ['semester-1'] } })
const masters = subject({ code: 'AAAA30001', level: 3, prerequisites: { any: [{ subject: 'AAAA10002' }, { admission: 'MC-X' }] }, categories: {}, offerings: { 2026: ['semester-1'] } })
const science = { 'B-SCI': 'science' } as Record<string, 'science'>
const data = dataset([intro, next, strict, either, later, graduate, masters].map((s) => ({ ...s, categories: s.code.startsWith('AAAA9') || s.code === 'AAAA30001' ? {} : science })))
const terms = [
  { year: 2027, period: 'semester-1' as const, subjects: ['AAAA10001'] },
  { year: 2027, period: 'semester-2' as const, subjects: ['AAAA10002', 'AAAA20001', 'AAAA20002'] },
  { year: 2028, period: 'semester-1' as const, subjects: [] },
]

describe('a prerequisite in the same semester', () => {
  it('the planner flags a subject planned with its only prerequisite', () => {
    const issues = checkTerms({ course: 'B-SCI', courseYear: 2026, completed: [], terms } as never, data)
    expect(issues.filter((i) => i.kind === 'prereq-unmet').map((i) => i.subject)).toEqual(['AAAA20001'])
  })

  it('the unlock list flags it too, and leaves out one met another way', () => {
    const list = unlockList('AAAA10002', data, { course: 'B-SCI', terms, completed: [] })
    expect(list[0]).toMatchObject({ code: 'AAAA20001', problem: 'same-term' })
    expect(list.map((e) => e.code)).not.toContain('AAAA20002')
  })
})

describe('the unlock list for an undergraduate', () => {
  const list = unlockList('AAAA10002', data, { course: 'B-SCI', terms, completed: [] })
  it('leaves out graduate subjects and ones open only through another course', () => {
    expect(list.map((e) => e.code)).not.toContain('AAAA90001')
    expect(list.map((e) => e.code)).not.toContain('AAAA30001')
  })
  it('keeps an unplanned subject, without a semester', () => {
    expect(list.find((e) => e.code === 'AAAA20003')).toMatchObject({ termIndex: null, problem: null })
  })
  it('keeps a graduate subject the student did plan', () => {
    const planned = [...terms.slice(0, 2), { year: 2028, period: 'semester-1' as const, subjects: ['AAAA90001'] }]
    expect(unlockList('AAAA10002', data, { course: 'B-SCI', terms: planned, completed: [] }).map((e) => e.code)).toContain('AAAA90001')
  })
})

describe('the prerequisite fact agrees with the rule', () => {
  const t = (key: string, p?: Record<string, unknown>) => `${key}${p ? JSON.stringify(p) : ''}`
  it('a nested "or" counts every way in', () => {
    const needs = simplifyFor(next.prerequisites, 'B-SCI')
    expect(prereqGist(t, needs)).toBe('subject.prereqRoutes{"n":3}')
    // The rule lists the same three, without brackets.
    expect(describeReq(t, next.prerequisites, 'B-SCI')).not.toContain('(')
    expect(describeReq(t, next.prerequisites, 'B-SCI').split('expr.or').length).toBe(3)
  })
})
