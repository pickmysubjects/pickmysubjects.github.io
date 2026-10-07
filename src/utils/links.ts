/**
 * Plain outbound links to places students discuss a subject. We only ever link:
 * no embeds, previews or copied content (see docs/discussion-sources.md).
 */
export interface OutboundLink {
  label: string
  href: string
  lang: 'en' | 'zh'
}

export function discussionLinks(code: string): OutboundLink[] {
  const q = encodeURIComponent(code)
  const zh = encodeURIComponent(`墨大 ${code}`)
  return [
    { label: 'r/unimelb', href: `https://www.reddit.com/r/unimelb/search/?q=${q}&restrict_sr=1`, lang: 'en' },
    { label: 'StudentVIP', href: `https://www.studentvip.com.au/unimelb/subjects/${code.toLowerCase()}`, lang: 'en' },
    {
      label: 'Counter Course Handbook',
      href: 'https://umsu.unimelb.edu.au/support/eduacademic/counter-course-handbook/',
      lang: 'en',
    },
    { label: '小红书', href: `https://www.xiaohongshu.com/search_result?keyword=${zh}`, lang: 'zh' },
    { label: '知乎', href: `https://www.zhihu.com/search?type=content&q=${zh}`, lang: 'zh' },
  ]
}
