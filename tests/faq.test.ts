import { describe, expect, it } from 'vitest'
import { interpolate } from '../src/i18n'
import { subjectFaq } from '../src/i18n/faq'
import { en } from '../src/i18n/messages/en'
import { subject } from './helpers'

function lookup(key: string): string {
  let node: unknown = en
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part]
  return typeof node === 'string' ? node : key
}
const t = (key: string, params?: Record<string, string | number>) => interpolate(lookup(key), params)
const ctx = { year: 2026, course: 'B-SCI', unlocks: [] as string[], listSep: ', ', sentenceSep: ' ', locale: 'en' }

describe('subjectFaq', () => {
  it('answers only what is recorded, never guessing', () => {
    const s = subject({ code: 'AAAA10001', offerings: 'unknown', prerequisites: 'unknown' })
    expect(subjectFaq(t, s, ctx)).toEqual([])
  })

  it('gives the exam share, the hurdle and the full split', () => {
    const s = subject({
      code: 'AAAA10001',
      offerings: { '2026': ['semester-1'] },
      prerequisites: 'none',
      assessment: [
        { kind: 'exam', weight: 60, hurdle: true },
        { kind: 'assignment', weight: 40 },
      ],
    })
    const exam = subjectFaq(t, s, ctx).find((f) => f.q === 'Does AAAA10001 have a final exam?')
    expect(exam?.a).toBe('Yes, the final exam is 60% of the mark. You must pass the exam on its own. Assessment: Final exam 60%, Assignments 40%.')
  })

  it('says there is no exam when none is assessed', () => {
    const s = subject({ code: 'AAAA10001', prerequisites: 'none', assessment: [{ kind: 'project', weight: 100 }] })
    expect(subjectFaq(t, s, ctx).find((f) => f.q.includes('final exam'))?.a).toMatch(/^No, there is no final exam\./)
  })

  it('asks "is it hard" only with enough ratings or a review summary', () => {
    const few = subject({ code: 'AAAA10001', prerequisites: 'none', signals: { reviews: 2, difficulty: 4, workload: 4 } })
    expect(subjectFaq(t, few, ctx).some((f) => f.q === 'Is AAAA10001 hard?')).toBe(false)
    const many = subject({ code: 'AAAA10001', prerequisites: 'none', signals: { reviews: 5, difficulty: 4, workload: 3 } })
    expect(subjectFaq(t, many, ctx).find((f) => f.q === 'Is AAAA10001 hard?')?.a).toBe('Students rate its difficulty 4/5 and workload 3/5 (5 ratings).')
  })

  it('names a few follow-on subjects and counts all of them', () => {
    const s = subject({ code: 'AAAA10001', prerequisites: 'none' })
    const leads = subjectFaq(t, s, { ...ctx, unlocks: ['B1', 'B2', 'B3', 'B4', 'B5'] }).find((f) => f.q.startsWith('What can I take after'))
    expect(leads?.a).toBe('5 subjects need it first, for example B1, B2, B3, B4.')
  })
})
