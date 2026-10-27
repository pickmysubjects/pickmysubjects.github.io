import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePath, VIEWS } from '../src/composables/useView'
import { MENUS } from '../src/components/layout/nav'
import { FEATURE_INDEX, fold, searchFeatures, type Texts } from '../src/components/layout/featureIndex'
import { GUIDE_PAGES, GUIDE_TOPICS } from '../src/utils/guideSections'
import { SYSTEMS } from '../src/utils/guideServices'
import { presetFromSlug } from '../src/engine/browse'
import { rankFromSlug } from '../src/engine/easeRanking'
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

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** The page's language, then English: what the header search matches against. */
const textsIn = (code: keyof typeof MESSAGES): Texts => (key) => [lookup(MESSAGES[code], key), lookup(en, key)].filter((x): x is string => !!x)

/** Every id="…" written in the app's components (anchors a menu item can jump to). */
function sourceIds(): Set<string> {
  const ids = new Set<string>()
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (p.endsWith('.vue')) for (const m of readFileSync(p, 'utf8').matchAll(/\bid="([\w-]+)"/g)) ids.add(m[1]!)
    }
  }
  walk(join(__dirname, '../src'))
  return ids
}

const ANCHORS = sourceIds()

/** Whether a menu or search target is a real place in the app. */
function resolves(to: string): string | true {
  const [pathAndQuery = '', anchor] = to.split('#')
  const [path = '', search = ''] = pathAndQuery.split('?')
  const r = parsePath(path, search ? `?${search}` : '')
  if (r.view === 'home' && path !== '') return `${to}: not a page`
  if (r.view === 'subjects' && r.param && !presetFromSlug(r.param) && !rankFromSlug(r.param)) return `${to}: unknown list`
  if (r.view === 'tools' && !['', 'final', 'wam'].includes(r.param)) return `${to}: unknown tool`
  if (r.view === 'guide' && r.param && !(GUIDE_PAGES as readonly string[]).includes(r.param)) return `${to}: unknown guide page`
  if (anchor) {
    if (r.view === 'guide') {
      const page = r.param as (typeof GUIDE_PAGES)[number]
      const ok = GUIDE_TOPICS[page]?.includes(anchor) || (page === 'systems' && SYSTEMS.some((s) => `svc-${s.id}` === anchor))
      if (!ok) return `${to}: no such topic on that page`
    } else if (!ANCHORS.has(anchor)) return `${to}: no element with id="${anchor}"`
  }
  return true
}

describe('menus', () => {
  it('every menu item and every area landing page is a real place', () => {
    for (const m of MENUS) {
      expect(resolves(m.to)).toBe(true)
      for (const item of m.items) expect(resolves(item.to)).toBe(true)
    }
  })

  it('every page is reachable from the menus (detail pages and redirects aside)', () => {
    const reached = new Set(MENUS.flatMap((m) => [m.to, ...m.items.map((i) => i.to)]).map((to) => parsePath(to.split(/[?#]/)[0] ?? '').view))
    // home: the logo and the tab bar; subject: a detail page; recommend: an old address that redirects.
    const exempt = new Set(['home', 'subject', 'recommend'])
    expect(VIEWS.filter((v) => !exempt.has(v) && !reached.has(v))).toEqual([])
  })
})

describe('feature search index', () => {
  it('every entry is a real place, with a unique id', () => {
    for (const e of FEATURE_INDEX) expect(resolves(e.to)).toBe(true)
    expect(new Set(FEATURE_INDEX.map((e) => e.id)).size).toBe(FEATURE_INDEX.length)
  })

  it('every name, line and set of extra words exists in all 9 languages', () => {
    for (const [code, messages] of Object.entries(MESSAGES)) {
      for (const e of FEATURE_INDEX) {
        for (const key of [e.title, e.desc, e.syn && `search.syn.${e.syn}`].filter((k): k is string => !!k)) {
          expect(lookup(messages, key), `${code} ${key}`).toBeTypeOf('string')
        }
      }
    }
  })

  it('every set of extra words is used by some entry', () => {
    const used = new Set(FEATURE_INDEX.map((e) => e.syn).filter(Boolean))
    expect(Object.keys(en.search.syn).filter((k) => !used.has(k))).toEqual([])
  })

  const top = (q: string, code: keyof typeof MESSAGES = 'en', n = 3) => searchFeatures(q, textsIn(code)).slice(0, n).map((h) => h.entry.to)

  it('finds features and guide topics by name and by the words students use', () => {
    expect(top('WAM')).toEqual(expect.arrayContaining(['tools/wam/', 'guide/basics/#wam']))
    expect(top('census', 'en', 5)).toEqual(expect.arrayContaining(['guide/key-dates/', 'guide/semester/#drop']))
    expect(top('hurdle')).toContain('guide/semester/#hurdles')
    expect(top('Canvas')).toContain('guide/systems/#svc-canvas')
    expect(top('MFA')).toContain('guide/systems/#svc-okta')
    expect(top('outlook')).toContain('guide/systems/#svc-email')
    expect(top('两步验证', 'zh-CN')).toContain('guide/systems/#svc-okta')
    expect(top('学生门户', 'zh-CN')).toContain('guide/systems/#svc-myUnimelb')
    expect(top('Gradescope')).toContain('guide/systems/#svc-gradescope')
    expect(top('visa')).toContain('guide/international/#rsl')
    expect(top('changelog')).toContain('changes/')
    expect(top('签证', 'zh-CN')).toContain('guide/international/#rsl')
    expect(top('水课', 'zh-CN')).toContain('subjects/easy/')
    expect(top('census', 'zh-CN', 5)).toContain('guide/key-dates/')
    expect(top('涼課', 'zh-TW')).toContain('subjects/easy/')
    expect(top('楽単', 'ja')).toContain('subjects/easy/')
    expect(top('꿀강', 'ko')).toContain('subjects/easy/')
    expect(top('mon de', 'vi')).toContain('subjects/easy/')
    expect(top('वीज़ा', 'hi')).toContain('guide/international/#rsl')
    // English words work whatever the page's language.
    expect(top('special consideration', 'ko')).toContain('guide/semester/#special-consideration')
  })

  it('ranks an exact name first and finds nothing for nonsense', () => {
    expect(searchFeatures('Privacy', textsIn('en'))[0]?.entry.to).toBe('privacy/')
    expect(searchFeatures('zzqx', textsIn('en'))).toEqual([])
    expect(searchFeatures('  ', textsIn('en'))).toEqual([])
  })

  it('folds case, full-width letters and Vietnamese accents', () => {
    expect(fold('ＷＡＭ')).toBe('wam')
    expect(fold('Môn Dễ')).toBe('mon de')
    expect(fold('Đăng ký')).toBe('dang ky')
  })
})
