import type { Localized } from '@/engine'

/** Our own wording in the reader's language: Traditional Chinese falls back to Simplified, anything else to English. */
export function pickLocalized(text: Localized, locale: string): string {
  const own = (text as Record<string, string | undefined>)[locale === 'zh-CN' ? 'zh' : locale]
  if (own) return own
  return locale === 'zh-TW' ? text.zh : text.en
}
