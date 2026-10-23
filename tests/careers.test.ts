import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { accreditationCodes, assembleCareers, CAREER_LANGS, graduateFileSchema, jobsFileSchema, careerText, componentCareers, type CareerText } from '../src/engine/careers'
import { interpolate, type Params } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { careersHtml } from '../src/utils/careersHtml'

const { dataset: real, errors } = buildDataset('real')
const careers = real.careers!

function translator(messages: unknown) {
  return (key: string, params?: Params) => {
    let node: unknown = messages
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
    if (typeof node !== 'string') throw new Error(`missing ${key}`)
    return interpolate(node, params)
  }
}
const html = (id: string, course: string, messages: unknown = en, locale = 'en') =>
  careersHtml(real, id, course, translator(messages), locale, (c) => `/subject/${c}/`, (x) => `/majors/${x}/`)

describe('careers data', () => {
  it('loads with no errors', () => {
    expect(errors).toEqual([])
    expect(Object.keys(careers.majors).length).toBeGreaterThan(100)
  })

  it('links every job to an occupation that exists and is a job, not a field', () => {
    for (const j of Object.values(careers.jobs)) {
      if (j.occupation) expect(careers.occupations[j.occupation]?.field, j.id).toBe(false)
    }
    for (const m of Object.values(careers.majors)) {
      for (const c of m.careers) expect(careers.jobs[c.job], `${m.handbookId} ${c.job}`).toBeDefined()
      for (const f of m.relatedFields) expect(careers.occupations[f]?.field, `${m.handbookId} ${f}`).toBe(true)
    }
  })

  it('names every job and occupation in every language', () => {
    for (const n of [...Object.values(careers.jobs), ...Object.values(careers.occupations)].map((x) => x.names)) {
      for (const l of CAREER_LANGS) expect(n[l]).toBeTruthy()
    }
  })

  // Industries, further study, via, accreditation summaries, helpful notes and course further study.
  const texts = (): [string, CareerText][] => [
    ...Object.values(careers.majors).flatMap((m) => [
      ...m.industries.map((x): [string, CareerText] => [`${m.handbookId} industry`, x]),
      ...m.furtherStudy.map((x): [string, CareerText] => [`${m.handbookId} further study`, x]),
      ...m.careers.flatMap((c): [string, CareerText][] => (c.via ? [[`${m.handbookId} via`, c.via]] : [])),
      ...(m.accreditation ? [[`${m.handbookId} accreditation`, m.accreditation.summary] as [string, CareerText]] : []),
      ...(m.helpfulSubjects ? [[`${m.handbookId} note`, m.helpfulSubjects.note] as [string, CareerText]] : []),
    ]),
    ...Object.entries(careers.courses).flatMap(([c, x]): [string, CareerText][] => (x.summary ? [[`${c} further study`, x.summary]] : [])),
  ]

  it('has careers text in every language', () => {
    const list = texts()
    expect(list.length).toBeGreaterThan(200)
    for (const [where, t] of list) for (const l of CAREER_LANGS) expect(t[l], `${where} ${l}: ${t.en}`).toBeTruthy()
  })

  it('writes zh-TW in Traditional characters, not a copy of zh-CN', () => {
    // Characters that only exist in Simplified Chinese (their Traditional forms differ).
    const simplifiedOnly = /[业专门发学会们个为这说时实现经济国过动应对开关产务资术质钱让认识论设计软网络数据级师范规划营环农药医疗养护]/
    const names = [...Object.values(careers.jobs), ...Object.values(careers.occupations)].map((x): [string, CareerText] => [x.id, x.names])
    for (const [where, t] of [...texts(), ...names]) {
      expect(t['zh-TW'], `${where}: ${t['zh-TW']}`).not.toMatch(simplifiedOnly)
      if (simplifiedOnly.test(t.zh!)) expect(t['zh-TW'], where).not.toBe(t.zh)
    }
  })

  it('falls back to English, never Simplified Chinese, for a missing zh-TW text', () => {
    expect(careerText({ en: 'mining', zh: '采矿' }, 'zh-TW')).toBe('mining')
    expect(careerText({ en: 'mining', zh: '采矿' }, 'zh-CN')).toBe('采矿')
    expect(careerText({ en: 'mining', zh: '采矿', 'zh-TW': '礦業' }, 'zh-TW')).toBe('礦業')
  })

  it('warns about an untranslated phrase', () => {
    const r = assembleCareers(
      {
        occupations: [],
        jobs: [],
        majors: [{ handbook_id: 'b-x-major-1', course: 'B-X', title: 'X', components: [], source: 'https://handbook.unimelb.edu.au/x', checked: '2026-01-01', career_text: true, careers: [], industries: ['mining'], further_study: [], related_fields: [] }],
        courses: [],
        terms: [],
      },
      { subjects: new Set(), components: new Map(), courses: new Set(['B-X']) },
    )
    expect(r.warnings.join('\n')).toMatch(/no translations for "mining"/)
    expect(r.careers.majors['b-x-major-1']!.industries).toEqual([{ en: 'mining' }])
  })

  it('only names accreditation and helpful subjects that are in the data', () => {
    for (const m of Object.values(careers.majors)) {
      const codes = [...(m.accreditation ? accreditationCodes(m.accreditation) : []), ...(m.helpfulSubjects?.codes ?? [])]
      for (const c of codes) expect(real.subjects[c], `${m.handbookId} ${c}`).toBeDefined()
      for (const id of m.accreditation?.withOneOf ?? []) expect(real.components.some((x) => x.id === id)).toBe(true)
    }
  })

  it('names only current subjects a student of that course can take, required breadth as breadth', () => {
    for (const [comp, h] of Object.entries(careers.components)) {
      const m = careers.majors[h]!
      const course = real.components.find((c) => c.id === comp)!.course
      const a = m.accreditation
      for (const c of [...(a ? accreditationCodes(a) : []), ...(m.helpfulSubjects?.codes ?? [])]) {
        const s = real.subjects[c]!
        expect(s.discontinuedFrom, `${comp} ${c}`).toBeUndefined()
        expect(s.categories[course], `${comp} ${c} in ${course}`).toBeDefined()
      }
      for (const c of a?.requiredBreadth ?? []) expect(real.subjects[c]!.categories[course], `${comp} ${c}`).toBe('breadth')
    }
  })

  it('links every occupation to its yourcareer.gov.au page by its ANZSCO code', () => {
    for (const o of Object.values(careers.occupations)) {
      expect(o.url, o.id).toMatch(/^https:\/\/www\.yourcareer\.gov\.au\/occupations\/\d{6}\/[a-z0-9-]+$/)
      expect(o.url, o.id).toContain(`/${o.anzsco}/`)
    }
  })

  it('maps each entry to components of its own course', () => {
    for (const [id, h] of Object.entries(careers.components)) {
      expect(real.components.find((c) => c.id === id)?.course).toBe(careers.majors[h]!.handbookId.split('-').slice(0, 2).join('-').toUpperCase())
    }
  })

  it('rejects broken references', () => {
    const occ = { id: 'x', name: 'X', anzsco: '111111', url: 'https://www.yourcareer.gov.au/occupations/111111/x', skills: [], field: false, checked: '2026-01-01', names: {} as never }
    const r = assembleCareers(
      {
        occupations: [occ],
        jobs: [{ id: 'j', title: 'j', occupation: 'nope', names: {} as never }],
        majors: [
          {
            handbook_id: 'b-x-major-1', course: 'B-X', title: 'X', components: ['ghost'], source: 'https://handbook.unimelb.edu.au/x', checked: '2026-01-01', career_text: true,
            careers: [{ job: 'missing', qualifier: 'direct' }], industries: [], further_study: [], related_fields: ['x'],
            accreditation: { body: 'B', summary: { en: 'xxxxxxxxxxxx', zh: 'xxxx' }, required: ['ZZZZ99999'], required_breadth: [], recommended: [], with_one_of: [], source: 'https://handbook.unimelb.edu.au/x' },
          },
        ],
        courses: [],
      },
      { subjects: new Set(), components: new Map(), courses: new Set(['B-X']) },
    )
    expect(r.errors.join('\n')).toMatch(/unknown occupation nope/)
    expect(r.errors.join('\n')).toMatch(/unknown job missing/)
    expect(r.errors.join('\n')).toMatch(/isn't marked field/)
    expect(r.errors.join('\n')).toMatch(/ZZZZ99999 isn't in the data/)
    expect(r.errors.join('\n')).toMatch(/unknown component ghost/)
  })
})

describe('careers section', () => {
  it('lists jobs with official links, and the accreditation route (B-COM Accounting)', () => {
    const e = componentCareers(careers, 'accounting')!
    expect(e.accreditation?.required).toEqual(['ECON10003', 'ACCT30002', 'ACCT30004'])
    expect(e.accreditation?.requiredBreadth).toEqual(['BLAW10001', 'BLAW20001', 'BLAW30002'])
    const out = html('accounting', 'B-COM')
    expect(out).toContain('Where it can lead')
    expect(out).toContain('Accountant')
    expect(out).toContain('https://www.yourcareer.gov.au/occupations/221111/accountant-general')
    expect(out).toContain('CPA Australia')
    expect(out).toContain('href="/subject/ECON10003/"')
    expect(out).toContain('Required, taken as breadth')
    expect(out).toContain('href="/subject/BLAW30002/"')
    expect(out).toContain(e.source)
  })

  it('keeps the English job name beside the translation', () => {
    expect(html('accounting', 'B-COM', zhCN, 'zh-CN')).toContain('会计师 (Accountant)')
  })

  it('shows Traditional Chinese on zh-TW (B-COM Accounting)', () => {
    const out = html('accounting', 'B-COM', zhTW, 'zh-TW')
    expect(out).toContain('任何產業與領域')
    expect(out).toContain('認證版本')
    expect(out).not.toContain('任何行业')
  })

  it('shows alternatives and qualifiers (B-ARTS Psychology)', () => {
    const out = html('arts-psychology', 'B-ARTS')
    expect(out).toMatch(/PSYC10003<\/a> or <a[^>]*>PSYC10006/)
    expect(out).toContain('Needs a further qualification')
    expect(out).toContain('Australian Psychology Accreditation Council')
  })

  it('says so honestly when the Handbook lists no careers, with the course further study', () => {
    const id = Object.entries(careers.components).find(([, h]) => !careers.majors[h]!.careerText && careers.majors[h]!.handbookId.startsWith('b-sci'))![0]
    const out = html(id, 'B-SCI')
    expect(out).toContain("The Handbook doesn't list careers for this major.")
    expect(out).toContain('After the Bachelor of Science: Honours')
    expect(out).not.toContain('<h3>Industries')
  })

  it('marks field-level occupations as related fields', () => {
    const out = html('climate-and-weather', 'B-SCI')
    expect(out).toContain('Related fields')
    expect(out).toContain('meteorologist')
  })

  it('renders nothing for a component we have no entry for', () => {
    expect(html('no-such-major', 'B-SCI')).toBe('')
  })
})

describe('aliases and graduate routes', () => {
  const names = Object.fromEntries(CAREER_LANGS.map((l) => [l, 'X']))
  it('takes optional per-language aliases, and rejects an unknown language or an empty list', () => {
    expect(jobsFileSchema.safeParse([{ id: 'j', title: 'j', occupation: null, names, aliases: { en: ['coder'], zh: ['码农'] } }]).success).toBe(true)
    expect(jobsFileSchema.safeParse([{ id: 'j', title: 'j', occupation: null, names }]).success).toBe(true)
    expect(jobsFileSchema.safeParse([{ id: 'j', title: 'j', occupation: null, names, aliases: { fr: ['x'] } }]).success).toBe(false)
    expect(jobsFileSchema.safeParse([{ id: 'j', title: 'j', occupation: null, names, aliases: { en: [] } }]).success).toBe(false)
  })

  const route = { job: 'j', course: 'MC-X', title: 'Doctor of X', source: 'https://handbook.unimelb.edu.au/x', checked: '2026-01-01', entry: { en: 'Any degree at all.', zh: '任何学位都行' }, prerequisites: null }
  it('a study area is a discipline list or a field, not both', () => {
    expect(graduateFileSchema.safeParse([{ ...route, covers: [{ disciplines: ['ANAT'], level: 2 }] }]).success).toBe(true)
    expect(graduateFileSchema.safeParse([{ ...route, covers: [{ disciplines: ['ANAT'], topic: 'biology' }] }]).success).toBe(false)
    expect(graduateFileSchema.safeParse([{ ...route, source: 'https://example.com/x' }]).success).toBe(false)
  })

  it('rejects a route for an unknown job or naming a subject not in the data', () => {
    const g = graduateFileSchema.parse([{ ...route, job: 'ghost', required: ['ZZZZ99999'] }])
    const r = assembleCareers({ occupations: [], jobs: [], majors: [], courses: [], graduate: g }, { subjects: new Set(), components: new Map(), courses: new Set() })
    expect(r.errors.join('\n')).toMatch(/graduate: ghost: unknown job/)
    expect(r.errors.join('\n')).toMatch(/ZZZZ99999 isn't in the data/)
  })
})
