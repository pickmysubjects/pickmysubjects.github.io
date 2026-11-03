import { describe, expect, it } from 'vitest'
import { CLUBS } from '@/content/clubs'
import { suggestClubs } from '@/engine/clubs'
import { realData } from './realData'

const data = realData()
const names = (xs: { club: { name: string } }[]) => xs.map((x) => x.club.name)

describe('club list', () => {
  it('links every club to its own UMSU page, once', () => {
    for (const c of CLUBS) expect(c.url).toMatch(/^https:\/\/umsu\.unimelb\.edu\.au\/buddy-up\/clubs\/clubs-listing\/join\/[^/]+\/$/)
    expect(new Set(CLUBS.map((c) => c.url)).size).toBe(CLUBS.length)
    expect(new Set(CLUBS.map((c) => c.name)).size).toBe(CLUBS.length)
  })

  it('gives every club a reason to come up: a topic or a degree', () => {
    for (const c of CLUBS) expect(c.topics.length + (c.courses?.length ?? 0)).toBeGreaterThan(0)
  })

  it('names only degrees the site knows', () => {
    const codes = new Set(data.courses.map((c) => c.code))
    for (const c of CLUBS) for (const code of c.courses ?? []) expect(codes).toContain(code)
  })
})

describe('suggesting clubs', () => {
  it('shows nothing without interests, subjects or a degree', () => {
    expect(suggestClubs(CLUBS, { interests: [], codes: [], data })).toEqual([])
  })

  it('puts a club on a picked interest first, and says why', () => {
    const out = suggestClubs(CLUBS, { interests: ['psychology'], codes: [], data })
    expect(out[0]!.club.name).toBe('Psychology Association')
    expect(out[0]!.reasons[0]).toEqual({ kind: 'interest', topic: 'psychology' })
  })

  it("adds the student's own degree society", () => {
    const out = suggestClubs(CLUBS, { interests: [], course: 'B-COM', codes: [], data })
    expect(names(out)).toContain('Commerce Students Society')
  })

  it('reads what the subjects on the record and plan are about', () => {
    const out = suggestClubs(CLUBS, { interests: [], codes: ['COMP10001', 'COMP10002'], data })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => s.reasons.some((r) => r.kind === 'studied'))).toBe(true)
  })

  it('keeps to five', () => {
    const out = suggestClubs(CLUBS, { interests: ['finance', 'programming', 'engineering', 'music'], course: 'B-SCI', codes: [], data })
    expect(out).toHaveLength(5)
  })
})
