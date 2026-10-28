import { describe, expect, it } from 'vitest'
import type { ReqField } from '../src/engine/schema'
import { finalExamShare, prereqGist, subjectGist } from '../src/i18n/gist'
import { interpolate, type Params, type Translate } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { realData } from './realData'
import { subject } from './helpers'

const t: Translate = (key: string, params?: Params) => {
  let node: unknown = en
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part]
  return interpolate(typeof node === 'string' ? node : key, params)
}
const s = (code: string) => ({ subject: code })

describe("the subject page's key facts", () => {
  it('sums the final exam share, says 0 for none and null when not recorded', () => {
    expect(finalExamShare(subject({ code: 'TEST10001', assessment: [{ kind: 'exam', weight: 50 }, { kind: 'project', weight: 50 }] }))).toBe(50)
    expect(finalExamShare(subject({ code: 'TEST10001', assessment: [{ kind: 'project', weight: 100 }] }))).toBe(0)
    expect(finalExamShare(subject({ code: 'TEST10001' }))).toBeNull()
  })

  it('leaves the exam share out of the chips when the hero shows it', () => {
    const x = subject({ code: 'TEST10001', assessment: [{ kind: 'exam', weight: 70 }, { kind: 'assignment', weight: 30, group: true }] })
    expect(subjectGist(t, x)[0]).toContain('70%')
    expect(subjectGist(t, x, { exam: false }).some((g) => g.includes('70%'))).toBe(false)
    expect(subjectGist(t, x, { exam: false })).toHaveLength(subjectGist(t, x).length - 1)
  })

  it('says prerequisites in a word or two, and never claims more than the rule says', () => {
    const cases: [ReqField, string][] = [
      ['none', 'None'],
      ['unknown', 'Not recorded'],
      [s('AAAA10001'), 'AAAA10001'],
      [{ all: [s('AAAA10001'), s('BBBB10001')] }, 'AAAA10001 + BBBB10001'],
      [{ all: [s('AAAA10001'), s('BBBB10001'), s('CCCC10001')] }, 'All 3 subjects'],
      [{ any: [s('AAAA10001'), s('BBBB10001')] }, 'One of 2 subjects'],
      [{ any: [{ all: [s('AAAA10001'), s('BBBB10001')] }, s('CCCC10001')] }, 'One of 2 routes'],
      [{ all: [{ any: [s('AAAA10001'), s('BBBB10001')] }, s('CCCC10001')] }, 'See below'],
    ]
    for (const [field, want] of cases) expect(prereqGist(t, field)).toBe(want)
  })

  it('gives every real subject a short prerequisite line', () => {
    for (const x of Object.values(realData().subjects)) {
      const line = prereqGist(t, x.prerequisites)
      expect(line.length, x.code).toBeGreaterThan(0)
      expect(line.length, x.code).toBeLessThanOrEqual(24)
    }
  })
})
