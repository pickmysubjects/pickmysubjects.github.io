import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, watchEffect } from 'vue'
import { resetAnalytics } from '@/utils/analytics'

// A browser just big enough for useView: an address bar, history and a fake goatcounter.
function fakeBrowser(path: string) {
  const url = new URL(`https://example.test${path}`)
  const loc = {
    get pathname() { return url.pathname },
    get search() { return url.search },
    get hash() { return url.hash },
    get href() { return url.href },
    origin: url.origin,
    assign: vi.fn(),
  }
  const setAddress = (_s: unknown, _t: string, to?: string | URL | null) => {
    if (to) {
      const next = new URL(String(to), url)
      url.pathname = next.pathname
      url.search = next.search
      url.hash = next.hash
    }
  }
  const counts: { path: string; title?: string; event?: boolean }[] = []
  const doc = { title: 'Home | PickMySubjects', addEventListener: vi.fn(), getElementById: () => null, documentElement: { lang: 'en' } }
  vi.stubGlobal('location', loc)
  vi.stubGlobal('history', { state: null, pushState: setAddress, replaceState: setAddress })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    scrollTo: vi.fn(),
    setTimeout,
    goatcounter: { count: (v: { path: string; title?: string; event?: boolean }) => counts.push(v) },
  })
  return { counts, doc }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  resetAnalytics()
})

describe('page counts', () => {
  it('send each page with its own title, once per move and once on first load', async () => {
    const { counts, doc } = fakeBrowser('/')
    vi.resetModules()
    const { useView, go, replaceAddress } = await import('@/composables/useView')
    const { view, param } = useView()
    // Stands in for App.vue's title watcher.
    const title = computed(() => `${view.value}${param.value ? ` ${param.value}` : ''} | PickMySubjects`)
    watchEffect(() => { doc.title = title.value })
    await nextTick()
    go('plan')
    await nextTick()
    go('subject/FINA30025')
    await nextTick()
    replaceAddress('subject/FINA30025?tab=reviews')
    await nextTick()
    const pages = counts.filter((c) => !c.event)
    expect(pages).toEqual([
      expect.objectContaining({ path: '/', title: 'home | PickMySubjects' }),
      expect.objectContaining({ path: '/plan', title: 'plan | PickMySubjects' }),
      expect.objectContaining({ path: '/subject/FINA30025', title: 'subject FINA30025 | PickMySubjects' }),
    ])
  })
})
