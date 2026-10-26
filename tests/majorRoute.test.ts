import { describe, expect, it } from 'vitest'
import { majorOverview } from '../src/engine/roles'
import { majorRoute, routeChain } from '../src/engine/majorRoute'
import { routeLines } from '../src/engine/majorRouteText'
import { realData } from './realData'

const data = realData()
const routeOf = (course: string, id: string) => {
  const o = majorOverview(data, id, course)!
  return { o, r: majorRoute(data, o, course) }
}

describe('majorRoute (real data)', () => {
  it('has every overview subject as a node, with its role and level', () => {
    const { o, r } = routeOf('B-SCI', 'data-science')
    for (const c of o.core) expect(r.nodes[c]?.role).toBe('core')
    for (const p of o.pathway) expect(r.nodes[p.code]?.role).toBe('pathway')
    expect(r.nodes.COMP10002?.level).toBe(1)
    expect(r.nodes.COMP20008?.level).toBe(2)
    // A level-9 option sits in the last column.
    for (const n of Object.values(r.nodes)) expect([1, 2, 3]).toContain(n.level)
  })

  it('puts every node in exactly one column, levels in order', () => {
    for (const [course, id] of [['B-SCI', 'data-science'], ['B-COM', 'finance'], ['B-SCI', 'computing-and-software-systems']] as const) {
      const { r } = routeOf(course, id)
      const all = r.columns.flatMap((c) => c.codes)
      expect(new Set(all).size).toBe(all.length)
      expect(all.sort()).toEqual(Object.keys(r.nodes).sort())
      expect(r.columns.map((c) => c.level)).toEqual([...r.columns.map((c) => c.level)].sort())
      for (const c of r.columns) for (const code of c.codes) expect(r.nodes[code]!.level).toBe(c.level)
    }
  })

  it('links a subject to what its prerequisites name: AND solid, OR dashed', () => {
    const { r } = routeOf('B-SCI', 'data-science')
    expect(r.edges).toContainEqual({ from: 'COMP20008', to: 'COMP30027', oneOf: false })
    // COMP10002 needs COMP10001 or COMP10003.
    expect(r.edges).toContainEqual({ from: 'COMP10001', to: 'COMP10002', oneOf: true })
    expect(r.edges).toContainEqual({ from: 'COMP10003', to: 'COMP10002', oneOf: true })
    for (const e of r.edges) {
      expect(r.nodes[e.from]).toBeDefined()
      expect(r.nodes[e.to]).toBeDefined()
    }
  })

  it('keeps each "pick N" list together, with how many to pick', () => {
    const { o, r } = routeOf('B-COM', 'finance')
    expect(r.groups).toEqual(o.choices.map((c) => ({ pick: c.points / 12.5 })))
    const last = r.columns[r.columns.length - 1]!.codes
    const groups = last.map((c) => r.nodes[c]!.group).filter((g) => g !== undefined)
    // Contiguous: the group index never comes back once it changes.
    expect(groups).toEqual([...groups].sort((a, b) => a! - b!))
  })

  it('lights up a chain: what a subject needs and what it opens', () => {
    const { r } = routeOf('B-SCI', 'data-science')
    const chain = routeChain(r, 'COMP20008')
    expect(chain.has('COMP30027')).toBe(true)
    expect(chain.has('COMP10001')).toBe(true)
    expect(chain.has('MAST30025')).toBe(false)
  })

  it('says the same as text: needs, one of, leads to', () => {
    const { r } = routeOf('B-SCI', 'data-science')
    const lines = routeLines(r).flatMap((c) => c.lines)
    const comp30027 = lines.find((l) => l.code === 'COMP30027')!
    expect(comp30027.needs).toContain('COMP20008')
    const comp10002 = lines.find((l) => l.code === 'COMP10002')!
    expect(comp10002.oneOf).toEqual(expect.arrayContaining(['COMP10001', 'COMP10003']))
    expect(comp10002.leads).toContain('COMP30027')
  })
})
