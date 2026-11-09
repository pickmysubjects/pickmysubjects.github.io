// Checks the built site (dist/) the way search engines read it: every page has one title,
// description, canonical (its own address), hreflang, H1 and JSON-LD; the sitemaps list exactly the
// built pages (and sitemap.txt / pages.xml list the same); no two pages in one language share a title; no lastmod is in the future.
// Run after the build: npm run seo:check. Exits 1 on any problem.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const SITE = 'https://pickmysubjects.github.io/'
const pages = new Map()
;(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (f === 'index.html') pages.set(SITE + (dir === DIST ? '' : dir.slice(DIST.length + 1) + '/'), readFileSync(p, 'utf8'))
  }
})(DIST)

const problems = []
const titles = new Map()
const one = (re, h) => re.exec(h)?.[1]
for (const [url, h] of pages) {
  const title = one(/<title>(.*?)<\/title>/s, h)
  if (!title) problems.push(`no title: ${url}`)
  if (!one(/<meta name="description" content="(.*?)"/, h)) problems.push(`no description: ${url}`)
  if (one(/<link rel="canonical" href="(.*?)"/, h) !== url) problems.push(`canonical isn't the page: ${url}`)
  if (!h.includes('hreflang=')) problems.push(`no hreflang: ${url}`)
  if ((h.match(/<h1\b/g) ?? []).length !== 1) problems.push(`not one H1: ${url}`)
  if (!h.includes('application/ld+json')) problems.push(`no JSON-LD: ${url}`)
  const lang = one(/<html lang="(.*?)"/, h) ?? ''
  const key = `${lang} ${title}`
  if (titles.has(key)) problems.push(`same title as ${titles.get(key)}: ${url}`)
  else titles.set(key, url)
}

// Melbourne's date (the build's lastmod), not UTC's: before 10 or 11 am there UTC is still yesterday.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne' }).format(new Date())
const listed = new Set()
for (const f of readdirSync(DIST).filter((f) => /^sitemap-.+\.xml$/.test(f))) {
  const xml = readFileSync(join(DIST, f), 'utf8')
  for (const [, loc, mod] of xml.matchAll(/<loc>(.*?)<\/loc><lastmod>(.*?)<\/lastmod>/g)) {
    listed.add(loc)
    if (mod > today) problems.push(`lastmod in the future (${mod}): ${loc}`)
  }
}
const txt = new Set(readFileSync(join(DIST, 'sitemap.txt'), 'utf8').split('\n').filter(Boolean))
if (txt.size !== listed.size || [...listed].some((u) => !txt.has(u))) problems.push('sitemap.txt and the XML sitemaps list different pages')
if (readFileSync(join(DIST, 'pages.xml'), 'utf8') !== readFileSync(join(DIST, 'sitemap.xml'), 'utf8')) problems.push('pages.xml differs from sitemap.xml')
for (const u of listed) if (!pages.has(u)) problems.push(`in the sitemap, not built: ${u}`)
for (const u of pages.keys()) if (!listed.has(u)) problems.push(`built, not in the sitemap: ${u}`)

console.log(`${pages.size} pages, ${listed.size} in the sitemaps, ${problems.length} problems`)
for (const p of problems.slice(0, 50)) console.log(' ', p)
process.exit(problems.length ? 1 : 0)
