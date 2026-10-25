import { describe, expect, it } from 'vitest'
import { BATCH, chunk, collectUrls, explainStatus, KEY, payload, SITE, sitemapLocs } from '../scripts/indexnow'

const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-en.xml</loc><lastmod>2026-10-24</lastmod></sitemap>
  <sitemap><loc>${SITE}/sitemap-ja.xml</loc><lastmod>2026-10-24</lastmod></sitemap>
</sitemapindex>`
const urlset = (...locs: string[]) =>
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${l}</loc><lastmod>2026-10-24</lastmod></url>`).join('\n')}</urlset>`

describe('IndexNow', () => {
  it('reads every <loc>, unescaping &amp;', () => {
    expect(sitemapLocs(urlset(`${SITE}/a/`, `${SITE}/b/?x=1&amp;y=2`))).toEqual([`${SITE}/a/`, `${SITE}/b/?x=1&y=2`])
  })

  it('collects the pages of every sitemap in the index, once each, own host only', async () => {
    const files: Record<string, string> = {
      [`${SITE}/sitemap.xml`]: index,
      [`${SITE}/sitemap-en.xml`]: urlset(`${SITE}/`, `${SITE}/subjects/`, `${SITE}/subject/COMP10001/`),
      [`${SITE}/sitemap-ja.xml`]: urlset(`${SITE}/ja/`, `${SITE}/subjects/`, 'https://example.com/elsewhere/'),
    }
    const read = async (url: string) => {
      const xml = files[url]
      if (xml === undefined) throw new Error(`unexpected read ${url}`)
      return xml
    }
    expect(await collectUrls(read)).toEqual([`${SITE}/`, `${SITE}/subjects/`, `${SITE}/subject/COMP10001/`, `${SITE}/ja/`])
  })

  it('splits into requests of at most 10,000 URLs', () => {
    const urls = Array.from({ length: 2 * BATCH + 1 }, (_, i) => `${SITE}/p${i}/`)
    const parts = chunk(urls)
    expect(parts.map((p) => p.length)).toEqual([BATCH, BATCH, 1])
    expect(parts.flat()).toEqual(urls)
    expect(chunk([])).toEqual([])
  })

  it('sends the host, the key and where the key file is', () => {
    expect(payload([`${SITE}/`])).toEqual({
      host: 'pickmysubjects.github.io',
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: [`${SITE}/`],
    })
  })

  it('the key is 32 hex characters and its file is in public/', async () => {
    expect(KEY).toMatch(/^[0-9a-f]{32}$/)
    const { readFileSync } = await import('node:fs')
    expect(readFileSync(new URL(`../public/${KEY}.txt`, import.meta.url), 'utf8').trim()).toBe(KEY)
  })

  it('treats 200 and 202 as sent and explains the rest', () => {
    expect(explainStatus(200).ok).toBe(true)
    expect(explainStatus(202).ok).toBe(true)
    for (const s of [400, 403, 422, 429, 500]) expect(explainStatus(s).ok).toBe(false)
    expect(explainStatus(403).text).toMatch(/key/)
    expect(explainStatus(422).text).toMatch(/host/)
  })
})
