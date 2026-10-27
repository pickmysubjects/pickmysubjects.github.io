import type { Dataset, ReqExpr, ReqField } from './schema'
import { simplifyFor } from './expr'
import type { MajorOverview } from './roles'

/**
 * A major's prerequisite route as a layered graph: subjects in columns by level, links from
 * each subject to the ones its prerequisites name. Pure and computed once per major.
 */
export type RouteRole = 'core' | 'choice' | 'pathway' | 'route'

export interface RouteNode {
  code: string
  level: number
  role: RouteRole
  /** For a 'choice' node: which "pick N" list it's in (index into overview.choices). */
  group?: number
}

export interface RouteEdge {
  from: string
  to: string
  /** Only one of several ways in (an OR branch): drawn dashed. */
  oneOf: boolean
}

export interface RouteColumn {
  level: number
  /** Codes top to bottom; choice groups stay together, in list order. */
  codes: string[]
}

export interface MajorRoute {
  nodes: Record<string, RouteNode>
  edges: RouteEdge[]
  columns: RouteColumn[]
  /** The "pick N" lists: how many subjects to pick. */
  groups: { pick: number }[]
}

const ROLE_ORDER: RouteRole[] = ['core', 'choice', 'pathway', 'route']

/** Subject codes an expression names, each marked whether it sits under an OR with alternatives. */
function refs(field: ReqField): Map<string, boolean> {
  const out = new Map<string, boolean>()
  if (field === 'none' || field === 'unknown') return out
  const add = (code: string, oneOf: boolean) => out.set(code, (out.get(code) ?? true) && oneOf)
  const walk = (e: ReqExpr, oneOf: boolean): void => {
    if ('subject' in e) add(e.subject, oneOf)
    else if ('all' in e) e.all.forEach((x) => walk(x, oneOf))
    else if ('any' in e) e.any.forEach((x) => walk(x, oneOf || e.any.length > 1))
    // "25 points from A, B, C" is one way among a list.
    else if ('points' in e && e.points.from) e.points.from.forEach((c) => add(c, true))
  }
  walk(field, false)
  return out
}

/** Forward-and-back passes that reorder columns to cut line crossings (more barely helps). */
const SWEEPS = 3

export function majorRoute(data: Dataset, overview: MajorOverview, course: string): MajorRoute {
  const nodes: Record<string, RouteNode> = {}
  const put = (code: string, role: RouteRole, group?: number) => {
    if (nodes[code]) return
    const level = Math.min(3, Math.max(1, data.subjects[code]?.level ?? 3))
    nodes[code] = group === undefined ? { code, level, role } : { code, level, role, group }
  }
  overview.core.forEach((c) => put(c, 'core'))
  overview.choices.forEach((g, i) => g.from.forEach((c) => put(c, 'choice', i)))
  overview.pathway.forEach((p) => put(p.code, 'pathway'))
  overview.routes.forEach((p) => put(p.code, 'route'))

  const edges: RouteEdge[] = []
  for (const to of Object.keys(nodes).sort()) {
    const s = data.subjects[to]
    if (!s) continue
    for (const [from, oneOf] of refs(simplifyFor(s.prerequisites, course))) {
      if (from !== to && nodes[from]) edges.push({ from, to, oneOf })
    }
  }

  // Columns: level 3 in role/list order; earlier columns ordered by where their links go
  // (the mean row of what they lead to), which keeps most lines from crossing.
  const rank = (n: RouteNode) => ROLE_ORDER.indexOf(n.role) * 1000 + (n.group ?? 0)
  const levels = [...new Set(Object.values(nodes).map((n) => n.level))].sort((a, b) => a - b)
  const byLevel = new Map(levels.map((l) => [l, Object.values(nodes).filter((n) => n.level === l)]))
  const row = new Map<string, number>()
  const order = (list: RouteNode[], score: (n: RouteNode) => number) =>
    [...list].sort((a, b) => rank(a) - rank(b) || score(a) - score(b) || a.code.localeCompare(b.code))
  const mean = (rows: number[]) => (rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : Number.MAX_SAFE_INTEGER)
  // Where a subject's links go (later columns) or come from (earlier ones), as a mean row.
  const toward = (n: RouteNode) => mean(edges.filter((e) => e.from === n.code && nodes[e.to]!.level > n.level).map((e) => row.get(e.to)!))
  const from = (n: RouteNode) => mean(edges.filter((e) => e.to === n.code && nodes[e.from]!.level < n.level).map((e) => row.get(e.from)!))
  const place = (codes: string[]) => codes.forEach((c, i) => row.set(c, i))
  const byCol = new Map<number, string[]>()
  for (const level of [...levels].reverse()) {
    const list = byLevel.get(level)!
    const codes = level === levels[levels.length - 1] ? order(list, () => 0).map((n) => n.code) : order(list, toward).map((n) => n.code)
    place(codes)
    byCol.set(level, codes)
  }
  // Then sweeps forward and back: the last column follows where its links come from (within
  // its role order), and the earlier ones settle again, so fewer lines cross.
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    for (const level of levels.slice(1)) {
      const codes = order(byLevel.get(level)!, from).map((n) => n.code)
      place(codes)
      byCol.set(level, codes)
    }
    for (const level of [...levels].reverse().slice(1)) {
      const codes = order(byLevel.get(level)!, toward).map((n) => n.code)
      place(codes)
      byCol.set(level, codes)
    }
  }
  const columns: RouteColumn[] = levels.map((level) => ({ level, codes: byCol.get(level)! }))
  return { nodes, edges, columns, groups: overview.choices.map((c) => ({ pick: c.points / 12.5 })) }
}

/** Everything a subject needs (directly or not) and everything it leads to, itself included. */
export function routeChain(route: MajorRoute, code: string): Set<string> {
  const out = new Set([code])
  const walk = (c: string, dir: 'up' | 'down') => {
    for (const e of route.edges) {
      const [here, next] = dir === 'up' ? [e.to, e.from] : [e.from, e.to]
      if (here === c && !out.has(next)) {
        out.add(next)
        walk(next, dir)
      }
    }
  }
  walk(code, 'up')
  walk(code, 'down')
  return out
}
