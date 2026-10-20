import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { courseFileSchema, type Dataset } from '../src/engine/schema'
import { checkCourse, majorClash, maxMajors, minorClash, planComponentIds } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { cleanPlans } from '../src/utils/sanitize'
import { decodePlan, encodePlan } from '../src/utils/sharePlan'
import { setupTitles } from '../src/composables/usePlanCompare'
import type { Plan } from '../src/engine/plan'

const { dataset: real } = buildDataset('real')
const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }

function plan(course: string, major: string, major2?: string, minors: string[] = []) {
  return generatePlan({ data: real, profile, course, courseYear: 2026, major, major2, minors, startYear: 2027, startPeriod: 'semester-1' })
}
const fails = (p: Plan, data: Dataset = real) => checkCourse(p, data).statuses.filter((s) => s.status === 'fail')
const status = (p: Plan, id: string) => checkCourse(p, real).statuses.find((s) => s.ruleId === id)

describe('double majors: course rules', () => {
  it('reads max and no_double_count, defaulting to one major that may share subjects', () => {
    const base = { code: 'X', title: 'X', year: 2026, total_points: 300, standard_load: 50 }
    const one = courseFileSchema.parse({ ...base, rules: [{ id: 'major', kind: 'major', count: 1, description: 'A major' }] })
    expect(one.rules[0]).toMatchObject({ count: 1, max: 1, noDoubleCount: false })
    const two = courseFileSchema.parse({ ...base, rules: [{ id: 'major', kind: 'major', count: 1, max: 2, no_double_count: [['a', 'b']], description: 'x' }] })
    expect(two.rules[0]).toMatchObject({ max: 2, noDoubleCount: [['a', 'b']] })
  })

  it('B-ARTS, B-COM and B-DES allow two majors; B-SCI and B-BMED one', () => {
    expect(['B-ARTS', 'B-COM', 'B-DES', 'B-SCI', 'B-BMED'].map((c) => maxMajors(real, c, 2026))).toEqual([2, 2, 2, 1, 1])
  })

  it('every component a major rule or area-cap exception names exists in its course', () => {
    for (const course of real.courses) {
      for (const r of course.rules) {
        const ids = r.kind === 'major' && Array.isArray(r.noDoubleCount) ? r.noDoubleCount.flat() : r.kind === 'area-cap' ? r.exceptions.flatMap((e) => e.components) : []
        for (const id of ids) expect(real.components.some((c) => c.id === id && c.course === course.code), `${course.code}: ${id}`).toBe(true)
      }
    }
  })

  it('a plan lists its second major among its components', () => {
    expect(planComponentIds({ major: 'history', major2: 'philosophy', minors: ['x'] })).toEqual(['history', 'philosophy', undefined, 'x'])
  })
})

