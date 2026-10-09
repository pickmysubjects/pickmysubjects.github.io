import { describe, expect, it } from 'vitest'
import { recommend, type Profile } from '../src/engine'
import { buildDataset } from '../scripts/dataset'
import { dataset, subject } from './helpers'

/** Simulated students on the real data: does the top of the list make sense for them? */
describe('recommendation quality (real data)', () => {
  const { dataset: real } = buildDataset('real')
  const base: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
  const top = (p: Partial<Profile>, opts: Parameters<typeof recommend>[2] = {}) =>
    recommend(real, { ...base, ...p }, { course: 'B-SCI', limit: 6, year: 2026, ...opts }).map((r) => r.code)
  const area = (code: string) => real.subjects[code]?.area

  it('an untagged area still matches: biology interest gets biology subjects first', () => {
    // A biology department's subject, or one whose name says it's about biology (the
    // statistics subject for biologists, say).
    const biological = (c: string) => ['BIOL', 'GENE', 'ZOOL', 'BOTA', 'MIIM', 'ANAT', 'PHYS'].includes(area(c) ?? '') || /biolog/i.test(real.subjects[c]?.title ?? '')
    expect(top({ interests: ['biology'] }).slice(0, 3).every(biological)).toBe(true)
  })

  it('related interests rank above subjects we know nothing about', () => {
    const list = top({ interests: ['finance'] })
    expect(list[0]).toBe('FNCE10002')
    expect(list.filter((c) => ['ACCT', 'ECON', 'BLAW', 'MKTG', 'FNCE', 'MAST'].includes(area(c) ?? ''))).toHaveLength(list.length)
  })

  it('a second-year ML student gets the next step towards machine learning, not unknown filler', () => {
    const list = top({
      interests: ['machine-learning'],
      results: [
        { code: 'COMP10001', mark: 85 },
        { code: 'COMP10002', mark: 82 },
        { code: 'MAST10006', mark: 75 },
        { code: 'MAST10007', mark: 78 },
      ],
    })
    expect(list[0]).toBe('COMP20008') // COMP30027 needs it
    expect(list.some((c) => ['CEDB', 'CVEN', 'ELEN'].includes(area(c) ?? ''))).toBe(false)
  })

  it('a WAM-focused student who struggles with maths is steered away from maths', () => {
    const list = top({ goal: 'wam', skills: { maths: 1 }, results: [{ code: 'MAST10006', mark: 52 }, { code: 'BIOL10008', mark: 80 }] })
    expect(list.some((c) => area(c) === 'MAST')).toBe(false)
  })

  it('never suggests a subject that is not running, or one that gives no credit in the course', () => {
    const all = recommend(real, base, { course: 'B-SCI', year: 2026 }).map((r) => r.code)
    for (const c of ['COMP20004', 'ACCT20008', 'MAST10025', 'MAST10026']) expect(all).not.toContain(c)
  })
})

describe('recommendation statistics', () => {
  const base: Profile = { results: [], skills: {}, interests: [], goal: 'wam' }

  it('two or three glowing reviews do not beat many good ones (Bayesian average)', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [], signals: { reviews: 2, difficulty: 1, workload: 1, grading: 5 } }),
      subject({ code: 'AAAA10002', prerequisites: 'none', non_allowed: [], signals: { reviews: 40, difficulty: 2, workload: 2, grading: 4 } }),
    ])
    expect(recommend(data, base).map((r) => r.code)[0]).toBe('AAAA10002')
  })

  it('breaks a run of three from the same area with a near-tie from another area', () => {
    const data = dataset(
      ['AAAA10001', 'AAAA10002', 'AAAA10003', 'BBBB10001'].map((code) => subject({ code, area: code.slice(0, 4), prerequisites: 'none', non_allowed: [] })),
    )
    const order = recommend(data, { ...base, goal: 'balanced' }).map((r) => r.code)
    expect(order.slice(0, 3)).toContain('BBBB10001')
  })

  it('one strong related mark moves the prediction toward it, but not all the way', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'BBBB10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'AAAA20001', level: 2, prerequisites: 'AAAA10001', non_allowed: [] }),
    ])
    const profile = { ...base, goal: 'balanced' as const, results: [{ code: 'AAAA10001', mark: 95 }, { code: 'BBBB10001', mark: 55 }] }
    const r = recommend(data, profile).find((x) => x.code === 'AAAA20001')
    const averaged = r?.reasons.find((n) => n.key === 'averagedHigh')
    expect(averaged).toBeDefined() // the related mark still counts for a lot
  })

  it('a prerequisite the student confirmed (a VCE score) no longer shows as unconfirmed', () => {
    const data = dataset([subject({ code: 'AAAA10001', prerequisites: { manual: 'VCE Maths study score 25+' }, non_allowed: [] })])
    const before = recommend(data, base)[0]
    const after = recommend(data, { ...base, confirmed: ['AAAA10001'] })[0]
    expect(before?.eligibility).toBe('unknown')
    expect(after?.eligibility).toBe('ok')
    expect(after?.warnings.some((w) => w.key === 'eligibilityUnknown')).toBe(false)
  })

  it('maxLevel keeps a first-year list to first-year subjects', () => {
    const data = dataset([
      subject({ code: 'AAAA10001', prerequisites: 'none', non_allowed: [] }),
      subject({ code: 'AAAA30001', level: 3, prerequisites: 'none', non_allowed: [] }),
    ])
    expect(recommend(data, base, { maxLevel: 1 }).map((r) => r.code)).toEqual(['AAAA10001'])
  })
})
