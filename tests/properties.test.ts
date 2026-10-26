import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { offeredIn } from '../src/engine/availability'
import { easeKey, rankSubject } from '../src/engine/easeRanking'
import { referencedSubjects } from '../src/engine/expr'
import type { Plan } from '../src/engine/plan'
import { checkTerms } from '../src/engine/planCheck'
import { predictMark } from '../src/engine/predict'
import type { Profile } from '../src/engine/recommend'
import { balanceTerms, termScores } from '../src/engine/relieve'
import type { Subject } from '../src/engine/schema'
import { rng } from './synthetic'

/**
 * Properties that must hold whatever the data: checked over seeded random cases on the real
 * subjects, so a change that breaks one shows up even where no hand-written case looks.
 */
const data = realData()
const all = Object.values(data.subjects).sort((a, b) => a.code.localeCompare(b.code))

describe('the likely mark', () => {
  it('a higher prerequisite mark never lowers it', () => {
    const rand = rng(31)
    const withPrereqs = all.filter((s) => referencedSubjects(s.prerequisites).some((c) => data.subjects[c]))
    for (let i = 0; i < 300; i++) {
      const s = withPrereqs[Math.floor(rand() * withPrereqs.length)]!
      const pre = referencedSubjects(s.prerequisites).find((c) => data.subjects[c])!
      const others = Array.from({ length: Math.floor(rand() * 8) }, () => all[Math.floor(rand() * all.length)]!.code)
      const marks = new Map([...others.map((c) => [c, 40 + Math.round(rand() * 60)] as [string, number]), [pre, 40 + Math.round(rand() * 50)]])
      const before = predictMark(s, marks, data)!.mark
      marks.set(pre, marks.get(pre)! + 1 + Math.round(rand() * 9))
      expect(predictMark(s, marks, data)!.mark, `${s.code} after ${pre}`).toBeGreaterThanOrEqual(before)
    }
  })
})

describe('ease', () => {
  const ranked = all.filter((s) => rankSubject(s, 'easy'))

  it('a more generous shared-grade offset never makes a subject look harder', () => {
    const rand = rng(32)
    for (let i = 0; i < 300; i++) {
      const s = ranked[Math.floor(rand() * ranked.length)]!
      const lo = -8 + rand() * 12
      const at = (offset: number): Subject => ({ ...s, gradeOffset: { offset, sd: 1, n: 12 } })
      const a = rankSubject(at(lo), 'easy')!
      const b = rankSubject(at(lo + 0.5 + rand() * 4), 'easy')!
      expect(b.score).toBeGreaterThanOrEqual(a.score)
      // On the easy order, never further down: a lower tier is higher up.
      const ka = easeKey(at(lo))!
      const kb = easeKey(at(lo + 0.5 + rand() * 4))!
      expect(kb.tier < ka.tier || (kb.tier === ka.tier && kb.score >= ka.score)).toBe(true)
    }
  })

  it('more of the mark on the final exam never makes a subject easier', () => {
    let checked = 0
    for (const s of all) {
      const tasks = s.assessment ?? []
      const from = tasks.findIndex((t) => t.kind !== 'exam' && t.weight >= 10)
      const exam = tasks.findIndex((t) => t.kind === 'exam')
      if (from < 0 || exam < 0) continue
      const moved = tasks.map((t, i) => (i === from ? { ...t, weight: t.weight - 10 } : i === exam ? { ...t, weight: t.weight + 10 } : t))
      const before = rankSubject(s, 'easy')!
      const after = rankSubject({ ...s, assessment: moved }, 'easy')!
      expect(after.score, s.code).toBeLessThanOrEqual(before.score)
      checked++
    }
    expect(checked).toBeGreaterThan(300)
  })
})

