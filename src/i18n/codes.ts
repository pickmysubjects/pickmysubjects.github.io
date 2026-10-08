/** Language codes, in the order of the language menu. English pages have no prefix in the address. */
export const LOCALE_CODES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'vi', 'id', 'ms', 'hi'] as const
export type LocaleCode = (typeof LOCALE_CODES)[number]

/** The language named by the first part of a path (after the site base), e.g. "zh-CN/subject/X". */
export function localeInPath(path: string): LocaleCode | null {
  const head = path.replace(/^\/+/, '').split('/')[0] ?? ''
  return head !== 'en' && (LOCALE_CODES as readonly string[]).includes(head) ? (head as LocaleCode) : null
}
