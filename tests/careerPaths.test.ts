import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { careerGroups, careerMatchRank, careerNeeds, careerSearchTerms, careerTarget, careerTargets, foldSearch, majorForCareer, majorsForCareer, subjectCareers, tierSubject, TIERS, type CareerTarget, type TierContext } from '../src/engine/careerPaths'
import { interpolate, type Params } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { careerPhrase, subjectNote } from '../src/utils/careerPathText'
import { careerPageHtml, careerSeo, subjectCareersHtml } from '../src/utils/careersHtml'
import { subject } from './helpers'

const real = realData()

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
  aliases: [],
  occupation: { id: 'x', name, anzsco: '000000', url: 'https://www.yourcareer.gov.au/occupations/000000/x', skills, field: false, checked: '2026-01-01', names: names(name) },
})

describe('what a career is about', () => {
  it('reads fields off the official key skills and the job name, and sets generic skills aside', () => {
    const n = careerNeeds(fakeTarget(['Accounting', 'Communication Skills', 'Microsoft Excel', 'Writing']))
    expect(n.fields.get('accounting')).toEqual(['Accounting', ''])
    expect(n.generic).toEqual(['Communication Skills', 'Writing'])
  })

  it('reads no hands-on skill off office tools or plain writing (almost every job asks for them)', () => {
    expect(careerNeeds(fakeTarget(['Microsoft Excel', 'Spreadsheets', 'Writing'])).skills.size).toBe(0)
    expect(careerNeeds(fakeTarget(['Laboratory Skills'], 'Lab Scientist')).skills.has('lab')).toBe(true)
  })

  it("doesn't read a software engineer as general engineering", () => {
    const n = careerNeeds(fakeTarget(['Java'], 'Software Engineer'))
    expect(n.fields.has('programming')).toBe(true)
    expect(n.fields.has('engineering')).toBe(false)
    expect(careerNeeds(fakeTarget([], 'Civil Engineer')).fields.has('engineering')).toBe(true)
  })
})

describe('cross-field key skills', () => {
  it('reads project management, contracts, budgets and clinical work as a side link, not the job’s field', () => {
    const n = careerNeeds(fakeTarget(['Civil Engineering', 'Project Management', 'Stakeholder Management', 'Contract Management', 'Budgeting', 'Clinical Research', 'Network Security'], 'Civil Engineer'))
    for (const x of ['management', 'law', 'accounting', 'health', 'systems'] as const) {
      expect(n.fields.has(x), x).toBe(false)
      expect(n.side.has(x), x).toBe(true)
    }
    expect(n.fields.has('engineering')).toBe(true)
    expect(n.fields.has('security')).toBe(true)
  })

  it('still gives the field in full when the job’s own name says it', () => {
    const n = careerNeeds(fakeTarget(['Project Management'], 'Project Manager'))
    expect(n.fields.has('management')).toBe(true)
    expect(n.side.has('management')).toBe(false)
  })

  it('a subject on a side field is somewhat related, never helping', () => {
    const needs = careerNeeds(fakeTarget(['Geology', 'Project Management'], 'Geologist'))
    const mgmt = subject({ code: 'EEEE10001', area: 'EEEE', topics: ['management'] })
    expect(tierSubject(mgmt, { needs }).tier).toBe('some')
    expect(tierSubject(mgmt, { needs, mainFieldOnly: true }).tier).toBe('some')
  })

  it("doesn't read planning or research words as generic when they name a field", () => {
    const n = careerNeeds(fakeTarget(['Town Planning', 'Planning', 'Research'], 'Planner'))
    expect(n.fields.has('urban-planning')).toBe(true)
    expect(n.generic).toEqual(['Planning', 'Research'])
  })
})

