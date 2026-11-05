/**
 * Tells IndexNow search engines (Bing, and through it Copilot and ChatGPT search; also Yandex,
 * Seznam, Naver) about the pages that changed lately (sitemap lastmod within RECENT_DAYS), so they
 * are crawled soon instead of whenever the crawler next comes by. IndexNow is meant for changed
 * pages: sending the whole site every day would look like spam. --all sends every page once.
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
/** A page counts as changed when its lastmod is this many days back or newer (deploys aren't daily). */
export const RECENT_DAYS = 7
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
export async function collectUrls(read: (url: string) => Promise<string>, index = `${SITE}/sitemap.xml`, since?: string): Promise<string[]> {
  const host = new URL(SITE).host
  const children = sitemapLocs(await read(index))
  const pages = (await Promise.all(children.map(async (c) => sitemapEntries(await read(c))))).flat()
  return [...new Set(pages.filter((e) => !since || (e.lastmod ?? '') >= since).map((e) => e.loc))].filter((u) => new URL(u).host === host)
}

/** Each <url>'s address and lastmod (when it has one). */
export function sitemapEntries(xml: string): { loc: string; lastmod?: string }[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap((m) => {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(m[1]!)?.[1]
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(m[1]!)?.[1]
    return loc ? [{ loc: loc.replace(/&amp;/g, '&'), ...(lastmod ? { lastmod: lastmod.slice(0, 10) } : {}) }] : []
  })
}

/** The first day that still counts as recent, as YYYY-MM-DD. */
export function recentSince(today: Date, days = RECENT_DAYS): string {
  return new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10)
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
  const since = argv.includes('--all') ? undefined : recentSince(new Date())
  const urls = await collectUrls(reader(dist), undefined, since)
  if (!urls.length) {
    console.log(`IndexNow: no page changed since ${since}, nothing sent`)
    return
  }
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
