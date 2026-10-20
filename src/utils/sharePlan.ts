import { PERIODS, type Period, type PlanTerm } from '@/engine'
import type { PlanSetup } from '@/composables/usePlan'

/**
 * A plan packed into a link, so it can be shared without a server: setup plus
 * terms, as compact JSON in base64url. Nothing personal (no marks) goes in it.
 */
interface Packed {
  v: 1
  // course, courseYear, startYear, startPeriod index, major, specialisation, field, minors comma-joined, second major,
  // diploma, diploma stream (the last five optional; older links lack them)
  s: [string, number, number, number, string, string, string?, string?, string?, string?, string?]
  t: [number, number, string[]][] // year, period index, codes
}

export function encodePlan(setup: PlanSetup, terms: PlanTerm[]): string {
  const packed: Packed = {
    v: 1,
    s: [setup.course, setup.courseYear, setup.startYear, PERIODS.indexOf(setup.startPeriod), setup.major, setup.specialisation, setup.field ?? '', setup.minors.join(',')],
    t: terms.map((term) => [term.year, PERIODS.indexOf(term.period), term.subjects]),
  }
  // Only when there is one, so links without a second major stay as they were.
  if (setup.major2 || setup.diploma) packed.s.push(setup.major2 ?? '')
  if (setup.diploma) packed.s.push(setup.diploma, setup.diplomaStream ?? '')
  const bytes = new TextEncoder().encode(JSON.stringify(packed))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The plan in a shared link, or null if the text isn't one (cut off, edited, from elsewhere). */
export function decodePlan(text: string): { setup: PlanSetup; terms: PlanTerm[] } | null {
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as Packed
    if (p.v !== 1 || !Array.isArray(p.s) || !Array.isArray(p.t)) return null
    const period = (i: number): Period => {
      const x = PERIODS[i]
      if (!x) throw new Error('bad period')
      return x
    }
    const code = /^[A-Z]{4}\d{5}$/
    const [course, courseYear, startYear, startPeriod, major, specialisation, field, minors, major2, diploma, diplomaStream] = p.s
    return {
      setup: { course: String(course), courseYear: Number(courseYear), startYear: Number(startYear), startPeriod: period(startPeriod), major: String(major), specialisation: String(specialisation), minors: minors ? String(minors).split(',').filter(Boolean) : [], ...(field ? { field: String(field) } : {}), ...(major2 ? { major2: String(major2) } : {}), ...(diploma ? { diploma: String(diploma) } : {}), ...(diplomaStream ? { diplomaStream: String(diplomaStream) } : {}) },
      terms: p.t.map(([year, pi, codes]) => ({ year: Number(year), period: period(pi), subjects: codes.filter((c) => code.test(c)) })),
    }
  } catch {
    return null
  }
}
