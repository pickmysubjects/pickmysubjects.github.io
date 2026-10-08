# PickMySubjects

**An unofficial, student-built helper for choosing subjects at the University of Melbourne.**

**Use it:** https://pickmysubjects.github.io/

*Not affiliated with or endorsed by the University of Melbourne. Always confirm with the [Handbook](https://handbook.unimelb.edu.au/) and [My Course Planner](https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner) before you enrol.*

The University's My Course Planner tells you whether a plan is *valid*. PickMySubjects helps you decide *what to take*. It explains what each subject is really like, which subjects suit you, and lays out a whole degree for you to adjust.

## The problems it solves

Choosing subjects is painful, and the rules change every year. These are the problems PickMySubjects exists for, with honest status. The same list is in the app's Feedback page (`src/painPoints.ts`).

| Problem | Status | How |
|---|---|---|
| Which semester does a subject run in? Which are S1 only? | Works | "S1 only" tags; the plan flags subjects placed in the wrong semester |
| What should I take each semester, across the whole degree? | Works | "Build a plan for me" fills every semester while meeting course rules |
| What do I need before taking a subject? | Works | Semester-by-semester prerequisite checks; magenta lines trace what unlocks what |
| If I take this, what can't I take? | Works | Non-allowed pairs are flagged and excluded from suggestions |
| Which subjects are easier marks / good for my WAM? | Partly | "Protect my WAM" goal. Needs students' ratings, which are being collected |
| Which subjects are known to be very hard? | Partly | Warnings from student ratings (still being collected) |
| What skills does a subject need, and do I have them? | Partly | Skill self-rating plus warnings; skill tags for real subjects are being added |
| Which subjects suit *me*? | Works | Ranked from your results, skills and interests, with every score explained |
| Rules differ by year, degree, major and level | Partly | Rules stored per Handbook year; only Bachelor of Science 2026 so far |
| Where do subjects lead after uni? | Not yet | Career pathways are planned |

## Languages

English, 简体中文, 繁體中文, 日本語, 한국어, Tiếng Việt, Bahasa Indonesia, Bahasa Melayu and हिन्दी. Students switch languages in the header. Non-English text is machine-assisted; fixes are very welcome (`src/i18n/messages/`). Subject and course names stay as the University publishes them.

## Principles

- **Facts only, from the official Handbook.** Each subject records facts such as when it runs, prerequisites and assessment weights, written in our own words and checked by people. No Handbook text is reproduced, and nothing is scraped. See [docs/research.md](docs/research.md).
- **Honest about what it doesn't know.** Every check is *met*, *not met* or *can't tell yet*. Missing data never counts as a pass.
- **Private by default.** Your results and plans stay in your browser. There is no account and no server.
- **Links, not copies.** Discussion on Reddit, StudentVIP, 小红书 and elsewhere is linked, never copied or summarised by AI. See [docs/discussion-sources.md](docs/discussion-sources.md).

## Feedback

**Don't write code?** Open the app's **Feedback** page. Pick the problem, rate how well it's handled, and write your idea. Send it as a GitHub issue, or copy it and send it however you like.

**Do write code?** See [CONTRIBUTING.md](CONTRIBUTING.md). Issues use templates: *data is wrong*, *idea*, *bug*.

## Privacy

No account, no analytics, no ads. Your record and plans stay in your browser. Ratings and feedback go anonymously to a private Google Form and Sheet; only aggregates are published, and only once a subject has at least 3 ratings. The full statement is on the app's *Privacy* page.

## Run it locally

```bash
npm install
npm run dev        # validates data, then starts the app at http://localhost:5180
npm test           # engine tests
npm run typecheck
```

There are two datasets:
- **Demo**: a fictional "Example University" that shows every feature.
- **UniMelb**: real, but small, and growing as students add subjects.

## How it's built

- `data/`: curated YAML, validated by `npm run data` (the build fails on bad data).
- `src/engine/`: pure TypeScript. Requirement logic, plan checks, course rules, the plan generator, the recommender, and the Handbook-paste parser. Fully unit tested.
- `src/`: a Vue 3 app. Static hosting is enough.

Design notes: [docs/design.md](docs/design.md). How other universities' student tools do it: [docs/competitive-analysis.md](docs/competitive-analysis.md).

## Licence

- Code: [MIT](LICENSE).
- Curated data and aggregated ratings: [CC BY 4.0](data/LICENSE.md).

University of Melbourne Handbook text is the University's copyright and is not reproduced here.