describe('tiers', () => {
  const needs = careerNeeds(fakeTarget(['Accounting', 'Laboratory Skills']))
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
    expect(tierSubject(subject({ code: 'BBBB10003', topics: ['history'], skills: ['lab'] }), ctx()).tier).toBe('some')
    expect(tierSubject(subject({ code: 'BBBB10005', topics: ['history'], skills: ['data'] }), ctx()).tier).toBe('little')
    expect(tierSubject(subject({ code: 'BBBB10004', topics: ['history'] }), ctx({ helpful: ['BBBB10004'] })).tier).toBe('helps')
  })

  it('outside the major, a field the subject only touches on is somewhat related, not helping', () => {
    // A film subject tagged with accounting second: its main field is film.
    const film = subject({ code: 'DDDD20001', area: 'DDDD', topics: ['film-and-screen', 'accounting'] })
    const outside = tierSubject(film, ctx({ mainFieldOnly: true }))
    expect(outside.tier).toBe('some')
    expect(outside.reasons).toEqual([{ kind: 'touches', topics: ['accounting'] }])
    expect(tierSubject(film, ctx()).tier).toBe('helps')
    // Its first tag, or its discipline (area code), is its main field.
    expect(tierSubject(subject({ code: 'DDDD20002', area: 'DDDD', topics: ['accounting', 'history'] }), ctx({ mainFieldOnly: true })).tier).toBe('helps')
    expect(tierSubject(subject({ code: 'ACCT20009', area: 'ACCT', topics: ['history', 'accounting'] }), ctx({ mainFieldOnly: true })).tier).toBe('helps')
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
    for (const c of all) expect(majorsForCareer(real, c.id).length > 0 || !!c.graduate, c.id).toBe(true)
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

  it('breadth that helps is breadth whose main field is the job’s, and Excel alone relates nothing', () => {
    for (const m of majorsForCareer(real, 'accountant')) {
      const r = majorForCareer(real, 'accountant', m.component)!
      for (const row of r.breadth?.helps ?? []) expect(row.reasons.some((x) => x.kind === 'field' || x.kind === 'acc' || x.kind === 'helpful'), row.code).toBe(true)
      for (const row of [...r.subjects.some, ...(r.breadth?.some ?? [])]) expect(row.reasons.some((x) => x.kind === 'skill'), row.code).toBe(false)
    }
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

describe('a job name inside an English sentence', () => {
  it('adds a or an, lower-cases it, drops a bracketed note and keeps acronyms', () => {
    const p = (en: string) => careerPhrase({ ...names(en), zh: '会计师' }, 'en')
    expect(p('Accountant')).toBe('an accountant')
    expect(p('Accountant (General)')).toBe('an accountant')
    expect(p('Software Engineer')).toBe('a software engineer')
    expect(p('ICT Business Analyst')).toBe('an ICT business analyst')
    expect(p('User experience designer')).toBe('a user experience designer')
    expect(p('Urban planner')).toBe('an urban planner')
    expect(careerPhrase({ ...names('Accountant'), zh: '会计师' }, 'zh-CN')).toBe('会计师')
  })

  it('reads naturally in the career page title', () => {
    const seo = careerSeo(real, careerTarget(real, 'accountant')!, translator(en), 'en')
    expect(seo.title).toMatch(/^Becoming an accountant: /)
    expect(seo.description).toContain('work as an accountant')
  })
})

describe("a subject's careers", () => {
  it('names the accreditation route that needs it, in the major and as breadth', () => {
    const own = subjectCareers(real, 'ACCT30002')
    expect(own.required.map((r) => [r.career.id, r.component])).toContainEqual(['accountant', 'accounting'])
    expect(subjectCareers(real, 'BLAW10001').required.map((r) => r.career.id)).toContain('accountant')
    // One of several ("this or that") counts as needed too.
    const oneOf = majorsForCareer(real, 'psychologist').flatMap((m) => m.accreditation?.required.filter(Array.isArray).flat() ?? [])
    if (oneOf[0]) expect(subjectCareers(real, oneOf[0]).required.length).toBeGreaterThan(0)
  })

  it('else lists careers its main field helps toward, best first; a film subject touching on budgets helps none', () => {
    expect(subjectCareers(real, 'COMP30022').required).toEqual([])
    expect(subjectCareers(real, 'COMP30022').helps[0]?.id).toBe('software-engineer')
    expect(subjectCareers(real, 'FLTV20022')).toEqual({ required: [], helps: [] })
    // One incidental key skill doesn't tie a management subject to a zoologist.
    expect(subjectCareers(real, 'MGMT10002').helps.map((c) => c.id)).not.toContain('zoologist')
  })

  it('no engineer, scientist or psychologist gets a management or law subject as helping just from a cross-field key skill', () => {
    for (const id of ['civil-engineer', 'geologist', 'zoologist', 'quantity-surveyor', 'psychologist', 'veterinarian', 'ict-security-specialist', 'secondary-school-teacher']) {
      const t = careerTarget(real, id)
      if (!t) continue
      for (const m of majorsForCareer(real, id)) {
        const r = majorForCareer(real, id, m.component)!
        for (const row of [...r.subjects.helps, ...(r.breadth?.helps ?? [])]) {
          const field = row.reasons.find((x) => x.kind === 'field')
          if (field?.kind === 'field') expect(field.topics.filter((x) => ['management', 'law'].includes(x)), `${id} ${row.code}`).toEqual([])
        }
      }
    }
  })

  it('a subject from a discipline with its own field (music) is not a health subject for a vet', () => {
    for (const m of majorsForCareer(real, 'veterinarian')) {
      const r = majorForCareer(real, 'veterinarian', m.component)!
      for (const row of r.breadth?.helps ?? []) expect(row.code.startsWith('MUSI'), row.code).toBe(false)
    }
  })

  it('prerenders the line in Traditional Chinese, and nothing for an unrelated subject', () => {
    const href = (id: string, major?: string) => `/careers/${id}${major ? `?major=${major}` : ''}`
    const html = subjectCareersHtml(real, 'ACCT30002', translator(zhTW), 'zh-TW', href)
    expect(html).toContain('和就業的關係')
    expect(html).toContain('會計師')
    expect(html).toContain('/careers/accountant?major=accounting')
    expect(subjectCareersHtml(real, 'FLTV20022', translator(en), 'en', href)).toBe('')
    expect(subjectCareersHtml(real, 'COMP30022', translator(en), 'en', href)).toContain('Helps toward: ')
  })
})

describe('finding a career by what students type', () => {
  const find = (q: string) =>
    careerTargets(real)
      .map((t) => ({ id: t.id, rank: careerMatchRank(careerSearchTerms(t), q) }))
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.id)

  it('folds full-width forms, case and spaces', () => {
    expect(foldSearch('ＩＴ')).toBe('it')
    expect(foldSearch(' Data  Analyst ')).toBe('dataanalyst')
    expect(foldSearch('數　據')).toBe('數據')
  })

  it('matches everyday names in any language', () => {
    expect(find('程序员')[0]).toBe('software-engineer')
    expect(find('码农')).toContain('software-engineer')
    expect(find('coder')).toContain('software-engineer')
    expect(find('数据')).toEqual(expect.arrayContaining(['statistician', 'business-analyst']))
    expect(find('Data Analyst')).toEqual(expect.arrayContaining(['statistician', 'business-analyst']))
    expect(find('银行')).toEqual(expect.arrayContaining(['finance-specialist', 'financial-investment-manager']))
    expect(find('医生')[0]).toBe('medical-practitioner')
    expect(find('護理')[0]).toBe('registered-nurse')
    expect(find('lawyer')[0]).toBe('lawyer')
  })

  it('a short Latin query only matches a whole word, so IT finds computing and not every name with "it" in it', () => {
    expect(find('IT')).toEqual(['computing-professional'])
    expect(find('ＩＴ')).toEqual(['computing-professional'])
  })

  it('matches nothing for an unrelated word', () => {
    expect(find('zzqx')).toEqual([])
  })

  it('every alias list is in the language it is filed under (no duplicates of the job name itself)', () => {
    for (const t of careerTargets(real)) {
      const terms = careerSearchTerms(t)
      expect(new Set(terms.whole).size, t.id).toBe(terms.whole.length)
    }
  })

  it('groups careers the same way on the picker and the list: jobs, then fields', () => {
    const groups = careerGroups(careerTargets(real))
    expect(groups.map((g) => g.id)).toEqual(['jobs', 'fields'])
    expect(groups[0]!.items.every((c) => c.kind === 'job')).toBe(true)
  })
})

describe('graduate-entry careers', () => {
  it('lists each one even when no major page names it', () => {
    for (const id of ['medical-practitioner', 'lawyer', 'registered-nurse', 'dentist', 'physiotherapist', 'optometrist']) {
      const t = careerTarget(real, id)
      expect(t?.graduate, id).toBeDefined()
      expect(t!.graduate!.source).toMatch(/^https:\/\/handbook\.unimelb\.edu\.au\/2026\/courses\/mc-/)
      expect(t!.occupation, id).toBeDefined()
    }
  })

  it('marks no subject Required when the Handbook names study areas, not codes', () => {
    for (const id of ['dentist', 'physiotherapist']) {
      for (const m of majorsForCareer(real, id)) expect(majorForCareer(real, id, m.component)!.subjects.required, `${id} ${m.component}`).toEqual([])
    }
  })

  it('lists majors whose own subjects cover the prerequisite areas (anatomy and physiology for physio)', () => {
    const majors = majorsForCareer(real, 'physiotherapist')
    expect(majors.length).toBeGreaterThan(0)
    for (const m of majors) {
      expect(m.how).toBe('via-further-study')
      expect(m.route?.course).toBe('MC-DPHYSIO')
    }
    expect(majors.map((m) => m.title)).toContain('Physiology')
  })

  it('keeps an any-degree course honest: the page says any degree and shows the entry text', () => {
    const t = careerTarget(real, 'lawyer')!
    const html = careerPageHtml(real, t, translator(en), 'en', (c) => `/subject/${c}`, (id) => `/majors/${id}`, '/careers')
    expect(html).toContain('Juris Doctor (MC-JURISD)')
    expect(html).toContain('Any bachelor degree can lead here')
    expect(html).toContain('other than law')
  })

  it('adds the IT, data science and engineering masters from the 2026 Handbook', () => {
    const want: Record<string, string> = { 'computing-professional': 'MC-IT', 'business-analyst': 'MC-DATASC', 'civil-engineer': 'MC-CIVENG', 'mechanical-engineer': 'MC-MECHENG', 'electrical-engineer': 'MC-ELECENG', 'chemical-engineer': 'MC-CHEMENG' }
    for (const [id, course] of Object.entries(want)) {
      const t = careerTarget(real, id)
      expect(t?.graduate?.course, id).toBe(course)
      expect(t!.graduate!.source).toContain(`/2026/courses/${course.toLowerCase()}/`)
    }
  })

  it('marks the subjects the Handbook names as Required on majors listed through the course', () => {
    const route = majorsForCareer(real, 'mechanical-engineer').filter((m) => m.route?.course === 'MC-MECHENG')
    expect(route.length).toBeGreaterThan(0)
    for (const m of route) {
      const req = majorForCareer(real, 'mechanical-engineer', m.component)!.subjects.required.map((s) => s.code)
      for (const c of ['MAST10006', 'MAST10007', 'PHYC10003', 'PHYC10004']) expect(req, m.component).toContain(c)
    }
  })

  it('keeps a study-area prerequisite as text with no Required subjects (Master of IT)', () => {
    const route = majorsForCareer(real, 'computing-professional').filter((m) => m.route?.course === 'MC-IT')
    for (const m of route) expect(majorForCareer(real, 'computing-professional', m.component)!.subjects.required, m.component).toEqual([])
    const html = careerPageHtml(real, careerTarget(real, 'computing-professional')!, translator(en), 'en', (c) => `/subject/${c}`, (id) => `/majors/${id}`, '/careers')
    expect(html).toContain('focused on computer programming')
  })

  it('shows the prerequisite text in Traditional Chinese', () => {
    const t = careerTarget(real, 'dentist')!
    const html = careerPageHtml(real, t, translator(zhTW), 'zh-TW', (c) => `/subject/${c}`, (id) => `/majors/${id}`, '/careers')
    expect(html).toContain('解剖學、生理學和生物化學')
    expect(html).toContain('牙醫師')
  })
})
