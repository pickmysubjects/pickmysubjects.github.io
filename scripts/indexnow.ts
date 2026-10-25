/**
 * Tells IndexNow search engines (Bing, and through it Copilot and ChatGPT search; also Yandex,
 * Seznam, Naver) about every page in the sitemap, so new and changed pages are crawled soon
 * instead of whenever the crawler next comes by.
 *
 * The deploy workflow runs it after each successful Pages deploy, at most once a day (a cache
 * entry named after the UTC date marks a day as done). IndexNow accepts the same URLs again, but
 * several full submissions a day would look like spam. By hand:
 *
 *   npm run indexnow                 # read the live sitemap and submit
 *   npm run indexnow -- --dist       # read the sitemaps in dist/ instead (after a build)
 *   npm run indexnow -- --dry-run    # count what would be sent, send nothing
 *
 * The key is public by design: it only proves the submitter controls the site, through the
 * matching file served at the site's root (public/<key>.txt).
 *
 * No dependencies, so the workflow can run it with plain `node` (Node 24 strips the types).
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SITE = 'https://pickmysubjects.github.io'
export const KEY = '876442e96cb453de6a57008ed8287770'
export const ENDPOINT = 'https://api.indexnow.org/indexnow'
/** IndexNow takes at most 10,000 URLs per request. */
export const BATCH = 10_000

/** Every <loc> in a sitemap or sitemap index, in order. */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => (m[1] as string).replace(/&amp;/g, '&'))
}

/**
 * All page URLs under the sitemap index: each child sitemap read in turn, duplicates dropped,
 * and only addresses on our own host kept (IndexNow rejects the whole request otherwise).
 */
export async function collectUrls(read: (url: string) => Promise<string>, index = `${SITE}/sitemap.xml`): Promise<string[]> {
  const host = new URL(SITE).host
  const children = sitemapLocs(await read(index))
  const pages = (await Promise.all(children.map(async (c) => sitemapLocs(await read(c))))).flat()
  return [...new Set(pages)].filter((u) => new URL(u).host === host)
}

export function chunk<T>(items: T[], size = BATCH): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function payload(urlList: string[]): { host: string; key: string; keyLocation: string; urlList: string[] } {
  return { host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }
}

/** What an IndexNow reply means, in a line for the log. */
export function explainStatus(status: number): { ok: boolean; text: string } {
  switch (status) {
    case 200:
      return { ok: true, text: 'received' }
    case 202:
      return { ok: true, text: 'received; the key is still being checked' }
    case 400:
      return { ok: false, text: 'bad request (the JSON is malformed)' }
    case 403:
      return { ok: false, text: 'key not accepted: the key file is missing at keyLocation or does not contain the key' }
    case 422:
      return { ok: false, text: 'URLs not accepted: some do not belong to the host, or the key does not match the host' }
    case 429:
      return { ok: false, text: 'too many requests: submitting too often, try again tomorrow' }
    default:
      return { ok: false, text: 'unexpected reply' }
  }
}

/** Reads sitemaps from the live site, or from dist/ when `dist` is given. */
function reader(dist: string | undefined): (url: string) => Promise<string> {
  if (dist) return (url) => readFile(join(dist, new URL(url).pathname), 'utf8')
  return async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`sitemap ${url}: HTTP ${res.status}`)
    return res.text()
  }
}

async function main(argv: string[]): Promise<void> {
  const dist = argv.includes('--dist') ? fileURLToPath(new URL('../dist', import.meta.url)) : undefined
  const urls = await collectUrls(reader(dist))
  if (!urls.length) throw new Error('sitemap: no URLs')
  if (argv.includes('--dry-run')) {
    console.log(`IndexNow (dry run): ${urls.length} URLs in ${chunk(urls).length} request(s), nothing sent`)
    return
  }
  for (const batch of chunk(urls)) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload(batch)),
    })
    const { ok, text } = explainStatus(res.status)
    console.log(`IndexNow: ${batch.length} URLs, HTTP ${res.status} (${text})`)
    if (!ok) throw new Error(`IndexNow: HTTP ${res.status} ${await res.text()}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
