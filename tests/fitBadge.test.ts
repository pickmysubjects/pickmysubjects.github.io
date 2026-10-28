import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FitBadge from '../src/components/browse/FitBadge.vue'
import { recommend } from '../src/engine/recommend'
import { realData } from './realData'

describe('"Fits me": the match score on each card', () => {
  const data = realData()
  const profile = { results: [{ code: 'COMP10001', mark: 82 }], skills: { programming: 5, maths: 4 }, interests: ['machine-learning'], goal: 'balanced' as const }
  const recs = recommend(data, profile, { course: 'B-SCI' })

  it('shows the score the sort-for-me engine worked out, as "Match n%" with a meter of the same width', async () => {
    expect(recs.length).toBeGreaterThan(2)
    for (const rec of [recs[0]!, recs[Math.floor(recs.length / 2)]!, recs[recs.length - 1]!]) {
      const html = await renderToString(createSSRApp({ render: () => h(FitBadge, { rec }) }))
      expect(html).toContain(`Match ${rec.betterThan}%`)
      expect(html).toContain(`width:${rec.betterThan}%`)
    }
  })

  it('the best suggestion scores at the top and the order follows the score', () => {
    expect(recs[0]!.betterThan).toBeGreaterThanOrEqual(90)
    expect(recs[0]!.betterThan).toBeGreaterThanOrEqual(recs[recs.length - 1]!.betterThan)
  })
})