describe('double majors: checking', () => {
  it('the same major twice, or a second major where only one is allowed, fails', () => {
    expect(majorClash(real, 'history', 'history')).toMatch(/both of your majors/)
    const p = plan('B-ARTS', 'history', 'philosophy').plan
    expect(status({ ...p, major2: 'history' }, 'major')).toMatchObject({ status: 'fail', detailKey: 'majorsClash' })
    const sci = plan('B-SCI', 'data-science').plan
    expect(status({ ...sci, major2: 'chemistry-chemistry' }, 'major')).toMatchObject({ status: 'fail', detailKey: 'tooManyMajors' })
  })

  it('a not_with pair between majors is ruled out, from either side', () => {
    const data: Dataset = { ...real, components: real.components.map((c) => (c.id === 'history' ? { ...c, notWith: ['philosophy'] } : c)) }
    expect(majorClash(data, 'history', 'philosophy')).toMatch(/can't be taken together/)
    expect(majorClash(data, 'philosophy', 'history')).toMatch(/can't be taken together/)
    expect(majorClash(real, 'history', 'philosophy')).toBeNull()
  })

  it('the second major is checked too: a plan with only the first fails', () => {
    const one = plan('B-ARTS', 'history').plan
    expect(status(one, 'major')?.status).toBe('ok')
    expect(status({ ...one, major2: 'philosophy' }, 'major')).toMatchObject({ status: 'fail', detailKey: 'componentMissing' })
  })

  it('a minor is checked against both majors', () => {
    expect(minorClash(real, ['philosophy', 'history'], 'history-minor')).toMatch(/both your major and your minor/)
    expect(minorClash(real, ['philosophy', undefined], 'history-minor')).toBeNull()
  })

  it('B-ARTS: a subject counts towards one major or minor only', () => {
    // HIST30004 is on both the History major's and the HPS minor's level-3 lists.
    const p = plan('B-ARTS', 'history', undefined, ['history-and-philosophy-of-science-minor']).plan
    expect(fails(p)).toEqual([])
    const l3 = (codes: string[]) => p.terms.flatMap((t) => t.subjects).filter((c) => codes.includes(c))
    const hist = ['HIST30004', 'HIST30006', 'HIST30010', 'HIST30051', 'HIST30064', 'HIST30065', 'HIST30066', 'HIST30068', 'HIST30076', 'HIST30077', 'HIST30078', 'HPSC30034']
    const hps = ['HPSC30037', 'HPSC30023', 'HPSC30034', 'HPSC30019', 'HPSC30038', 'HIST30004', 'HPSC30039']
    // 25 points for each, with no subject counted twice: at least four distinct subjects.
    expect(new Set([...l3(hist), ...l3(hps)]).size).toBeGreaterThanOrEqual(4)
    // Only HIST30004 and HPSC30034 at level 3: enough for one of the two, not for both.
    const drop = l3(hist).filter((c) => !['HIST30004', 'HPSC30034'].includes(c))
    const shared = { ...p, terms: p.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => !drop.includes(c)) })) }
    for (const c of ['HIST30004', 'HPSC30034']) if (!shared.terms.some((t) => t.subjects.includes(c))) shared.terms.at(-1)!.subjects.push(c)
    const both = (data: Dataset) => ['major', 'minor'].map((id) => checkCourse(shared, data).statuses.find((s) => s.ruleId === id)?.status)
    expect(both(real)).toContain('fail')
    // Were double counting allowed, the same two subjects would do for both.
    const lax: Dataset = { ...real, courses: real.courses.map((c) => (c.code === 'B-ARTS' ? { ...c, rules: c.rules.map((r) => (r.kind === 'major' ? { ...r, noDoubleCount: false } : r)) } : c)) }
    expect(both(lax)).toEqual(['ok', 'ok'])
  })

  it('B-COM: Management and Marketing need both capstones; other pairs may share subjects', () => {
    const p = plan('B-COM', 'management', 'marketing').plan
    expect(fails(p)).toEqual([])
    const codes = p.terms.flatMap((t) => t.subjects)
    expect(codes).toEqual(expect.arrayContaining(['BUSA30000', 'BUSA30001']))
    const one = { ...p, terms: p.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => c !== 'BUSA30001') })) }
    expect(status(one, 'major')?.status).toBe('fail')
  })
})

describe('double majors: planning', () => {
  it.each([
    ['B-ARTS', 'history', 'philosophy'],
    ['B-ARTS', 'arts-psychology', 'sociology'],
    ['B-ARTS', 'ancient-world-studies', 'classics-ancient-greek-and-latin'],
    ['B-COM', 'accounting', 'finance'],
    ['B-COM', 'actuarial-studies', 'finance'],
    ['B-DES', 'des-construction', 'des-property'],
  ])('%s %s + %s plans both majors with every rule met', (course, a, b) => {
    const r = plan(course, a, b)
    expect(r.unplaced).toEqual([])
    expect(fails(r.plan).map((s) => s.detail)).toEqual([])
  })
})

