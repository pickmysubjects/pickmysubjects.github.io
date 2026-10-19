import { discussionCount, type DiscussionSummary } from '@/engine'
import type { Translate } from './interpolate'

/** The line naming where one discussion summary comes from, and its link text, per source. */
export function discussionLabels(t: Translate, d: DiscussionSummary): { source: string; read: string } {
  const years = d.from === d.to ? String(d.to) : `${d.from}–${d.to}`
  const n = discussionCount(d)
  return d.source === 'Reddit'
    ? { source: t('subject.discussSourceReddit', { n, years }), read: t('subject.discussReadReddit') }
    : { source: t('subject.discussSource', { n, years, source: d.source }), read: t('subject.discussRead') }
}
