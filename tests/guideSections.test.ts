import { describe, expect, it } from 'vitest'
import { categoryOfTopic, GUIDE_CATEGORIES, GUIDE_TOPICS, guidePageOf, topicPath } from '@/utils/guideSections'
import { SERVICE_TOPICS, type GuideService } from '@/utils/guideServices'
import { en } from '@/i18n/messages/en'
import { zhCN } from '@/i18n/messages/zh-CN'
import { zhTW } from '@/i18n/messages/zh-TW'
import { ja } from '@/i18n/messages/ja'
import { ko } from '@/i18n/messages/ko'
import { vi } from '@/i18n/messages/vi'
import { id } from '@/i18n/messages/id'
import { ms } from '@/i18n/messages/ms'
import { hi } from '@/i18n/messages/hi'

describe('guide sections', () => {
  it('every topic anchor lives in exactly one category', () => {
    const all = GUIDE_CATEGORIES.flatMap((c) => GUIDE_TOPICS[c])
    expect(new Set(all).size).toBe(all.length)
  })
  it('sends an old anchor to the page that now holds it', () => {
    expect(categoryOfTopic('wam')).toBe('basics')
    expect(topicPath('fail')).toBe('guide/semester/#fail')
    expect(topicPath('nope')).toBe('guide/')
  })
  it('puts the requisite waiver topic in Enrolling, in every language', () => {
    expect(categoryOfTopic('waiver')).toBe('enrolling')
    for (const m of [en, zhCN, zhTW, ja, ko, vi, id, ms, hi]) for (const k of ['waiverTitle', 'waiverWhat', 'waiverStep2', 'quotaText'] as const) expect(m.guide[k]).toBeTruthy()
  })
  it('reads the page from the address', () => {
    expect(guidePageOf('')).toEqual({ kind: 'overview' })
    expect(guidePageOf('enrolling')).toEqual({ kind: 'category', category: 'enrolling' })
    expect(guidePageOf('key-dates')).toEqual({ kind: 'extra', page: 'key-dates', category: 'help' })
  })
})

describe('guide service lists (systems, life, uni careers)', () => {
  const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
  const get = (m: unknown, key: string): unknown => key.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), m)

  it('keeps every older section and adds the new ones', () => {
    for (const c of ['basics', 'enrolling', 'semester', 'international', 'help', 'systems', 'life']) expect(GUIDE_CATEGORIES).toContain(c)
    expect(topicPath('systems')).toBe('guide/systems/#systems')
    expect(topicPath('uni-careers')).toBe('guide/help/#uni-careers')
  })
  it('places every service topic on a guide page', () => {
    for (const t of Object.keys(SERVICE_TOPICS)) expect(categoryOfTopic(t)).not.toBeNull()
  })
  it('lists the systems a new student needs, each with an official link', () => {
    const ids = SERVICE_TOPICS.systems.map((s) => s.id)
    for (const id of ['myUnimelb', 'canvas', 'ed', 'myTimetable', 'email', 'okta']) expect(ids).toContain(id)
    expect(ids.length).toBeLessThanOrEqual(10)
    for (const s of Object.values(SERVICE_TOPICS).flat()) expect(s.href).toMatch(/^https:\/\/([a-z-]+\.)*(unimelb\.edu\.au|safezoneapp\.com)\//)
  })
  it('has every text in all 9 languages', () => {
    for (const [code, m] of Object.entries(MESSAGES)) {
      for (const c of ['systems', 'life']) for (const f of ['nav', 'title', 'lede']) expect(get(m, `guide.cat.${c}.${f}`), `${code} ${c}.${f}`).toBeTypeOf('string')
      for (const t of Object.keys(SERVICE_TOPICS)) for (const f of ['title', 'short']) expect(get(m, `guide.svcTopic.${t}.${f}`), `${code} ${t}.${f}`).toBeTypeOf('string')
      for (const s of Object.values(SERVICE_TOPICS).flat() as readonly GuideService[]) {
        expect(get(m, `guide.svc.${s.id}.name`), `${code} ${s.id}`).toBeTypeOf('string')
        expect(get(m, `guide.svc.${s.id}.text`), `${code} ${s.id}`).toBeTypeOf('string')
        expect(get(m, `guide.svc.${s.id}.more`) !== undefined, `${code} ${s.id}.more`).toBe(Boolean(s.more))
      }
    }
  })
  it('writes zh-TW in Traditional characters, not copied Simplified', () => {
    expect(get(zhTW, 'guide.svc.email.text')).not.toBe(get(zhCN, 'guide.svc.email.text'))
    expect(JSON.stringify(get(zhTW, 'guide.svc'))).not.toMatch(/[们说学门这]/)
  })
})
