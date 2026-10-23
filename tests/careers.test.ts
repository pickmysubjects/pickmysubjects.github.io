import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { accreditationCodes, assembleCareers, CAREER_LANGS, componentCareers } from '../src/engine/careers'
import { interpolate, type Params } from '../src/i18n/interpolate'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
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

  it('only names accreditation and helpful subjects that are in the data', () => {
    for (const m of Object.values(careers.majors)) {
      const codes = [...(m.accreditation ? accreditationCodes(m.accreditation) : []), ...(m.helpfulSubjects?.codes ?? [])]
      for (const c of codes) expect(real.subjects[c], `${m.handbookId} ${c}`).toBeDefined()
      for (const id of m.accreditation?.withOneOf ?? []) expect(real.components.some((x) => x.id === id)).toBe(true)
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
