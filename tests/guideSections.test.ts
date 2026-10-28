import { describe, expect, it } from 'vitest'
import { anchorTitleKey, categoryOfTopic, GUIDE_CATEGORIES, GUIDE_FEATURED, GUIDE_PAGES, GUIDE_TOPICS, guidePageOf, movedGuideAnchor, neighbours, pageOfTopic, showToc, topicPath, topicTitleKey } from '@/utils/guideSections'
import { MENUS } from '@/components/layout/nav'
import { SERVICE_TOPICS, SYSTEM_TOPICS, SYSTEMS, type GuideService } from '@/utils/guideServices'
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
    const ids = SYSTEMS.map((s) => s.id)
    for (const id of ['myUnimelb', 'canvas', 'ed', 'myTimetable', 'email', 'okta', 'gradescope', 'handbook', 'library']) expect(ids).toContain(id)
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
        // A section of its own: exactly as many "what you do there" lines as the data says, and a tip if it has one.
        const does = get(m, `guide.svc.${s.id}.does`)
        expect(Array.isArray(does) ? does.length : 0, `${code} ${s.id}.does`).toBe(s.section?.does ?? 0)
        if (Array.isArray(does)) for (const d of does) expect(d, `${code} ${s.id}.does`).toBeTypeOf('string')
        expect(get(m, `guide.svc.${s.id}.tip`) !== undefined, `${code} ${s.id}.tip`).toBe(Boolean(s.section?.tip))
      }
      for (const k of ['svcLink', 'sourcesLink']) expect(get(m, `guide.${k}`), `${code} ${k}`).toBeTypeOf('string')
      expect(get(m, 'guide.sourcesLine'), `${code} sourcesLine`).toMatch(/\{site\}.*\{stop1\}|\{stop1\}.*\{site\}/)
    }
  })
  it('gives every system on the systems page its own section with its old anchor', () => {
    expect(GUIDE_TOPICS.systems).toEqual(SYSTEM_TOPICS)
    for (const s of SYSTEMS) expect(s.section, s.id).toBeDefined()
    // svc-<id> anchors that older links, the search and the old tags used.
    for (const id of ['myUnimelb', 'okta', 'email', 'canvas', 'ed', 'myTimetable', 'gradescope', 'handbook', 'library']) expect(SYSTEMS.some((s) => s.id === id)).toBe(true)
    expect(topicPath('systems')).toBe('guide/systems/#systems')
  })
  it('sends a system\'s "See" link to a topic on another page', () => {
    for (const s of Object.values(SERVICE_TOPICS).flat() as readonly GuideService[]) if (s.see) expect(pageOfTopic(s.see), s.id).not.toBeNull()
  })
  it('writes zh-TW in Traditional characters, not copied Simplified', () => {
    expect(get(zhTW, 'guide.svc.email.text')).not.toBe(get(zhCN, 'guide.svc.email.text'))
    expect(JSON.stringify(get(zhTW, 'guide.svc'))).not.toMatch(/[们说学门这]/)
  })
})

describe('guide: late enrolment, cross-institutional, exchange, online limit', () => {
  const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
  it('puts each topic on its page', () => {
    for (const t of ['late-enrol', 'cross-institutional', 'exchange']) expect(categoryOfTopic(t)).toBe('enrolling')
    expect(categoryOfTopic('online')).toBe('international')
  })
  it('has every line in all nine languages', () => {
    for (const [loc, m] of Object.entries(MESSAGES)) {
      for (const k of ['lateEnrol', 'cross', 'exchange', 'online']) {
        for (const part of ['Title', 'Short', 'Line', 'More', 'Link']) expect((m.guide as Record<string, unknown>)[`${k}${part}`], `${loc} ${k}${part}`).toBeTruthy()
      }
    }
    expect(zhTW.guide.onlineShort).not.toBe(zhCN.guide.onlineShort)
  })
})