describe('balancing semesters', () => {
  // Level-1 subjects with nothing needed first, worth 12.5 and running in both semesters of 2027–28:
  // any arrangement of them is valid, so balancing is free to swap.
  const runs = (s: Subject) => [2027, 2028].every((y) => offeredIn(s, y, 'semester-1').status === 'ok' && offeredIn(s, y, 'semester-2').status === 'ok')
  const pool = all.filter((s) => s.level === 1 && s.prerequisites === 'none' && s.corequisites === 'none' && s.points === 12.5 && !s.yearLong && s.categories['B-SCI'] && runs(s)).map((s) => s.code)
  const terms = (codes: string[], per: number) =>
    [0, 1, 2, 3].map((k) => ({ year: 2027 + Math.floor(k / 2), period: (k % 2 ? 'semester-2' : 'semester-1') as 'semester-1' | 'semester-2', subjects: codes.slice(k * per, k * per + per) }))
  const planOf = (codes: string[], per: number): Plan => ({ course: 'B-SCI', courseYear: 2026, minors: [], completed: [], terms: terms(codes, per) })
  const SKILLS = ['maths', 'programming', 'writing', 'lab', 'statistics'] as const
  const student = (rand: () => number): Profile => {
    const skills: Profile['skills'] = {}
    for (const k of SKILLS) if (rand() < 0.4) skills[k] = 1 + Math.floor(rand() * 2)
    return { results: [], skills, interests: [], goal: 'balanced' }
  }
  const cost = (xs: number[]) => xs.reduce((sum, x, i) => sum + (i === 0 ? 1.5 : 1) * x * x, 0)
  const errors = (p: Plan) => checkTerms(p, data).filter((i) => i.severity === 'error').map((i) => `${i.kind}|${i.subject ?? ''}`)

  it('never makes the plan less even, never adds an error, and lifts the peak only to lighten the first semester', () => {
    expect(pool.length).toBeGreaterThan(16)
    const rand = rng(33)
    for (let i = 0; i < 60; i++) {
      const plan = planOf([...pool].sort(() => rand() - 0.5).slice(0, 16), 4)
      const profile = student(rand)
      const before = termScores(plan, data, profile)
      const errs = new Set(errors(plan))
      balanceTerms(plan, data, profile)
      const after = termScores(plan, data, profile)
      expect(cost(after)).toBeLessThanOrEqual(cost(before) + 1e-9)
      for (const e of errors(plan)) expect(errs.has(e), e).toBe(true)
      // The first semester counts 1.5× by design (students are still finding their feet), so a
      // later one may end up a little heavier than the old peak, but only for that.
      if (Math.max(...after) > Math.max(...before) + 1e-9) expect(after[0]!).toBeLessThan(before[0]!)
    }
  })

  it('on small plans, ends within 10% of the best arrangement there is (or with no semester left heavy)', () => {
    const rand = rng(34)
    // Every way to put 12 subjects four to a semester over three semesters (34,650 of them).
    const splits = (left: string[], size: number): string[][][] => {
      if (!left.length) return [[]]
      const out: string[][][] = []
      const pick = (from: number, chosen: string[]) => {
        if (chosen.length === size) {
          for (const rest of splits(left.filter((c) => !chosen.includes(c)), size)) out.push([chosen, ...rest])
          return
        }
        for (let i = from; i < left.length; i++) pick(i + 1, [...chosen, left[i]!])
      }
      pick(0, [])
      return out
    }
    const three = (t: string[][]): Plan => ({ ...planOf([], 0), terms: t.map((subjects, k) => ({ year: 2027 + Math.floor(k / 2), period: k % 2 ? 'semester-2' : 'semester-1', subjects })) })
    let compared = 0
    for (let n = 0; n < 6; n++) {
      const codes = [...pool].sort(() => rand() - 0.5).slice(0, 12)
      const profile = student(rand)
      const plan = three([codes.slice(0, 4), codes.slice(4, 8), codes.slice(8)])
      balanceTerms(plan, data, profile)
      const after = termScores(plan, data, profile)
      // balanceTerms stops once no semester is at the line (1): nothing left to fix.
      if (!after.some((x) => x >= 1)) continue
      const best = Math.min(...splits(codes, 4).map((t) => cost(termScores(three(t), data, profile))))
      expect(cost(after)).toBeLessThanOrEqual(best * 1.1 + 1e-9)
      compared++
    }
    expect(compared).toBeGreaterThan(3)
  }, 60_000)
})
