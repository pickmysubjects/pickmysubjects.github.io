import type { Localized, Subject } from '@/engine'

/** Our own wording in the reader's language: Traditional Chinese falls back to Simplified, anything else to English. */
export function pickLocalized(text: Localized, locale: string): string {
  const own = (text as Record<string, string | undefined>)[locale === 'zh-CN' ? 'zh' : locale]
  if (own) return own
  return locale === 'zh-TW' ? text.zh : text.en
}

/** The subject's title in the reader's language when we have one (Chinese only for now), else ''. */
export function localTitle(subject: Pick<Subject, 'titles'>, locale: string): string {
  const titles = subject.titles
  if (!titles) return ''
  if (locale === 'zh-CN') return titles.zh
  if (locale === 'zh-TW') return titles['zh-TW'] ?? titles.zh
  return ''
}

/** "Foundations of Computing（计算基础）" for page and tab titles; just the title when there's no translation. */
export function withLocalTitle(title: string, local: string): string {
  return local ? `${title}（${local}）` : title
}
