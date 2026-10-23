import { computed, shallowReactive, watch } from 'vue'
import { usePersisted } from '@/composables/usePersisted'
import { en, type Messages } from './messages/en'
import { LOCALE_CODES, localeInPath, type LocaleCode } from './codes'

/** Languages most used by UniMelb students. Names are written in their own language. */
export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'hi', name: 'हिन्दी' },
] as const satisfies readonly { code: string; name: string }[]

/**
 * English is bundled (it is the fallback); every other language is its own chunk, downloaded
 * only when that language is shown. Node scripts and tests import the files directly.
 */
const LOADERS: Record<Exclude<LocaleCode, 'en'>, () => Promise<Messages>> = {
  'zh-CN': () => import('./messages/zh-CN').then((m) => m.zhCN),
  'zh-TW': () => import('./messages/zh-TW').then((m) => m.zhTW),
  ja: () => import('./messages/ja').then((m) => m.ja),
  ko: () => import('./messages/ko').then((m) => m.ko),
  vi: () => import('./messages/vi').then((m) => m.vi),
  id: () => import('./messages/id').then((m) => m.id),
  ms: () => import('./messages/ms').then((m) => m.ms),
  hi: () => import('./messages/hi').then((m) => m.hi),
}
const loaded = shallowReactive<Partial<Record<LocaleCode, Messages>>>({ en })
const loading = new Map<LocaleCode, Promise<void>>()

/** Downloads a language's messages (once). Resolves even if the download fails: English shows instead. */
export function loadLocale(code: LocaleCode): Promise<void> {
  if (loaded[code]) return Promise.resolve()
  let p = loading.get(code)
  if (!p) {
    p = LOADERS[code as Exclude<LocaleCode, 'en'>]().then(
      (m) => {
        loaded[code] = m
      },
      (e: unknown) => {
        loading.delete(code)
        console.warn(`Could not load ${code} messages`, e)
      },
    )
    loading.set(code, p)
  }
  return p
}

export type { LocaleCode }
import { interpolate, joinList, localList, type Params, type Translate } from './interpolate'
export { interpolate, joinList, localList, type Params, type Translate }

function detect(): LocaleCode {
  try {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const l = lang.toLowerCase()
      if (l.startsWith('zh')) return /tw|hk|mo|hant/.test(l) ? 'zh-TW' : 'zh-CN'
      const match = LOCALES.find((x) => l.startsWith(x.code.toLowerCase()))
      if (match) return match.code
    }
  } catch {
    // navigator unavailable (tests); fall through
  }
  return 'en'
}

// Module-level so every component shares one choice.
// A saved language we don't offer ("fr", 42) falls back to the browser's.
const locale = usePersisted<LocaleCode>('sc:locale', detect(), (raw) => ((LOCALE_CODES as readonly unknown[]).includes(raw) ? (raw as LocaleCode) : detect()))

// A language in the address (/zh-CN/subject/…) wins: a shared link opens in its language.
if (typeof location !== 'undefined') {
  const base = import.meta.env.BASE_URL
  // An old /subject-compass/… address keeps its language too (the router drops that part).
  const rest = location.pathname.startsWith(base) ? location.pathname.slice(base.length).replace(/^subject-compass(?:\/|$)/, '') : null
  const inUrl = rest === null ? null : localeInPath(rest)
  if (inUrl) locale.value = inUrl
}

/** The language currently shown (for building addresses outside components). */
export function currentLocale(): LocaleCode {
  return locale.value
}

watch(
  locale,
  (code) => {
    if (typeof document !== 'undefined') document.documentElement.lang = code
    void loadLocale(code)
  },
  { immediate: true },
)

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

export function useI18n() {
  const messages = computed(() => loaded[locale.value] ?? en)
  const t = computed<Translate>(() => {
    const current = messages.value
    // A count of exactly one uses the "…One" message (e.g. "1 problem" not "1 problems").
    const pick = (key: string, params?: Params) => (params?.n === 1 ? `${key}One` : key)
    return (key, params) => {
      const k = pick(key, params)
      return interpolate(lookup(current, k) ?? lookup(en, k) ?? lookup(current, key) ?? lookup(en, key) ?? key, params)
    }
  })
  return {
    locale: computed(() => locale.value),
    t,
    setLocale: (code: LocaleCode) => {
      locale.value = code
    },
  }
}
