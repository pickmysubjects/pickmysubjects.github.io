import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SubjectSection from '../src/components/subject/SubjectSection.vue'

const render = (props: { fold?: boolean }) =>
  renderToString(
    createSSRApp({
      render: () => h(SubjectSection, { title: 'Related subjects', ...props }, { aside: () => h('span', { class: 'tip' }, 'TIP'), default: () => 'BODY' }),
    }),
  )

describe('SubjectSection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the aside on a folded section on phones, beside its title', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const html = await render({ fold: true })
    expect(html).toContain('<details')
    expect(html).toContain('TIP')
    expect(html.indexOf('TIP')).toBeLessThan(html.indexOf('</summary>'))
  })

  it('shows the aside on wider screens too', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const html = await render({ fold: true })
    expect(html).not.toContain('<details')
    expect(html).toContain('TIP')
  })
})
