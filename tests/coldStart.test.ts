import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { recommend } from '../src/engine/recommend'
import { skillsOf } from '../src/engine/skills'
import { topicsOf } from '../src/engine/topics'
import type { Skill, Topic } from '../src/engine/schema'

/**
 * Cold start: with no ratings on the site yet, suggestions must still fit what a student told us.
 * A suggestion fits when it covers one of their interests or uses a strength (4–5), and doesn't
 * lean on a skill they marked weak (1–2). Measured on 2026-10-10 at about 90% overall.
 */
const STUDENTS: { name: string; interests: Topic[]; skills: Partial<Record<Skill, number>> }[] = [
  { name: 'computing', interests: ['programming', 'machine-learning', 'algorithms'], skills: { programming: 5, maths: 4, writing: 2 } },
  { name: 'biology', interests: ['biology', 'health'], skills: { lab: 5, writing: 4, programming: 1, maths: 2 } },
  { name: 'psychology', interests: ['psychology', 'health'], skills: { writing: 5, statistics: 3, programming: 1 } },
  { name: 'business', interests: ['finance', 'economics', 'business'], skills: { business: 5, maths: 4, lab: 1 } },
  { name: 'maths', interests: ['pure-maths', 'statistics', 'probability'], skills: { maths: 5, statistics: 4, writing: 2, lab: 1 } },
  { name: 'environment', interests: ['environment', 'ecology', 'geography'], skills: { fieldwork: 5, writing: 4, maths: 2 } },
  { name: 'engineering', interests: ['engineering', 'physics'], skills: { maths: 5, design: 4, writing: 2 } },
  { name: 'food', interests: ['agriculture', 'chemistry'], skills: { lab: 4, business: 3, programming: 1 } },
]

describe('cold start (real data, no ratings needed)', () => {
  const { dataset: data } = buildDataset('real')
  const fitShare = (s: (typeof STUDENTS)[number], goal: 'balanced' | 'wam' | 'challenge', maxLevel: number) => {
    const recs = recommend(data, { results: [], skills: s.skills, interests: s.interests, goal }, { course: 'B-SCI', year: 2026, maxLevel }).slice(0, 10)
    const fits = recs.filter((r) => {
      const subject = data.subjects[r.code]!
      const uses = skillsOf(subject, data)
      const weak = uses.some((k) => (s.skills[k] ?? 3) <= 2)
      const liked = topicsOf(subject).topics.some((t) => s.interests.includes(t as Topic)) || uses.some((k) => (s.skills[k] ?? 0) >= 4)
      return liked && !weak
    })
    return fits.length / recs.length
  }

  it('fits at least half of every student’s top ten, for every goal and year', () => {
    const shares: number[] = []
    for (const s of STUDENTS) for (const goal of ['balanced', 'wam', 'challenge'] as const) for (const level of [1, 2, 3]) {
      const share = fitShare(s, goal, level)
      shares.push(share)
      expect(share, `${s.name} ${goal} level ${level}`).toBeGreaterThanOrEqual(0.5)
    }
    expect(shares.reduce((a, b) => a + b, 0) / shares.length).toBeGreaterThanOrEqual(0.8)
  }, 60_000)
})
