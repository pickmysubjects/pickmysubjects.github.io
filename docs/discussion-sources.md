# Where UniMelb students discuss subjects, and what we may do with each source

Researched 2026-10-07 from public pages and search results. Nothing was scraped and no accounts were used. This is not legal advice.

- **[verified]** = the page itself was read.
- **[index]** = known only from search-engine results.

## Bottom line

1. Only two live, structured, UniMelb-specific review datasets exist, both in English:
   - **StudentVIP**: commercial, ~6,000 ratings, active.
   - **UMSU Counter Course Handbook**: non-commercial, sparse.

   The **ATAR Notes** review thread (2011–~2016) is rich but archived. **r/unimelb** (~61k members) is the most active, but unstructured.
2. **The Chinese-language world has no structured review database.** It's scattered posts on 小红书, 知乎, 贴吧, 豆瓣 and B站, many from 2019–21, much of it tutoring-company marketing.
3. **Every platform whose terms could be read forbids scraping or bulk copying.**
   - 知乎 explicitly forbids using its content for LLM/AI training.
   - Reddit requires a contract for commercial or AI use.
   - 小红书 forbids copying, reading or computing statistics on its content without written permission.
   - Chinese courts treat bulk re-hosting of a competitor's user reviews as unfair competition (大众点评 v 百度, 2016). The 2025 Anti-Unfair Competition Law, Art. 13, adds an explicit data clause.
4. **So: link out, never ingest, and build our own review corpus.** It needs a contributor licence that already covers display, AI summarisation and possible future commercial use.

## Sources

| Source | Lang | Activity | Reuse allowed? | What we do |
|---|---|---|---|---|
| r/unimelb | EN | ~61k members, very active [index] | Collecting data only by separate agreement; commercial/AI use needs a contract | Per-subject **search link**; recruit reviewers with mod approval |
| UMSU Counter Course Handbook | EN | Sparse; latest seen Apr 2025 [verified] | No CCH-specific terms found | Link; **partner** (cross-link or become its endorsed successor) |
| StudentVIP | EN | ~6k ratings, newest days old [verified] | Terms (2019) silent on scraping/AI — silence ≠ permission | Per-subject **deep link** `studentvip.com.au/unimelb/subjects/<code>`; ask before any data use |
| ATAR Notes UniMelb thread | EN | Archived 2011–~2016, 2.66M reads [verified] | No extraction tools; personal non-commercial use | Link to the archive; borrow the *template idea* (fields aren't copyrightable) |
| Rate My Professors | EN | ~No UniMelb staff [verified] | Scraping and commercial use banned | Ignore |
| Whirlpool | EN | Archived 2010s [index] | Terms not retrieved | Ignore |
| CISSA / MUMS / faculty societies | EN | No review guides found | — | **Distribution partners** (O-Week, Discord, newsletters) |
| Discord / Facebook groups | EN | CISSA Discord verified | Scraping and self-bots banned | Invite with mod permission only |
| 小红书 | ZH | Many posts; surfaced ones 2019–20 [index] | Copying, reading or statistics need written permission | Keyword **search link**; run our own account to recruit |
| 知乎 | ZH | A few guides 2019–21, some newer Q&A [index] | Scraping banned; **LLM/AI use explicitly banned** (§3.10) | Search link only; ask authors directly to republish |
| 哔哩哔哩 | ZH | Mostly tutoring uploads [index] | Obtaining data banned (§5.6) | Search link at most |
| 微信 / CSSA UniMelb | ZH | Private groups | Crawlers banned (§5.2.2.12) | **Partner with CSSA** as the channel to Chinese students; never harvest chats (PIPL) |
| 豆瓣 / 贴吧 / 一亩三分地 | ZH | Sporadic and dated | Commercial copying banned / not retrieved | Skip or link |
| 匠人学院 (JR Academy) | ZH | Subject pages now redirect to `unimateai.com` (likely an AI planner competitor) [verified] | Bots and competing products banned | **Do not use.** Its "pass rates" have no stated source |
| Official End Subject Survey | EN | Released via the LMS (login) | — | Not available; self-reported grades fill this gap |

## Rules for our product

- **Outbound links only:** no iframes, embeds, link previews or thumbnails, and never third-party scores or snippets.
- **Our own reviews:**
  - Structured fields: difficulty, weekly hours, assessment style, "what I wish I knew", semester taken, optional self-reported grade band.
  - About the *subject*, not named staff, because of defamation risk.
  - A contributor licence of **CC BY 4.0 or a perpetual non-exclusive licence to the project**. Avoid NC licences if monetisation is possible.
  - Authors may import their *own* past posts from other platforms; those platforms only take non-exclusive licences.
- **Governance:**
  - anonymous but verified posting;
  - rate limits;
  - minimum *n* before showing aggregates;
  - a takedown contact;
  - published terms and privacy policy (Australian Privacy Act; PIPL if serving users in China).

## Key references

- Zhihu terms §3.10: https://www.zhihu.com/term/zhihu-terms
- Xiaohongshu terms (mirror): https://www.elawcn.com/agreement/2026/0301/1751.html
- Bilibili terms (mirror): https://www.elawcn.com/agreement/2025/1120/1648.html
- WeChat Official Accounts terms: https://mp.weixin.qq.com/cgi-bin/readtemplate?t=home/agreement_tmpl
- Douban terms: https://www.douban.com/about/agreement
- Reddit Public Content Policy: https://techcrunch.com/2024/05/09/reddit-locks-down-its-public-data-in-new-content-policy-says-use-now-requires-a-contract
- StudentVIP: https://www.studentvip.com.au/unimelb/subjects, terms https://www.studentvip.com.au/terms
- ATAR Notes thread: https://archive.atarnotes.com/forum/index.php?topic=43031.0, policy https://atarnotes.com/user-policy
- UMSU CCH: https://umsu.unimelb.edu.au/support/eduacademic/counter-course-handbook/
- CSSA UniMelb (UMSU club): https://umsu.unimelb.edu.au/buddy-up/clubs/clubs-listing/join/6421
- CISSA: https://cissa.org.au/
- JR Academy terms: https://jiangren.com.au/terms
- AUCL 2025: https://www.news.cn/legal/20250627/4b6ec78bc9be4ea9a2968a9d34abd724/c.html
- 大众点评 v 百度: https://www.thepaper.cn/newsDetail_forward_1474673
- PIPL: https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm
- Copyright Act 1968 s41: https://20.austlii.edu.au/au/legis/cth/consol_act/ca1968133/s41.html
