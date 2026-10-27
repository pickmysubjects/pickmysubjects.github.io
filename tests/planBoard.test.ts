import { describe, expect, it } from 'vitest'
import type { Plan } from '../src/engine/plan'
import { boardEdges, chainOf, dropVerdict } from '../src/utils/planBoard'
import { dataset, subject } from './helpers'

const s1 = { '2026': ['semester-1'] }
const both = { '2026': ['semester-1', 'semester-2'] }
const data = dataset([
  subject({ code: 'AAAA10001', offerings: both, prerequisites: 'none' }),
  subject({ code: 'AAAA20001', level: 2, offerings: both, prerequisites: 'AAAA10001' }),
  subject({ code: 'AAAA30001', level: 3, offerings: both, prerequisites: 'AAAA20001' }),
  subject({ code: 'BBBB10001', offerings: s1, prerequisites: 'none' }),
])
const terms: Plan['terms'] = [
  { year: 2026, period: 'semester-1', subjects: ['AAAA10001', 'BBBB10001'] },
  { year: 2026, period: 'semester-2', subjects: ['AAAA20001'] },
  { year: 2027, period: 'semester-1', subjects: ['AAAA30001'] },
  { year: 2027, period: 'semester-2', subjects: [] },
]
const plan: Plan = { course: 'X', courseYear: 2026, completed: [], terms }

describe('plan board', () => {
  it('links prerequisites earlier to later, and walks the whole chain both ways', () => {
    const edges = boardEdges(terms, undefined, data.subjects)
    expect(edges).toEqual([
      { from: 'AAAA10001', to: 'AAAA20001' },
      { from: 'AAAA20001', to: 'AAAA30001' },
    ])
    const { needs, unlocks } = chainOf('AAAA20001', edges)
    expect([...needs]).toEqual(['AAAA10001'])
    expect([...unlocks]).toEqual(['AAAA30001'])
    expect([...chainOf('AAAA30001', edges).needs].sort()).toEqual(['AAAA10001', 'AAAA20001'])
  })

  it('says why a subject cannot be dropped into a term', () => {
    // Not timetabled then: allowed with a warning (past subjects are recorded where they were taken).
    expect(dropVerdict(plan, data, 'BBBB10001', 0, 1)).toEqual({ ok: true, warn: 'notOffered' })
    expect(dropVerdict(plan, data, 'AAAA20001', 1, 2)).toEqual({ ok: false, reason: 'unlocksEarlier' })
    expect(dropVerdict(plan, data, 'AAAA30001', 2, 1)).toEqual({ ok: false, reason: 'prereqLater' })
    expect(dropVerdict(plan, data, 'AAAA30001', 2, 3)).toEqual({ ok: true })
    expect(dropVerdict(plan, data, 'AAAA30001', 2, 2)).toEqual({ ok: false, reason: 'same' })
  })
})

describe('slotEligible', () => {
  it('suggests only terms a subject runs in, but a search may pick any term (with a warning)', async () => {
    const { slotEligible } = await import('../src/utils/planBoard')
    const s = subject({ code: 'BBBB10001', offerings: s1, prerequisites: 'none', categories: { X: 'science' } })
    const s2 = { year: 2026, period: 'semester-2' as const }
    expect(slotEligible(s, s2, 'X', new Set())).toBe(false)
    expect(slotEligible(s, s2, 'X', new Set(), true)).toBe(true)
    // Still never one already in the plan, or one that doesn't count in the degree.
    expect(slotEligible(s, s2, 'X', new Set(['BBBB10001']), true)).toBe(false)
    expect(slotEligible(s, s2, 'Y', new Set(), true)).toBe(false)
  })
})
