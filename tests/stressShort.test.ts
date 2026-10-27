import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { termStress, type StressReason } from '../src/engine/termStress'
import { interpolate, type Translate } from '../src/i18n/interpolate'
import { stressShort } from '../src/i18n/format'
import { LOCALE_CODES } from '../src/i18n/codes'
import { en } from '../src/i18n/messages/en'
import { zhCN } from '../src/i18n/messages/zh-CN'
import { zhTW } from '../src/i18n/messages/zh-TW'
import { ja } from '../src/i18n/messages/ja'
import { ko } from '../src/i18n/messages/ko'
import { vi } from '../src/i18n/messages/vi'
import { id } from '../src/i18n/messages/id'
import { ms } from '../src/i18n/messages/ms'
import { hi } from '../src/i18n/messages/hi'

const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
function translator(messages: unknown): Translate {
  const look = (m: unknown, key: string) => key.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), m)
  return (key, params) => {
    const v = look(messages, key)
    return interpolate(typeof v === 'string' ? v : `MISSING:${key}`, params)
  }
}

const ALL: StressReason[] = [
  { key: 'stackWeak', params: { skill: 'programming', codes: 'A, B', n: 2 } },
  { key: 'stackStruggle', params: { skill: 'maths', codes: 'A, B', n: 2 } },
  { key: 'stackMarks', params: { skill: 'writing', codes: 'A, B', n: 2, mark: 60 } },
  { key: 'hours', params: { hours: 30, codes: 'A' } },
  { key: 'hoursWork', params: { hours: 30, work: 15, codes: 'A' } },
  { key: 'workload', params: { n: 3, codes: 'A, B, C' } },
  { key: 'coursework', params: { n: 3, codes: 'A, B, C' } },
  { key: 'exams', params: { n: 3, codes: 'A, B, C' } },
  { key: 'projects', params: { n: 3, codes: 'SWEN30006, COMP30023, COMP30027' } },
  { key: 'deadlines', params: { n: 20, codes: 'A, B' } },
  { key: 'hard', params: { n: 2, codes: 'A, B' } },
]

describe('stressShort', () => {
  it('says the reason in a few words, with the count and never the subject codes', () => {
    const t = translator(en)
    expect(stressShort(t, ALL[8]!)).toBe('3 big projects')
    expect(stressShort(t, ALL[0]!)).toBe(`2 lean on ${en.skill.programming}`)
    expect(stressShort(t, ALL[4]!)).toBe('30 h class + 15 h work')
    expect(stressShort(translator(zhCN), ALL[8]!)).toBe('3 门大项目')
  })
  it('has every short template in all nine languages, short enough for a chip', () => {
    for (const code of LOCALE_CODES) {
      const t = translator(MESSAGES[code])
      for (const r of [...ALL, ]) {
        const s = stressShort(t, r)
        expect(s, `${code} ${r.key}`).not.toMatch(/MISSING|\{|[A-Z]{4}\d{5}/)
        expect(s.length, `${code} ${r.key}: ${s}`).toBeLessThanOrEqual(32)
      }
      expect(t('stress.short.stuck'), code).not.toMatch(/MISSING/)
    }
  })
  it('covers every reason the engine gives on a real heavy semester', () => {
    const data = realData()
    const r = termStress(['SWEN30006', 'COMP30023', 'COMP30027', 'COMP30019'], data)
    for (const reason of r.reasons) expect(stressShort(translator(en), reason)).not.toMatch(/MISSING|[A-Z]{4}\d{5}/)
  })
})
