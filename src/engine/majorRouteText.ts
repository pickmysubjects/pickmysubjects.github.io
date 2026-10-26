import type { MajorRoute } from './majorRoute'

/** One subject of a major's route, as text: what it needs (all / one of) and what it leads to. */
export interface RouteLine {
  code: string
  needs: string[]
  oneOf: string[]
  leads: string[]
}

/** The route as lists by level: the text twin of the diagram (screen readers, search pages). */
export function routeLines(route: MajorRoute): { level: number; lines: RouteLine[] }[] {
  return route.columns.map((col) => ({
    level: col.level,
    lines: col.codes.map((code) => {
      const into = route.edges.filter((e) => e.to === code)
      return {
        code,
        needs: into.filter((e) => !e.oneOf).map((e) => e.from),
        oneOf: into.filter((e) => e.oneOf).map((e) => e.from),
        leads: route.edges.filter((e) => e.from === code).map((e) => e.to),
      }
    }),
  }))
}
