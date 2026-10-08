import { computed, watch } from 'vue'
import { usePersisted } from '@/composables/usePersisted'
import { en, type Messages } from './messages/en'
import { zhCN } from './messages/zh-CN'
import { zhTW } from './messages/zh-TW'
import { ja } from './messages/ja'
import { ko } from './messages/ko'
import { vi } from './messages/vi'
import { id } from './messages/id'
import { ms } from './messages/ms'
import { hi } from './messages/hi'
import { localeInPath, type LocaleCode } from './codes'

/** Languages most used by UniMelb students. Names are written in their own language. */
export const LOCALES = [
  { code: 'en', name: 'English', messages: en },
  { code: 'zh-CN', name: '简体中文', messages: zhCN },
  { code: 'zh-TW', name: '繁體中文', messages: zhTW },
  { code: 'ja', name: '日本語', messages: ja },
  { code: 'ko', name: '한국어', messages: ko },
  { code: 'vi', name: 'Tiếng Việt', messages: vi },
  { code: 'id', name: 'Bahasa Indonesia', messages: id },
  { code: 'ms', name: 'Bahasa Melayu', messages: ms },
  { code: 'hi', name: 'हिन्दी', messages: hi },
] as const satisfies readonly { code: string; name: string; messages: Messages }[]

export type { LocaleCode }
import { interpolate, type Params, type Translate } from './interpolate'
export { interpolate, type Params, type Translate }

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
const locale = usePersisted<LocaleCode>('sc:locale', detect())

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
  const messages = computed(() => LOCALES.find((l) => l.code === locale.value)?.messages ?? en)
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
