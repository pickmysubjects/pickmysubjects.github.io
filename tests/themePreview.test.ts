import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { themePreview } from '../scripts/themePreview'

const run = (css: string) => postcss([themePreview()]).process(css, { from: undefined }).css

describe('themePreview (local preview switch)', () => {
  it('lets the Glass switch override the Mac’s Reduce Transparency, and RT turn it on without it', () => {
    const out = run('@media (prefers-reduced-transparency: reduce) { :root { --x: 1 } :root .surface { --y: 1 } }')
    expect(out).toContain(':root:not(.force-glass) {')
    expect(out).toContain(':root:not(.force-glass) .surface')
    expect(out).toContain(':root.preview-rt {')
    expect(out).toContain(':root.preview-rt .surface')
  })

  it('lets the motion switch override the Mac’s Reduce Motion both ways', () => {
    const out = run('@media (prefers-reduced-motion: reduce) { * { animation: none } }')
    expect(out).toContain(':root:not(.force-motion) *')
    expect(out).toContain(':root.preview-rm *')
  })
})
