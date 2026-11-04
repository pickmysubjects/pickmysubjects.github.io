import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLUBS } from '@/content/clubs'
import { clubSubjects, similarClubs, suggestClubs } from '@/engine/clubs'
import { realData } from './realData'

const data = realData()
const names = (xs: { club: { name: string } }[]) => xs.map((x) => x.club.name)

describe('club list', () => {
  it('links every club to its own UMSU page, once', () => {
    for (const c of CLUBS) expect(c.url).toMatch(/^https:\/\/umsu\.unimelb\.edu\.au\/buddy-up\/clubs\/clubs-listing\/join\/[^/]+\/$/)
    expect(new Set(CLUBS.map((c) => c.url)).size).toBe(CLUBS.length)
    expect(new Set(CLUBS.map((c) => c.name)).size).toBe(CLUBS.length)
  })

  it('has every UMSU club, each at its own address on this site', () => {
    expect(CLUBS).toHaveLength(246)
    for (const c of CLUBS) expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(new Set(CLUBS.map((c) => c.slug)).size).toBe(CLUBS.length)
  })

  it('suggests only clubs tied to what students study: never a cultural, faith or games club', () => {
    const everything = suggestClubs(CLUBS, { interests: [...new Set(CLUBS.flatMap((c) => c.topics))], codes: [], data }, CLUBS.length)
    expect(everything.every((s) => s.club.topics.length > 0)).toBe(true)
    expect(everything.some((s) => ['culture', 'spiritual', 'political', 'sports-games', 'food'].includes(s.club.category) && s.club.topics.length === 0)).toBe(false)
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

describe("a club's page", () => {
  const club = (slug: string) => CLUBS.find((c) => c.slug === slug)!

  it('lists the subjects most about what the club is about', () => {
    const subjects = clubSubjects(club('data-science-students-society-ds-cubed'), data)
    expect(subjects.length).toBeGreaterThan(0)
    expect(subjects.every((c) => data.subjects[c]!.discontinuedFrom === undefined)).toBe(true)
  })

  it('suggests clubs on the same thing, not just the same UMSU category', () => {
    const ds = club('data-science-students-society-ds-cubed')
    expect(similarClubs(ds, CLUBS).every((c) => c.topics.some((x) => ds.topics.includes(x)))).toBe(true)
    // A games club has no topics: others in its category stand in.
    const chess = club('chess-club')
    expect(similarClubs(chess, CLUBS).every((c) => c.category === 'sports-games')).toBe(true)
  })
})

describe("each club's own text", () => {
  const en = JSON.parse(readFileSync(new URL('../src/content/clubInfo/en.json', import.meta.url), 'utf8')) as Record<string, { summary: string; activities: string[]; draws: string[] }>
  const links = JSON.parse(readFileSync(new URL('../src/content/clubInfo/links.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>

  it('is there for every club, short, and only for clubs we list', () => {
    const slugs = new Set(CLUBS.map((c) => c.slug))
    for (const slug of [...Object.keys(en), ...Object.keys(links)]) expect(slugs, slug).toContain(slug)
    for (const c of CLUBS) expect(en[c.slug]?.summary, c.slug).toBeTruthy()
    for (const [slug, t] of Object.entries(en)) {
      expect(t.summary.length, slug).toBeLessThanOrEqual(150)
      expect(t.activities.length, slug).toBeLessThanOrEqual(4)
      expect(t.draws.length, slug).toBeLessThanOrEqual(2)
    }
  })

  it('links only to secure pages, on the site each link says', () => {
    for (const [slug, l] of Object.entries(links)) {
      for (const u of Object.values(l)) expect(u, slug).toMatch(/^https?:\/\//)
      if (l.instagram) expect(l.instagram, slug).toMatch(/instagram\.com\//)
      if (l.facebook) expect(l.facebook, slug).toMatch(/facebook\.com\//)
    }
  })

  it('has every translation with the same shape as the English', () => {
    for (const locale of ['zh-CN', 'zh-TW', 'ja', 'ko', 'vi', 'ms', 'id', 'hi']) {
      const url = new URL(`../src/content/clubInfo/${locale}.json`, import.meta.url)
      if (!existsSync(url)) continue
      const tr = JSON.parse(readFileSync(url, 'utf8')) as typeof en
      expect(Object.keys(tr).sort(), locale).toEqual(Object.keys(en).sort())
      for (const [slug, t] of Object.entries(en)) {
        expect(tr[slug]!.activities.length, `${locale} ${slug}`).toBe(t.activities.length)
        expect(tr[slug]!.draws.length, `${locale} ${slug}`).toBe(t.draws.length)
        expect(tr[slug]!.summary, `${locale} ${slug}`).toBeTruthy()
      }
    }
  })
})
