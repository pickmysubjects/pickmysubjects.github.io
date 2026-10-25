/**
 * Synthetic students for checking the grade model: subjects with a known difficulty, students
 * with a known ability, and the anonymous band rows they would share. Seeded, so every run sees
 * the same world. Nothing here is real data.
 */
import { bandOf, wamBandOf, type GradeRow } from '../src/engine/grades'

/** A small seeded generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A standard normal draw (Box–Muller). */
export function normal(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
}

export interface World {
  /** Code → true offset (marks above the student's own level). */
  delta: Map<string, number>
  /** Codes only strong students take. */
  advanced: Set<string>
  students: { theta: number; marks: Map<string, number> }[]
}

export interface WorldOptions {
  seed: number
  subjects?: number
  /** The last this-many subjects are taken only by the strongest students… */
  advanced?: number
  /** …this share of them (a quarter when left out). */
  strongShare?: number
  students?: number
  perStudent?: number
  /** Spread of true offsets (0: every subject grades the same). */
  deltaSd?: number
  /** Within-student noise of a mark. */
  noise?: number
  /** A fixed offset for each code, overriding the draw. */
  fixed?: (code: string, i: number) => number | undefined
}

export const codeOf = (i: number) => `SYNT${String(10000 + i).padStart(5, '0')}`

/** Students take subjects at random (advanced ones only when strong); marks = ability + offset + noise. */
export function makeWorld(o: WorldOptions): World {
  const rand = rng(o.seed)
  const nSubjects = o.subjects ?? 60
  const nAdvanced = o.advanced ?? 15
  const codes = Array.from({ length: nSubjects }, (_, i) => codeOf(i))
  const delta = new Map(codes.map((c, i) => [c, o.fixed?.(c, i) ?? (o.deltaSd ?? 3) * normal(rand)]))
  const advanced = new Set(codes.slice(nSubjects - nAdvanced))
  const thetas = Array.from({ length: o.students ?? 600 }, () => 70 + 8 * normal(rand))
  const strong = [...thetas].sort((a, b) => b - a)[Math.floor(thetas.length * (o.strongShare ?? 0.25))]!
  const students = thetas.map((theta) => {
    const open = codes.filter((c) => !advanced.has(c) || theta >= strong)
    const picked = open.map((c) => ({ c, k: rand() })).sort((a, b) => a.k - b.k).slice(0, o.perStudent ?? 24)
    const marks = new Map(picked.map(({ c }) => [c, Math.max(0, Math.min(100, Math.round(theta + delta.get(c)! + (o.noise ?? 7) * normal(rand))))]))
    return { theta, marks }
  })
  return { delta, advanced, students }
}

/** The band rows students share: for a share of their marks, the band and the WAM without it. */
export function shareRows(world: World, seed: number, share = 0.15): GradeRow[] {
  const rand = rng(seed)
  const rows: GradeRow[] = []
  for (const st of world.students) {
    const all = [...st.marks]
    for (const [code, mark] of all) {
      if (rand() >= share) continue
      const others = all.filter(([c]) => c !== code).map(([, m]) => m)
      rows.push({ code, band: bandOf(mark), wamBand: wamBandOf(others.reduce((a, b) => a + b, 0) / others.length) })
    }
  }
  return rows
}
