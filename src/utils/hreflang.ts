import type { LocaleCode } from '@/i18n/codes'

/**
 * The hreflang values a locale's pages are declared for. Traditional Chinese pages also serve
 * Hong Kong and Macau readers (and any generic Traditional Chinese request); Simplified Chinese
 * pages also answer a generic Simplified Chinese request.
 */
const EXTRA: Partial<Record<LocaleCode, string[]>> = {
  'zh-TW': ['zh-HK', 'zh-MO', 'zh-Hant'],
  'zh-CN': ['zh-Hans'],
}

export function hreflangsFor(code: LocaleCode): string[] {
  return [code, ...(EXTRA[code] ?? [])]
}
