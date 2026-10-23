import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { rankable } from '../src/engine/easeRanking'
import { subjectDifficulty } from '../src/engine/subjectFit'
import { recommend, studyYear, type Profile } from '../src/engine/recommend'
import { interpolate, joinList, localList, type Translate } from '../src/i18n/interpolate'
import { reasonText, ruleText } from '../src/i18n/format'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { ja } from '../src/i18n/messages/ja'
import { LOCALE_CODES } from '../src/i18n/codes'
import { chainNoneKey } from '../src/utils/planBoard'
import { defaultTerm, isUpcoming } from '../src/utils/pastTerms'
import { dataset, subject } from './helpers'

function translator(messages: unknown): Translate {
  const look = (m: unknown, key: string) => key.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), m)
  return (key, params) => {
    const v = look(messages, key) ?? look(en, key)
    return interpolate(typeof v === 'string' ? v : key, params)
  }
}
const T = { en: translator(en), zh: translator(zhCN), ja: translator(ja) }

describe('lists use the reader’s separator', () => {
  it('joins with 、 in Chinese and Japanese, ", " in English', () => {
    expect(joinList(T.zh, ['A', 'B'])).toBe('A、B')
    expect(joinList(T.ja, ['A', 'B'])).toBe('A、B')
    expect(joinList(T.en, ['A', 'B'])).toBe('A, B')
    expect(localList(T.zh, 'COMP10001, COMP10002')).toBe('COMP10001、COMP10002')
  })
  it('reason skills and codes', () => {
    const note = { key: 'strengths', params: { skills: 'business, communication' }, text: '' }
    expect(reasonText(T.zh, note)).not.toMatch(/, /)
    expect(reasonText(T.zh, note)).toContain('、')
    expect(reasonText(T.ja, note)).toContain('、')
    expect(reasonText(T.en, note)).toMatch(/, /)
    const rule = { id: 'x', kind: 'compulsory', subjects: ['MAST10006', 'MAST10007'], description: '' } as never
    expect(ruleText(T.zh, rule)).toContain('MAST10006、MAST10007')
  })
  it('every locale has a list separator', async () => {
    for (const code of LOCALE_CODES) {
      const mod = (await import(`../src/i18n/messages/${code}.ts`)) as Record<string, { listSep?: string }>
      expect(Object.values(mod)[0]!.listSep, code).toBeTruthy()
    }
  })
})

describe('exams and group work read as how the subject is marked', () => {
  const s = subject({ code: 'TEST10001', area: 'TEST', skills: ['business'], assessment: [{ kind: 'exam', weight: 60 }, { kind: 'assignment', weight: 40 }], offerings: { 2026: ['semester-1'] } })
  const profile: Profile = { goal: 'challenge', interests: [], skills: { business: 4, exams: 4 }, results: [] } as unknown as Profile
  const rec = recommend(dataset([s]), profile, { year: 2026 })[0]!
  it('is its own reason with the exam share, not a listed skill', () => {
    expect(rec.reasons.find((r) => r.key === 'goodAt')?.params.skills).toBe('business')
    const exams = rec.reasons.find((r) => r.key === 'examsGood')
    expect(exams?.params.pct).toBe(60)
    expect(reasonText(T.zh, exams!)).toBe('你擅长考试，这门课期末占 60%。')
    expect(reasonText(T.en, exams!)).toContain('60%')
  })
  it('weak exams warn the same way', () => {
    const weak = recommend(dataset([s]), { ...profile, skills: { exams: 1 } } as Profile, { year: 2026 })[0]!
    expect(weak.warnings.find((w) => w.key === 'examsWeak')?.params).toMatchObject({ pct: 60, hard: 1 })
  })
})

describe('the add-to-plan term is never a past one by default', () => {
  const choices = [
    { year: 2024, period: 'semester-1' as const },
    { year: 2026, period: 'semester-2' as const },
    { year: 2027, period: 'semester-1' as const },
    { year: 2027, period: 'semester-2' as const },
  ]
  const today = new Date(2026, 9, 23)
  it('skips terms that have started', () => {
    expect(isUpcoming({ year: 2026, period: 'semester-2' }, today)).toBe(false)
    expect(defaultTerm(choices, { year: 2024, period: 'semester-1' }, today)).toEqual({ year: 2027, period: 'semester-1' })
  })
  it('from the plan’s first semester when that is later', () => {
    expect(defaultTerm(choices, { year: 2027, period: 'semester-2' }, today)).toEqual({ year: 2027, period: 'semester-2' })
  })
})

describe('the planner chain', () => {
  it('says "no prerequisites" when there are none, not "nothing in your plan"', () => {
    expect(chainNoneKey('none')).toBe('browse.noPrereq')
    expect(chainNoneKey({ subject: 'COMP10001' })).toBe('plan.tlNone')
    expect(T.zh(chainNoneKey('none'))).toBe('不需要先修课')
  })
})

describe('graduate (level-9) subjects', () => {
  it('count as final-year subjects', () => {
    expect(studyYear(9)).toBe(3)
    expect(studyYear(2)).toBe(2)
  })
  const ug = subject({ code: 'COMP30001', area: 'COMP', level: 3, offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'science' } })
  const counted = subject({ code: 'COMP90001', area: 'COMP', level: 9, offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'science' } })
  const notCounted = subject({ code: 'COMP90002', area: 'COMP', level: 9, offerings: { 2026: ['semester-1'] } })
  const data = dataset([ug, counted, notCounted])
  const profile = { goal: 'balanced', interests: [], skills: {}, results: [] } as unknown as Profile
  it('a year-3 student sees ones the degree counts, never others', () => {
    const codes = recommend(data, profile, { year: 2026, course: 'B-SCI', maxLevel: 3 }).map((r) => r.code)
    expect(codes).toContain('COMP90001')
    expect(codes).not.toContain('COMP90002')
    expect(recommend(data, profile, { year: 2026, course: 'B-SCI', maxLevel: 2 }).map((r) => r.code)).not.toContain('COMP90001')
  })
  it('stay off the easy/hard lists but still get a difficulty verdict', () => {
    expect(rankable(counted, 'B-SCI', 2026)).toBe(false)
    const withAssessment = subject({ code: 'COMP90003', area: 'COMP', level: 9, offerings: { 2026: ['semester-1'] }, categories: { 'B-SCI': 'science' }, assessment: [{ kind: 'exam', weight: 70 }, { kind: 'assignment', weight: 30 }] })
    const d = subjectDifficulty({ ...data.subjects, COMP90003: withAssessment }, 'COMP90003', 'B-SCI', 2026)
    expect(d.level).not.toBe('unknown')
    expect(d.unranked).toBe('graduate')
    expect(T.zh('fit.unranked.graduate', { course: 'Bachelor of Science' })).toContain('Bachelor of Science')
  })
  it('the card notes never say "year 9"', () => {
    for (const m of [en, zhCN, ja]) expect(m.fit.aheadGraduate).not.toMatch(/9 ?年|year 9/)
    const { dataset: real } = buildDataset('real')
    for (const s of Object.values(real.subjects)) expect(studyYear(s.level)).toBeLessThanOrEqual(3)
  })
})
