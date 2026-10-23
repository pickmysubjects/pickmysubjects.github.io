import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { careerNeeds, careerTarget, careerTargets, majorForCareer, majorsForCareer, tierSubject, TIERS, type CareerTarget, type TierContext } from '../src/engine/careerPaths'
import { interpolate, type Params } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { subjectNote } from '../src/utils/careerPathText'
import { careerPageHtml } from '../src/utils/careersHtml'
import { subject } from './helpers'

const { dataset: real } = buildDataset('real')

function translator(messages: unknown) {
  return (key: string, params?: Params) => {
    let node: unknown = messages
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
    if (typeof node !== 'string') throw new Error(`missing ${key}`)
    return interpolate(node, params)
  }
}

const names = (en: string) => ({ en, zh: en, 'zh-TW': en, ja: en, ko: en, vi: en, ms: en, id: en, hi: en })
const fakeTarget = (skills: string[], name = 'Widget Accountant'): CareerTarget => ({
  id: 'x',
  kind: 'job',
  names: names(name),
  occupation: { id: 'x', name, anzsco: '000000', url: 'https://www.yourcareer.gov.au/occupations/000000/x', skills, field: false, checked: '2026-01-01', names: names(name) },
})

describe('what a career is about', () => {
  it('reads fields off the official key skills and the job name, and sets generic skills aside', () => {
    const n = careerNeeds(fakeTarget(['Accounting', 'Communication Skills', 'Microsoft Excel']))
    expect(n.fields.get('accounting')).toEqual(['Accounting', ''])
    expect(n.skills.get('data')).toEqual(['Microsoft Excel'])
    expect(n.generic).toEqual(['Communication Skills'])
  })

  it("doesn't read a software engineer as general engineering", () => {
    const n = careerNeeds(fakeTarget(['Java'], 'Software Engineer'))
    expect(n.fields.has('programming')).toBe(true)
    expect(n.fields.has('engineering')).toBe(false)
    expect(careerNeeds(fakeTarget([], 'Civil Engineer')).fields.has('engineering')).toBe(true)
  })
})

describe('tiers', () => {
  const needs = careerNeeds(fakeTarget(['Accounting', 'Microsoft Excel']))
  const ctx = (extra: Partial<TierContext> = {}): TierContext => ({ needs, ...extra })
  const acc = { body: 'Body', summary: { en: 'x', zh: 'x' }, required: ['AAAA10001', ['AAAA10002', 'AAAA10003']], requiredBreadth: ['AAAA10004'], recommended: ['AAAA10005'], withOneOf: [], source: 'https://handbook.unimelb.edu.au/x' }

  it('puts accreditation subjects first, with the body and any alternatives named', () => {
    const one = tierSubject(subject({ code: 'AAAA10002', topics: ['history'] }), ctx({ accreditation: acc }))
    expect(one.tier).toBe('required')
    expect(one.reasons[0]).toEqual({ kind: 'acc', role: 'oneOf', body: 'Body', others: ['AAAA10003'] })
    expect(tierSubject(subject({ code: 'AAAA10004' }), ctx({ accreditation: acc })).tier).toBe('required')
    expect(tierSubject(subject({ code: 'AAAA10005', topics: ['history'] }), ctx({ accreditation: acc })).tier).toBe('helps')
  })

  it('a subject on the job’s field helps, a neighbouring field or a listed skill is somewhat related', () => {
    const helps = tierSubject(subject({ code: 'BBBB10001', topics: ['accounting'] }), ctx())
    expect(helps.tier).toBe('helps')
    expect(helps.reasons).toContainEqual({ kind: 'field', topics: ['accounting'], from: ['Accounting'] })
    expect(tierSubject(subject({ code: 'BBBB10002', topics: ['marketing'] }), ctx()).tier).toBe('some')
    expect(tierSubject(subject({ code: 'BBBB10003', topics: ['history'], skills: ['data'] }), ctx()).tier).toBe('some')
    expect(tierSubject(subject({ code: 'BBBB10004', topics: ['history'] }), ctx({ helpful: ['BBBB10004'] })).tier).toBe('helps')
  })

  it('never calls a subject useless: an unrelated one lists its other merits', () => {
    const s = subject({ code: 'CCCC10001', topics: ['history'], skills: ['writing'], assessment: [{ kind: 'report', weight: 100 }] })
    const row = tierSubject(s, ctx({ easier: () => true, breadth: () => true }))
    expect(row.tier).toBe('little')
    expect(row.merits).toEqual(['easier', 'noExam', 'communication', 'breadth'])
    const t = translator(en)
    expect(subjectNote(t, row)).toBe('On the easier side · No final exam · Practises writing or presenting · Counts as breadth')
    expect(subjectNote(t, { ...row, merits: [] })).toBe('Take it if it interests you.')
    for (const tier of TIERS) expect(t(`careerPath.tier.${tier}`).toLowerCase()).not.toContain('useless')
  })

  it('keeps the rules general: no subject code in the tiering code', () => {
    const src = readFileSync(new URL('../src/engine/careerPaths.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/[A-Z]{4}\d{5}/)
  })
})

describe('real data: accountant', () => {
  it('lists careers that some major leads to, jobs before fields', () => {
    const all = careerTargets(real)
    expect(all.length).toBeGreaterThan(40)
    expect(all.findIndex((c) => c.kind === 'field')).toBeGreaterThan(all.findIndex((c) => c.id === 'accountant'))
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length)
    for (const c of all) expect(majorsForCareer(real, c.id).length, c.id).toBeGreaterThan(0)
  })

  it('B-COM Accounting: the accreditation core is required, the law breadth is required breadth, accounting subjects help', () => {
    const majors = majorsForCareer(real, 'accountant')
    expect(majors.map((m) => m.component)).toContain('accounting')
    const r = majorForCareer(real, 'accountant', 'accounting')!
    const codes = (x: { code: string }[]) => x.map((y) => y.code)
    expect(codes(r.subjects.required)).toEqual(expect.arrayContaining(['ECON10003', 'ACCT30002', 'ACCT30004']))
    expect(codes(r.breadth!.required)).toEqual(['BLAW10001', 'BLAW20001', 'BLAW30002'])
    expect(codes(r.subjects.helps)).toContain('ACCT10001')
    for (const row of [...r.subjects.helps, ...r.subjects.some]) expect(row.reasons.length, row.code).toBeGreaterThan(0)
  })

  it('a software career reaches the computing majors by field and sorts programming subjects as helping', () => {
    const target = careerTarget(real, 'software-engineer')!
    expect(target.kind).toBe('field')
    const majors = majorsForCareer(real, 'software-engineer')
    expect(majors.every((m) => m.how === 'related-field')).toBe(true)
    const r = majorForCareer(real, 'software-engineer', majors[0]!.component)!
    expect(r.subjects.helps.length).toBeGreaterThan(0)
    expect(r.subjects.helps.every((x) => x.reasons.some((y) => y.kind === 'field' || y.kind === 'helpful' || y.kind === 'acc'))).toBe(true)
  })

  it('prerenders the page with every major and tier, in Traditional Chinese too', () => {
    const t = careerTarget(real, 'accountant')!
    const html = careerPageHtml(real, t, translator(zhTW), 'zh-TW', (c) => `/s/${c}`, (c) => `/m/${c}`, '/careers/')
    expect(html).toContain('會計師')
    expect(html).toContain('必修')
    expect(html).toContain('/s/ACCT30002')
  })
})
