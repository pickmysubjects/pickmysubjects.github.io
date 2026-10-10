/**
 * Plain outbound links to places students discuss a subject. We only ever link:
 * no embeds, previews or copied content (see docs/discussion-sources.md).
 */
export interface OutboundLink {
  label: string
  href: string
  /** Language of the site, for the link's `lang` attribute. */
  lang: string
}

/**
 * Where students who read each language talk about subjects: searches for the subject code
 * (with the university's name in that language where it helps). The page's own language comes
 * first, then the English sources every UniMelb student uses.
 */
const BY_LOCALE: Record<string, (code: string) => OutboundLink[]> = {
  'zh-CN': (c) => {
    const q = encodeURIComponent(`墨大 ${c}`)
    return [
      { label: '小红书', href: `https://www.xiaohongshu.com/search_result?keyword=${q}`, lang: 'zh-CN' },
      { label: '知乎', href: `https://www.zhihu.com/search?type=content&q=${q}`, lang: 'zh-CN' },
      { label: '哔哩哔哩', href: `https://search.bilibili.com/all?keyword=${q}`, lang: 'zh-CN' },
    ]
  },
  'zh-TW': (c) => {
    const q = encodeURIComponent(`墨爾本大學 ${c}`)
    return [
      { label: 'Dcard', href: `https://www.dcard.tw/search?query=${q}`, lang: 'zh-TW' },
      { label: '小紅書', href: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`墨大 ${c}`)}`, lang: 'zh-TW' },
    ]
  },
  ja: (c) => {
    const q = encodeURIComponent(`メルボルン大学 ${c}`)
    return [
      { label: 'Yahoo!知恵袋', href: `https://chiebukuro.yahoo.co.jp/search?p=${encodeURIComponent('メルボルン大学')}`, lang: 'ja' },
      { label: 'note', href: `https://note.com/search?q=${q}&context=note`, lang: 'ja' },
    ]
  },
  ko: (c) => [{ label: '네이버', href: `https://search.naver.com/search.naver?query=${encodeURIComponent(`멜버른대 ${c}`)}`, lang: 'ko' }],
  vi: () => [{ label: 'VOZ', href: `https://voz.vn/search/1/?q=${encodeURIComponent('unimelb')}`, lang: 'vi' }],
  ms: (c) => [{ label: 'Lowyat', href: `https://www.google.com/search?q=${encodeURIComponent(`site:forum.lowyat.net unimelb ${c}`)}`, lang: 'ms' }],
  id: () => [{ label: 'Kaskus', href: `https://www.kaskus.co.id/search?q=${encodeURIComponent('unimelb')}`, lang: 'id' }],
  hi: (c) => [{ label: 'Quora', href: `https://www.quora.com/search?q=${encodeURIComponent(`unimelb ${c}`)}`, lang: 'en' }],
}

export function discussionLinks(code: string, locale = 'en'): OutboundLink[] {
  const q = encodeURIComponent(code)
  const english: OutboundLink[] = [
    { label: 'StudentVIP', href: `https://www.studentvip.com.au/unimelb/subjects/${code.toLowerCase()}`, lang: 'en' },
    { label: 'r/unimelb', href: `https://www.reddit.com/r/unimelb/search/?q=${q}&restrict_sr=1`, lang: 'en' },
    { label: 'ATAR Notes', href: `https://www.google.com/search?q=${encodeURIComponent(`site:atarnotes.com ${code}`)}`, lang: 'en' },
    {
      label: 'Counter Course Handbook',
      href: 'https://umsu.unimelb.edu.au/support/eduacademic/counter-course-handbook/',
      lang: 'en',
    },
  ]
  return [...(BY_LOCALE[locale]?.(code) ?? []), ...english]
}

/** A subject's page in the University's Handbook (the current year's). */
export function handbookUrl(code: string, year = new Date().getFullYear()): string {
  return `https://handbook.unimelb.edu.au/${year}/subjects/${code.toLowerCase()}`
}
