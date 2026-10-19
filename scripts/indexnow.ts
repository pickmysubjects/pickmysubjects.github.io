/**
 * Tells IndexNow search engines (Bing, and through it Copilot and ChatGPT search; also Yandex,
 * Seznam, Naver) about every page in the live sitemap, so new and changed pages are crawled
 * soon instead of whenever the crawler next comes by. Run weekly by .github/workflows/indexnow.yml
 * and by hand after a big data change: `npm run indexnow`.
 *
 * The key is public by design: it only proves the submitter controls the site, through the
 * matching file served at the site's root (public/<key>.txt).
 */
const SITE = 'https://pickmysubjects.github.io'
const KEY = '876442e96cb453de6a57008ed8287770'
/** IndexNow takes at most 10,000 URLs per request. */
const BATCH = 10_000

async function main(): Promise<void> {
  const res = await fetch(`${SITE}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`)
  const urls = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] as string)
  if (!urls.length) throw new Error('sitemap: no URLs')
  for (let i = 0; i < urls.length; i += BATCH) {
    const post = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(i, i + BATCH) }),
    })
    // 200 = received, 202 = received and the key is still being checked.
    if (post.status !== 200 && post.status !== 202) throw new Error(`IndexNow: HTTP ${post.status} ${await post.text()}`)
    console.log(`IndexNow: sent ${Math.min(BATCH, urls.length - i)} URLs (HTTP ${post.status})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