describe('discipline cap (B-ARTS, B-BMED)', () => {
  const arts = plan('B-ARTS', 'history').plan

  it('is encoded on both courses', () => {
    for (const code of ['B-ARTS', 'B-BMED']) expect(real.courses.find((c) => c.code === code)!.rules.find((r) => r.kind === 'area-cap')).toMatchObject({ max: 125 })
  })

  it('fails a plan with more than 125 points in one area, naming it', () => {
    expect(status(arts, 'discipline-cap')?.status).toBe('ok')
    const hist = Object.values(real.subjects).filter((s) => s.area === 'HIST' && s.categories['B-ARTS']).map((s) => s.code)
    const extra = hist.filter((c) => !arts.terms.some((t) => t.subjects.includes(c))).slice(0, 11)
    const heavy = { ...arts, terms: [...arts.terms, { year: 2031, period: 'semester-1' as const, subjects: extra }] }
    expect(status(heavy, 'discipline-cap')).toMatchObject({ status: 'fail', detailKey: 'areaCapOver' })
    expect(String(status(heavy, 'discipline-cap')?.params.over)).toMatch(/HIST/)
  })

  it('counts a two-area discipline together (Politics and International Studies: POLS + INTS)', () => {
    const pick = (area: string, n: number) => Object.values(real.subjects).filter((s) => s.area === area && s.categories['B-ARTS'] && s.points === 12.5).slice(0, n).map((s) => s.code)
    const base = { ...arts, terms: arts.terms.map((t) => ({ ...t, subjects: t.subjects.filter((c) => !/^(POLS|INTS)/.test(c)) })) }
    const pols = pick('POLS', 10)
    const ints = pick('INTS', 1)
    expect(pols).toHaveLength(10)
    expect(ints).toHaveLength(1)
    const add = (codes: string[]) => ({ ...base, terms: [...base.terms, { year: 2031, period: 'semester-1' as const, subjects: codes }] })
    // 125 points of POLS alone is at the cap; one INTS subject on top goes over, as one discipline.
    expect(String(status(add(pols), 'discipline-cap')?.params.over ?? '')).not.toMatch(/POLS/)
    expect(String(status(add([...pols, ...ints]), 'discipline-cap')?.params.over)).toMatch(/POLS\+INTS/)
  })

  it('caps level-2 and level-3 Philosophy at 87.5 points', () => {
    expect(status(arts, 'philosophy-cap')?.status).toBe('ok')
    const phil = Object.values(real.subjects).filter((s) => s.area === 'PHIL' && s.level >= 2 && s.categories['B-ARTS'] && s.points === 12.5).slice(0, 8).map((s) => s.code)
    const heavy = { ...arts, terms: [...arts.terms, { year: 2031, period: 'semester-1' as const, subjects: phil }] }
    expect(status(heavy, 'philosophy-cap')?.status).toBe('fail')
  })

  it('the planner never goes past it, and Psychology (125 points of PSYC) still plans', () => {
    for (const major of ['history', 'arts-psychology', 'arts-economics', 'arts-geography']) {
      const p = plan('B-ARTS', major).plan
      expect(status(p, 'discipline-cap')?.status, major).toBe('ok')
      expect(fails(p), major).toEqual([])
    }
  })

  it('the Geography major with the Environmental Studies minor is the exception', () => {
    const p = plan('B-ARTS', 'arts-geography', undefined, ['environmental-studies-minor']).plan
    expect(status(p, 'discipline-cap')?.status).toBe('ok')
    // The same GEOG points without the minor chosen count in full.
    const geog = p.terms.flatMap((t) => t.subjects).filter((c) => c.startsWith('GEOG')).length * 12.5
    const without = status({ ...p, minors: [] }, 'discipline-cap')
    expect(without?.status).toBe(geog > 125 ? 'fail' : 'ok')
  })
})

describe('saved plans and links', () => {
  const setup = { course: 'B-ARTS', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' as const, major: 'history', specialisation: '', minors: [] as string[] }

  it('a plan saved before second majors gets none; a saved one is kept', () => {
    const book = (s: object) => ({ real: { active: 'a', plans: [{ id: 'a', label: 'A', setup: s, terms: [], notes: [], unplaced: [] }] } })
    expect(cleanPlans(book(setup)).real!.plans[0]!.setup.major2).toBeUndefined()
    expect(cleanPlans(book({ ...setup, major2: 'philosophy' })).real!.plans[0]!.setup.major2).toBe('philosophy')
    expect(cleanPlans(book({ ...setup, major2: 4 })).real!.plans[0]!.setup.major2).toBeUndefined()
  })

  it('share links carry a second major, and links without one are unchanged', () => {
    expect(decodePlan(encodePlan({ ...setup, major2: 'philosophy' }, []))?.setup.major2).toBe('philosophy')
    expect(encodePlan({ ...setup, major2: '' }, [])).toBe(encodePlan(setup, []))
    expect(decodePlan(encodePlan(setup, []))?.setup).toEqual(setup)
  })

  it('the compare view names both majors', () => {
    expect(setupTitles(real, { ...setup, major2: 'philosophy' }).major).toBe('History + Philosophy')
  })
})
