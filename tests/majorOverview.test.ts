import { describe, expect, it } from 'vitest'
import { majorOverview, sharedSubjects } from '../src/engine/roles'
import { buildDataset } from '../scripts/dataset'

describe('majorOverview (real data)', () => {
  const { dataset: data } = buildDataset('real')

  it('lists the core level-3 subjects', () => {
    expect(majorOverview(data, 'data-science', 'B-SCI')?.core).toEqual(['COMP30027', 'MAST30025', 'MAST30027', 'MAST30034'])
  })

  it('finds earlier subjects the major cannot be done without', () => {
    const o = majorOverview(data, 'data-science', 'B-SCI')!
    const codes = o.pathway.map((p) => p.code)
    // COMP20007 has no way round COMP10002, and COMP30027 needs COMP20007.
    expect(codes).toContain('COMP10002')
    for (const p of o.pathway) expect(o.core.concat(o.choices.flatMap((c) => c.from), codes)).toContain(p.via)
  })

  it('never lists a level-3 major subject as a pathway subject too', () => {
    const o = majorOverview(data, 'data-science', 'B-SCI')!
    expect(o.pathway.some((p) => o.core.includes(p.code))).toBe(false)
  })

  it('returns null for an unknown major', () => {
    expect(majorOverview(data, 'nope', 'B-SCI')).toBeNull()
  })

  it('finds subjects two majors share', () => {
    const a = majorOverview(data, 'data-science', 'B-SCI')!
    const b = majorOverview(data, 'mathematics-and-statistics-statistics', 'B-SCI')!
    expect(sharedSubjects(a, b).length).toBeGreaterThan(0)
    expect(sharedSubjects(a, a).length).toBeGreaterThanOrEqual(a.core.length)
  })

  it('works out every major quickly enough to render', () => {
    const start = performance.now()
    for (const c of data.components) majorOverview(data, c.id, c.course)
    expect(performance.now() - start).toBeLessThan(15000)
  })
})

describe('planRoles', () => {
  const { dataset: data } = buildDataset('real')
  it('marks the course-compulsory subject and the major core as required', async () => {
    const { planRoles } = await import('../src/engine/roles')
    const r = planRoles(data, 'B-SCI', 2026, ['data-science'])
    expect(r.required.has('SCIE10005')).toBe(true)
    expect(r.required.has('COMP30027')).toBe(true)
    expect(r.required.has('COMP10002')).toBe(true) // can't be skipped on the way in
  })
  it('marks a major choice list as options, never as required', async () => {
    const { planRoles } = await import('../src/engine/roles')
    const r = planRoles(data, 'B-SCI', 2026, ['psychology'])
    expect(r.options.has('PSYC30014')).toBe(true)
    expect(r.required.has('PSYC30014')).toBe(false)
  })
  it('with no major, only the course rules count', async () => {
    const { planRoles } = await import('../src/engine/roles')
    const r = planRoles(data, 'B-SCI', 2026, [''])
    expect([...r.required]).toEqual(['SCIE10005'])
    expect(r.options.size).toBe(0)
  })
})