describe('guide: one place per topic', () => {
  const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
  const get = (m: unknown, key: string): unknown => key.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), m)

  it('puts every topic on exactly one page, key dates included', () => {
    const all = GUIDE_PAGES.flatMap((p) => GUIDE_TOPICS[p])
    expect(new Set(all).size).toBe(all.length)
    expect(pageOfTopic('dates')).toBe('key-dates')
    expect(topicPath('dates')).toBe('guide/key-dates/#dates')
    expect(topicPath('it-help')).toBe('guide/help/#it-help')
    expect(topicPath('plans')).toBe('guide/enrolling/#plans')
  })
  it('sends a link to a topic that moved section to its new page', () => {
    expect(movedGuideAnchor('help', 'dates')).toBe('guide/key-dates/#dates')
    expect(movedGuideAnchor('systems', 'it-help')).toBe('guide/help/#it-help')
    expect(movedGuideAnchor('', 'wam')).toBe('guide/basics/#wam')
    expect(movedGuideAnchor('basics', 'wam')).toBeNull()
    expect(movedGuideAnchor('key-dates', 'term-2026-semester-2')).toBeNull()
    expect(movedGuideAnchor('basics', '')).toBeNull()
  })
  it('reads straight through: overview, the seven sections, key dates, back to the overview', () => {
    expect(GUIDE_PAGES).toEqual(['basics', 'systems', 'enrolling', 'semester', 'life', 'international', 'help', 'key-dates'])
    expect(neighbours('basics')).toEqual({ prev: null, next: 'systems' })
    expect(neighbours('key-dates')).toEqual({ prev: 'help', next: null })
  })
  it('lists the overview and every page in the 墨大入门 menu, in reading order', () => {
    const guide = MENUS.find((m) => m.area === 'guide')!
    expect(guide.items.map((i) => i.to)).toEqual(['guide/', ...GUIDE_PAGES.map((p) => `guide/${p}/`)])
  })
  it('has every topic title and menu line in all nine languages', () => {
    const guide = MENUS.find((m) => m.area === 'guide')!
    for (const [code, m] of Object.entries(MESSAGES)) {
      for (const p of GUIDE_PAGES) {
        for (const tId of GUIDE_TOPICS[p]) expect(get(m, topicTitleKey(tId)), `${code} ${tId}`).toBeTypeOf('string')
      }
      for (const i of guide.items) {
        expect(get(m, i.key), `${code} ${i.key}`).toBeTypeOf('string')
        expect(get(m, i.desc), `${code} ${i.desc}`).toBeTypeOf('string')
      }
      for (const k of ['plansTitle', 'plansShort', 'see', 'feesSeeDrop', 'intlAlso', 'structTitle']) expect(get(m, `guide.${k}`), `${code} ${k}`).toBeTypeOf('string')
      expect(get(m, 'guide.kd.upcoming'), code).toBeTypeOf('string')
    }
  })
})

describe('guide: "On this page"', () => {
  it('shows once a page has two or more topics', () => {
    expect(showToc(0)).toBe(false)
    expect(showToc(1)).toBe(false)
    expect(showToc(2)).toBe(true)
    expect(showToc(7)).toBe(true)
  })
  it('shows on every guide page, the three-topic International page and the systems page included', () => {
    for (const p of GUIDE_PAGES.filter((x) => x !== 'key-dates')) expect(showToc(GUIDE_TOPICS[p].length), p).toBe(true)
    expect(GUIDE_TOPICS.international.length).toBe(3)
    expect(GUIDE_TOPICS.systems.length).toBeGreaterThan(1)
  })
})

describe('guide overview: the places linked from each page card', () => {
  const MESSAGES = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, vi, id, ms, hi }
  const get = (m: unknown, key: string): unknown => key.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), m)
  it('links only to places that exist on that page, with a name in all nine languages', () => {
    for (const p of GUIDE_PAGES) {
      expect(GUIDE_FEATURED[p].length, p).toBeLessThanOrEqual(4)
      for (const a of GUIDE_FEATURED[p]) {
        const ok = a.startsWith('svc-') ? p === 'systems' && SYSTEMS.some((s) => `svc-${s.id}` === a) : GUIDE_TOPICS[p].includes(a)
        expect(ok, `${p} ${a}`).toBe(true)
        for (const [code, m] of Object.entries(MESSAGES)) expect(get(m, anchorTitleKey(a)), `${code} ${a}`).toBeTypeOf('string')
      }
    }
  })
})
