import { describe, expect, it } from 'vitest'
import { gradeOffsets, wamBandMid, type GradeOffset, type GradeRow } from '../src/engine/grades'
import { predictMark, RANGE_SHARE } from '../src/engine/predict'
import { dataset, subject } from './helpers'
import { makeWorld, shareRows, type World } from './synthetic'

/**
 * Synthetic students with a known ability and subjects with a known difficulty: do the published
 * offsets get the difficulty back? Seeded, so the same world every run.
 */

/** The estimator before 2026-10-25: band midpoints (H1 = 85) minus the WAM-range middle, shrunk by 5. */
function midpointOffsets(rows: GradeRow[]): Record<string, GradeOffset> {
  const MID: Record<string, number> = { H1: 85, H2A: 77, H2B: 72, H3: 67, P: 57, N: 40 }
  const diffs = new Map<string, number[]>()
  for (const r of rows) diffs.set(r.code, [...(diffs.get(r.code) ?? []), MID[r.band]! - wamBandMid(r.wamBand)!])
  const out: Record<string, GradeOffset> = {}
  for (const [code, ds] of diffs) if (ds.length >= 5) out[code] = { offset: ds.reduce((a, b) => a + b, 0) / (ds.length + 5), n: ds.length }
  return out
}

/**
 * Offsets are against the sharers' own WAM, which already holds the average subject's grading,
 * so the truth to compare with is each offset less the average over everything taken.
 */
function centred(world: World): Map<string, number> {
  let sum = 0
  let n = 0
  for (const st of world.students) for (const c of st.marks.keys()) (sum += world.delta.get(c)!), n++
  return new Map([...world.delta].map(([c, d]) => [c, d - sum / n]))
}

interface Recovery {
  general: number
  advanced: number
  coverage: number
}

/** Mean error (estimate − truth) for ordinary and strong-cohort subjects, and how often the 80% interval holds the truth. */
function recovery(seeds: number[], deltaSd: number, estimate: (rows: GradeRow[]) => Record<string, GradeOffset>): Recovery {
  const general: number[] = []
  const advanced: number[] = []
  const covered: number[] = []
  for (const seed of seeds) {
    // A tenth of subjects taken only by the top 5% of students: where midpoints went wrong.
    const world = makeWorld({ seed, deltaSd, students: 3000, advanced: 10, strongShare: 0.05, noise: 8 })
    const truth = centred(world)
    const out = estimate(shareRows(world, seed + 100, 0.2))
    for (const [code, g] of Object.entries(out)) {
      const err = g.offset - truth.get(code)!
      ;(world.advanced.has(code) ? advanced : general).push(err)
      if (g.sd !== undefined) covered.push(Math.abs(err) <= 1.2816 * g.sd ? 1 : 0)
    }
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  return { general: mean(general), advanced: mean(advanced), coverage: covered.length ? mean(covered) : NaN }
}

describe('grade offsets on synthetic students', () => {
  const seeds = [1, 2, 3, 4, 5]

  it('every subject grading the same: no offset to speak of, strong cohort included', () => {
    const r = recovery(seeds, 0, (rows) => gradeOffsets(rows))
    expect(Math.abs(r.general)).toBeLessThan(0.5)
    expect(Math.abs(r.advanced)).toBeLessThan(1)
  })

  it('subjects that differ: offsets come back without bias, and 80% intervals hold the truth about 80% of the time', () => {
    const r = recovery(seeds, 3, (rows) => gradeOffsets(rows))
    expect(Math.abs(r.general)).toBeLessThan(0.5)
    expect(Math.abs(r.advanced)).toBeLessThan(1)
    expect(r.coverage).toBeGreaterThanOrEqual(0.7)
    expect(r.coverage).toBeLessThanOrEqual(0.9)
  })

  it('the old midpoint estimator fails the same check: strong students’ subjects look harder than they are', () => {
    for (const sd of [0, 3]) expect(recovery(seeds, sd, midpointOffsets).advanced).toBeLessThan(-1)
  })
})

describe('likely marks on synthetic students', () => {
  // Every student's last subject is held out and predicted from the rest.
  const world = makeWorld({ seed: 11, deltaSd: 3, students: 400, noise: 8 })
  const truth = centred(world)
  const codes = [...world.delta.keys()]
  const build = (known: boolean) =>
    dataset(
      codes.map((code, i) => {
        const s = subject({ code, area: `AREA${i % 6}`, prerequisites: 'none' })
        return known ? { ...s, gradeOffset: { offset: truth.get(code)!, sd: 0.5, n: 20 } } : s
      }),
    )

  function run(known: boolean) {
    const data = build(known)
    const err: number[] = []
    const errWam: number[] = []
    const inside: number[] = []
    for (const st of world.students) {
      const all = [...st.marks]
      const [code, actual] = all[all.length - 1]!
      const marks = new Map(all.slice(0, -1))
      const guess = predictMark(data.subjects[code]!, marks, data)!
      const wam = [...marks.values()].reduce((a, b) => a + b, 0) / marks.size
      err.push(Math.abs(guess.mark - actual))
      errWam.push(Math.abs(wam - actual))
      inside.push(actual >= guess.low && actual <= guess.high ? 1 : 0)
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    return { mae: mean(err), maeWam: mean(errWam), coverage: mean(inside) }
  }

  it('once each subject’s grading is known, beats the plain WAM', () => {
    const r = run(true)
    expect(r.mae).toBeLessThan(r.maeWam - 0.2)
  })

  it('with no shared grades, is never much worse than the plain WAM', () => {
    const r = run(false)
    expect(r.mae).toBeLessThan(r.maeWam + 0.2)
  })

  it(`the range holds the mark about ${RANGE_SHARE * 100}% of the time, as it says`, () => {
    for (const known of [false, true]) {
      const r = run(known)
      expect(Math.abs(r.coverage - RANGE_SHARE)).toBeLessThan(0.07)
    }
  })
})
