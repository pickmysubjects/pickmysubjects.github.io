import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { attachDiscussions } from '../scripts/dataset'
import { discussionFileSchema, discussionVerdict, type DiscussionSummary } from '../src/engine/schema'
import { splitDataset, withDetail } from '../src/engine/split'
import { discussionLabels } from '../src/i18n/discussion'
import { interpolate } from '../src/i18n'
import { en } from '../src/i18n/messages/en'
import DiscussionSummaryView from '../src/components/subject/DiscussionSummary.vue'
import { dataset, subject } from './helpers'

const reddit = discussionFileSchema.parse(parse(readFileSync(join(__dirname, 'fixtures/discussions/reddit-sample.yaml'), 'utf8')))

const vip = (over: Partial<DiscussionSummary> = {}): DiscussionSummary =>
  discussionFileSchema.parse({
    code: 'AAAA10001',
    source: 'StudentVIP',
    url: 'https://studentvip.com.au/unimelb/subjects/aaaa10001',
    reviews: 10,
    from: 2024,
    to: 2026,
    checked: '2026-10-01',
    points: [{ en: 'A made-up review point, long enough.', zh: '一条测试评价要点' }],
    ...over,
  })

function lookup(key: string): string {
  let node: unknown = en
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part]
  return typeof node === 'string' ? node : key
}
const t = (key: string, params?: Record<string, string | number>) => interpolate(lookup(key), params)

describe('discussion summaries from several sources', () => {
  it('accepts a Reddit summary with a thread count, and rejects a non-r/unimelb URL', () => {
    expect(reddit.source).toBe('Reddit')
    expect(reddit.source === 'Reddit' && reddit.threads).toBe(12)
    expect(() => discussionFileSchema.parse({ ...reddit, url: 'https://www.reddit.com/r/other/' })).toThrow()
    // A StudentVIP file can't carry `threads`, nor a Reddit one `reviews`.
    expect(() => discussionFileSchema.parse({ ...reddit, reviews: 3 })).toThrow()
  })

  it('puts every source on the subject, StudentVIP first, one per source', () => {
    const subjects = dataset([subject({ code: 'AAAA10001' })]).subjects
    const errors: string[] = []
    attachDiscussions(subjects, [{ path: 'r', dir: 'reddit', d: reddit }, { path: 's', dir: '', d: vip() }], errors)
    expect(errors).toEqual([])
    expect(subjects.AAAA10001!.discussions?.map((d) => d.source)).toEqual(['StudentVIP', 'Reddit'])
    attachDiscussions(subjects, [{ path: 'x', dir: '', d: reddit }], errors)
    expect(errors.join()).toMatch(/discussions\/reddit\//)
    expect(errors.join()).toMatch(/already has a Reddit summary/)
  })

  it('combines verdicts: agreeing sources count together, disagreeing ones give none', () => {
    expect(discussionVerdict([vip({ difficulty: 'hard' }), reddit], 'difficulty')).toEqual({ value: 'hard', n: 22 })
    expect(discussionVerdict([vip({ difficulty: 'mixed' }), reddit], 'difficulty')).toBeUndefined()
    expect(discussionVerdict([vip(), reddit], 'difficulty')).toEqual({ value: 'hard', n: 12 })
    expect(discussionVerdict([vip(), reddit], 'workload')).toBeUndefined()
    expect(discussionVerdict(undefined, 'workload')).toBeUndefined()
  })

  it('keeps the detail split working: core has no points, detail puts them back', () => {
    const s = { ...subject({ code: 'AAAA10001' }), discussions: [vip(), reddit] }
    const { core, details } = splitDataset(dataset([s]))
    expect(core.subjects.AAAA10001!.discussions?.every((d) => d.points.length === 0)).toBe(true)
    const full = withDetail(core.subjects.AAAA10001!, details.AAAA!.AAAA10001)
    expect(full.discussions?.map((d) => d.points.length)).toEqual([1, 1])
  })

  it('labels each source in its own words', () => {
    expect(discussionLabels(t, vip()).source).toBe('Summarised from 10 students on StudentVIP (2024–2026)')
    expect(discussionLabels(t, reddit)).toEqual({ source: 'From r/unimelb discussions (12 threads, 2023–2026)', read: 'Read the threads' })
  })

  it('shows one block per source on the subject page, and nothing for a source without points', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(DiscussionSummaryView, { discussions: [vip(), reddit] }) }))
    expect(html.match(/class="discussion-block"/g)).toHaveLength(2)
    expect(html).toContain('From r/unimelb discussions (12 threads, 2023–2026)')
    expect(html).toContain('href="https://studentvip.com.au/unimelb/subjects/aaaa10001"')
    const lean = await renderToString(createSSRApp({ render: () => h(DiscussionSummaryView, { discussions: [{ ...reddit, points: [] }] }) }))
    expect(lean).not.toContain('Reddit')
    expect(lean).not.toContain('discussion-block')
  })
})
