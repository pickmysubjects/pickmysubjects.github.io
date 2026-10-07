# Competitive analysis: student-built planners and review sites

Researched 2026-10-07 by reading public repos, issue trackers and docs. Star and contributor counts are as of that date. Anything marked **[unverified]** could not be confirmed.

## At a glance

| Tool | University | Data source | Condition parsing | Degree rules | Reviews | Status |
|---|---|---|---|---|---|---|
| **Circles** (devsoc-unsw/circles) | UNSW | Scrapes an undocumented handbook API once a year; JSON committed to the repo | Regex in 5 phases → tokeniser → typed `Condition` objects; **515/3,333 (~15%) fail to parse**, fixed by hand in ~30 Python files | `programsProcessed.json`: majors/minors, optional flags, `processing_warnings` | — | Active. 71★, 50 contributors, leadership changes every year, many issues from 2022–23 unanswered |
| **NUSMods** (nusmodifications/nusmods) | NUS | Internal NUS APIs; **officially partnered since 2019**; cron runs on NUS servers | NUS publishes machine rule strings, parsed with ANTLR4 into `{and/or}` trees | **None.** A degree planner has been requested since 2016 (#359) | Disqus threads (ads/privacy complaint #805 open since 2018) | Active. 691★, 158 contributors, "30,000+ students a semester". No database, static JSON, ~US$900 in lifetime donations |
| **PennPlanner** (qu8n/pennplanner) | UPenn online MCIT | **Hand-curated** `coursesData.ts` (~25 courses): verbatim prerequisite text *and* structured ids | — | Per-program boolean flags | Imported from MCIT Central | **Archived 2024** when Penn launched the official DegreeWorks |
| **Penn Labs penn-courses** | UPenn | Registrar import; reviews from the **official** evaluation dumps | — | Recursive `Rule{num, credits, q, children}` + `DoubleCountRestriction` | Official evaluations | Active |
| **AlbertPlus** (TechAtNYU/AlbertPlus) | NYU | Cloudflare Worker scraper of public pages | Naive (any " or " makes everything OR) | Planned, never built | — | Quiet since Dec 2025 |
| **UW Flow** (UWFlow/uwflow) | Waterloo | Official Open Data API | Codes only, no AND/OR | — | **Strong integrity:** one review per user per course, DB trigger requires the course on the user's imported transcript | Active since 2012 |
| **CourseTable** (coursetable/coursetable) | Yale | Crawler | — | — | Official evaluations, gated behind university login (CAS) or a "challenge" | **Blocked by Yale in 2014** (copyrighted data, averages without comments), later restored; handed to the Yale Computer Society in 2019 |
| **MonMap** (monashcoding/monmap) | Monash | Local copy of the handbook, shipped as a release tarball | — | Yes | Multi-axis, HMAC author tags, an automatic classifier with shadow-hiding, rate limits | Built in 2026 because **Monash shut down its official MonPlan** |
| **Unilectives** (devsoc-unsw/unilectives) | UNSW | — | — | — | Login-tied; term taken, optional self-reported grade, report workflow | Active |
| **My Course Planner** (official) | **UniMelb** | Handbook | Official | Official | — | The University's own; see [design.md](design.md#positioning) |

At UniMelb there is no significant open-source planner, only stale one-offs from 2013 and 2016. No student-built planners turned up at UQ, ANU or USyd either.

## What we copy

1. **Structured requirement trees with an explicit manual-check leaf.** Done: `manual` nodes in `ReqExpr`. We store a Handbook *link*, not the verbatim text, because the prose is copyrighted.
2. **Typed evaluators that return a verdict plus reasons. Missing student data gives "unknown", not "blocked".** Done (`expr.ts`, three-valued).
3. **A corpus check that fails the build.** Done: `npm run data` runs schema validation, checks file name against code, rejects duplicates, and lists uncurated references. Still to add: symmetry checks for non-allowed pairs, and a published coverage percentage.
4. **Data keyed by Handbook year,** plus a yearly `MAINTENANCE.md` checklist (NUSMods, CourseTable). Data is keyed by year already; the checklist is still to do.
5. **Static, no backend for the planner** (NUSMods). Done. Only crowd reviews will need a server.
6. **A richer degree-rule model when needed:** Penn's recursive `Rule` plus double-count limits. We'll adopt it when the first real major needs it.
7. **Planner UX:**
   - drag-and-drop terms;
   - "no info" as a conflict type (done as `unknown`);
   - custom placeholder subjects;
   - **retaking a failed subject** (MonMap's #1 bug — done in the engine);
   - changing degree without resetting the plan.
8. **Portability without accounts:** JSON import/export with a round-trip test (Circles #969 broke here), CSV export, and a share link that encodes the plan in the URL hash.
9. **Transcript import parsed locally in the browser** with pdf.js (AlbertPlus). Codes and marks never leave the device.
10. **Review integrity:**
    - one review per subject per person (UW Flow);
    - HMAC author tags (MonMap);
    - classifier plus shadow-hide plus rate limits (MonMap);
    - report workflow (Unilectives);
    - guidelines and an "unverified claims" disclaimer (NUSMods).
11. **Easy contributor onboarding:** data that needs no credentials, plus ARCHITECTURE and MAINTENANCE docs.

## Where we differentiate

1. **Personalised, explained recommendations.** None of the tools above do this. NUSMods' RAG request (#4483) is open.
2. **Honest "unknown" as a first-class state, with verification dates.** Circles fails to parse ~15% of conditions, and AlbertPlus guesses.
3. **Curated facts with provenance** instead of silent scraper errors (Circles' `<br/>` leaks, NUSMods' "Error" strings).
4. **Goal-first planning.** Reverse planning ("shortest path to major M"), whole-plan generation and what-ifs. NUSMods has wanted a degree planner since 2016, and the official tool validates rather than advises.
5. **Crowd signals with context:** distributions, review counts, minimum-n thresholds, optional grade bands. Yale's 2014 objection was to *bare averages*.
6. **A bilingual interface (English/中文).** None of the tools surveyed offer this.
7. **Private by default,** with no account needed.
8. **Complementing the official planner, not replacing it.** PennPlanner died when the official tool arrived.
9. **Reviews about the subject, not the staff.** This lowers defamation and harassment risk.

## Risks and lessons

- **Student turnover is the biggest risk.** Mitigations: a small surface, YAML any student can edit, a written yearly checklist, and a named successor plan.
- **The University can make us redundant, or leave a gap.** PennPlanner was archived and MonMap was born. So don't stake the project on rule-checking authority.
- **University relations.**
  - Yale blocked CourseTable.
  - NUSMods went official but had its API keys restricted.
  - Response: stay facts-only, use no branding, keep "unofficial" prominent, and consider talking to UMSU early.
- **Stale data.** Plan for ~15% of rules needing manual handling. Gate releases on validation, show "last verified" dates, and put a "report a problem" link on every subject.
- **Moderating reviews.**
  - Don't use third-party comment widgets.
  - Use rate limits, shadow-hiding and a minimum n before showing aggregates.
  - Provide a takedown contact.
  - Defamation exposure when staff are named is real **[not legally researched]**.
- **Coverage expectations.** "My degree is missing" dominates Circles' tracker. Publish an explicit coverage list.
- **Cost.** Stay static (NUSMods runs on ~US$900 lifetime). Avoid a heavy server stack that a successor can't run.

## Sources

- https://github.com/devsoc-unsw/circles — README, TEAM.md, data processors, `errors.json`, issues
- https://github.com/nusmodifications/nusmods — README, ARCHITECTURE.md, MAINTENANCE.md, ANTLR grammar, issues #359 #805 #4241 #4314 #4469 #4483; https://blog.nusmods.com/ ("NUSMods is Official!", 2019); https://opencollective.com/nusmods
- https://github.com/qu8n/pennplanner; https://github.com/pennlabs/penn-courses; https://thedp.com/article/2025/02/path-at-penn-releases-new-application
- https://github.com/TechAtNYU/AlbertPlus
- https://github.com/UWFlow/uwflow; https://github.com/UWFlow/rmc
- https://github.com/coursetable/coursetable; https://yaledailynews.com/blog/2014/01/15/xu-uncensor-coursetable/; https://yalealumnimagazine.org/blog_posts/1683-that-bluebook-controversy-explained-and-linked
- https://github.com/monashcoding/monmap — README, docs/reviews.md, docs/data-gaps-audit-2026-08.md, docs/feedback-triage-2026-05.md
- https://github.com/devsoc-unsw/unilectives
