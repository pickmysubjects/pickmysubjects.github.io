import { describe, expect, it } from 'vitest'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { en } from '../src/i18n/messages/en'
import { searchSubjects } from '../src/utils/subjectSearch'
import { dataset, subject } from './helpers'
import { realData } from './realData'

const names = (m: typeof en) => ({
  topicNames: (id: string) => [(m.topic as Record<string, string>)[id] ?? id],
  groupNames: (id: string) => [(m.topicGroup as Record<string, string>)[id] ?? id],
})

describe('searchSubjects', () => {
  const small = dataset([
    subject({ code: 'AAAA10001', title: 'Old Programming', offerings: { 2026: [] }, topics: ['programming'] }),
    subject({ code: 'AAAA10002', title: 'Programming Now', offerings: { 2026: ['semester-1'] }, topics: ['programming'] }),
    subject({ code: 'BBBB10001', title: 'Databases', offerings: { 2026: ['semester-2'] }, topics: ['databases'] }),
    subject({ code: 'CCCC10001', title: 'Medieval History', offerings: { 2026: ['semester-1'] }, topics: ['history'] }),
  ])
  const list = Object.values(small.subjects)
  const codes = (q: string, m = en) => searchSubjects(list, q, { ...names(m), year: 2026, limit: 10 }).map((s) => s.code)

  it('puts subjects still running ahead of ones that are not', () => {
    expect(codes('programming').slice(0, 2)).toEqual(['AAAA10002', 'AAAA10001'])
  })

  it('a code match comes before a title match', () => {
    expect(codes('bbbb')[0]).toBe('BBBB10001')
  })

  it('finds subjects by their topics, and by a topic group ("Computing", 计算机)', () => {
    expect(codes('databases')).toEqual(['BBBB10001'])
    expect(codes('计算机', zhCN).sort()).toEqual(['AAAA10001', 'AAAA10002', 'BBBB10001'])
    expect(codes('计算机', zhCN)).not.toContain('CCCC10001')
  })

  it('in the real data, 计算机 finds far more than the titles that contain it', () => {
    const real = Object.values(realData().subjects)
    const byTitle = real.filter((s) => s.titles?.zh.includes('计算机')).length
    const found = searchSubjects(real, '计算机', { ...names(zhCN), year: 2026, limit: 1000 }).length
    expect(found).toBeGreaterThan(byTitle * 2)
  })
})
