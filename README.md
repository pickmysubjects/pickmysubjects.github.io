# PickMySubjects

**An unofficial, student-built helper for choosing subjects at the University of Melbourne.**

**Use it:** https://pickmysubjects.github.io/

*Not affiliated with or endorsed by the University of Melbourne. Always confirm with the [Handbook](https://handbook.unimelb.edu.au/) and [My Course Planner](https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner) before you enrol.*

The University's My Course Planner tells you whether a plan is *valid*. PickMySubjects helps you decide *what to take*: what each subject is really like, which subjects suit you, and a whole degree laid out for you to adjust.

## What's covered

18 bachelor's degrees from the 2027 Handbook (Agriculture, Arts, Biomedicine, Commerce, Design, Fine Arts in nine streams, Music, Oral Health, Science and Science Extended), with 126 majors, 43 minors, 31 specialisations and 1,988 subjects. The exact list and counts come from `data/` and are printed in the site's `llms.txt` on every build.

## What you can do

**Look up a subject.** Each subject has a page with:
- when it runs, points and level;
- prerequisites, corequisites, subjects it can't be taken with, and what it leads to (tap "I meet this" for requirements the site can't check);
- assessment: each task's share and when it's due, the final-exam share, hurdles, group work, weekly class hours;
- a short summary of what it teaches, and which majors, minors and specialisations it counts toward;
- for 423 subjects, a summary of public student reviews in all 9 languages, with a link to the source;
- anonymous ratings and tips from students on this site (shown once 3 people have rated it), and a form to rate subjects you've taken;
- quick answers: is it hard, is it right for me, is there an exam, can I take it as breadth, what comes after.

**Find subjects.** Search by code or name, filter by breadth, level, semester, no prerequisites, no final exam or no group work, and sort by exam share, class hours or rating. Quick lists: easy subjects, hard subjects, no final exam, first semester, summer and winter, breadth. The easy and hard lists give each subject's reasons.

**Sort for me.** Orders subjects by how well they fit you: your marks, strengths, interests, goal (protect my WAM, balanced, stretch me) and career goal, plus how hard students found them. Every subject comes with its reasons.

**Compare subjects.** Up to five similar subjects side by side: when they run, exam share, difficulty, prerequisites, hurdles and ratings, and which fits you best and why. Open it from a subject's Similar subjects, from Tools, or by saving subjects.

**Majors, minors and specialisations.** What each one needs, year by year: compulsory subjects, the ones you choose from, and what to take first.

**Careers.** Which majors and subjects lead to a job, including accreditation routes. Set one as your career goal and suggestions and plans lean toward it.

**Plan the whole degree.** Pick a degree and major (plus a second major, minor, specialisation or concurrent diploma where the degree allows) and the site lays out every semester. It checks prerequisites, course rules and how heavy each semester is, explains heavy semesters and suggests swaps. Drag subjects around, add summer or winter terms, and change how a subject counts when your faculty approved an exception. Failed subjects get planned again. Share a plan as a link, save it as an image, print it, or add its key dates to your calendar.

**Plan A, Plan B.** Keep up to five plans, each with its own major, strengths, interests and goal, and compare them side by side. Thinking of switching major or degree? Try the new major on a copy of your plan and see what still counts.

**This semester.** Which teaching week it is, the next key dates, and each of your subjects' assessments in its week, with ticks for what's done. Marks from the final mark calculator show here, you can add the semester to your calendar, and after results it asks you to rate what you just finished.

**Tools.** What you need on the final for each grade, your WAM and a target, a day-by-day revision timetable, resume lines from your subjects, and subject comparison.

**My record.** Finished subjects and marks, your WAM, strengths, interests, goal, career goal and weekly work hours. Back up to a file and restore it elsewhere. Optionally share grade bands anonymously.

**Guide.** Credit points, majors, double majors and minors, discipline and breadth limits, study load, grades, WAM, enrolling, switching major or degree, the first weeks of semester, census dates and dropping, special consideration, failing and repeating, support services, international students, and key dates.

**Also:** add a missing subject by pasting its Handbook page, send feedback, works offline once opened, and can be installed as an app on a phone or computer.

## The problems it solves

These are the problems PickMySubjects exists for, with honest status. The same list is in the app's Feedback page (`src/painPoints.ts`).

| Problem | Status | How |
|---|---|---|
| Which semester does a subject run in? Which are S1 only? | Works | "S1 only" tags; the plan flags subjects placed in the wrong semester |
| What should I take each semester, across the whole degree? | Works | "Build a plan for me" fills every semester while meeting course rules |
| What do I need before taking a subject? | Works | Semester-by-semester prerequisite checks; lines trace what unlocks what |
| If I take this, what can't I take? | Works | Non-allowed pairs are flagged and excluded from suggestions |
| Which subjects are easier marks / good for my WAM? | Partly | "Protect my WAM" goal, review summaries and ratings; ratings are still being collected |
| Which subjects are known to be very hard? | Works | Review summaries, ratings once a subject has 3, heavy-semester warnings |
| What skills does a subject need, and do I have them? | Works | Skill tags on subjects, your strengths shape suggestions and plans |
| Which subjects suit *me*? | Works | Ranked from your results, skills, interests and goals, with every score explained |
| Rules differ by year, degree, major and level | Partly | Rules stored per Handbook year; 18 degrees for 2027 so far |
| Where do subjects lead after uni? | Works | Career pages: majors, subjects and accreditation routes for each job |

## Languages

Nine languages: English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文), Japanese (日本語), Korean (한국어), Vietnamese (Tiếng Việt), Indonesian (Bahasa Indonesia), Malay (Bahasa Melayu) and Hindi (हिन्दी). Students switch languages in the header. Non-English text is machine-assisted; fixes are very welcome (`src/i18n/messages/`). Subject and course names stay as the University publishes them.

## Principles

- **Facts only, from the official Handbook.** Each subject records facts such as when it runs, prerequisites and assessment weights, written in our own words and checked by people. No Handbook text is reproduced, and nothing is scraped. See [docs/research.md](docs/research.md).
- **Honest about what it doesn't know.** Every check is *met*, *not met* or *can't tell yet*. Missing data never counts as a pass.
- **Private by default.** Your results and plans stay in your browser. There is no account and no server.
- **Links, not copies.** Discussion on Reddit, StudentVIP, Xiaohongshu and elsewhere is linked, never copied. Where a subject has enough public reviews, a short summary in our own words sits next to the link. See [docs/discussion-sources.md](docs/discussion-sources.md).

## Feedback

**Don't write code?** Open the app's **Feedback** page. Pick the problem, rate how well it's handled, and write your idea. Send it as a GitHub issue, or copy it and send it however you like.

**Do write code?** See [CONTRIBUTING.md](CONTRIBUTING.md). Issues use templates: *data is wrong*, *idea*, *bug*.

## Privacy

No account, no ads, no cookies. Page visits and a few anonymous actions (plan made, language switched) are counted with [GoatCounter](https://www.goatcounter.com), which keeps no IP addresses and nothing about you. Your record and plans stay in your browser. Ratings and feedback go anonymously to a private Google Form and Sheet; only aggregates are published, and only once a subject has at least 3 ratings. The full statement is on the app's *Privacy* page.

## Run it locally

```bash
npm install
npm run dev        # validates data, then starts the app at http://localhost:5180
npm test           # engine tests
npm run typecheck
npm run build      # app + one static page per subject and language, sitemap, robots.txt, llms.txt
npm run indexnow   # tell Bing/IndexNow about every URL in the live sitemap (sends to an outside service;
                   # the deploy workflow already does this once a day; --dry-run to only count)
```

There are two datasets:
- **Demo**: a fictional "Example University" that shows every feature.
- **UniMelb**: the real data, 18 degrees and 1,988 subjects from the 2027 Handbook.

## How it's built

- `data/`: curated YAML, validated by `npm run data` (the build fails on bad data).
- `src/engine/`: pure TypeScript. Requirement logic, plan checks, course rules, the plan generator, the recommender, and the Handbook-paste parser. Fully unit tested.
- `src/`: a Vue 3 app. Static hosting is enough.

Design notes: [docs/design.md](docs/design.md). How other universities' student tools do it: [docs/competitive-analysis.md](docs/competitive-analysis.md).

## Licence

- Code: [AGPL-3.0](LICENSE), © 2026 PickMySubjects contributors. If you run a modified version as a website or app, you must publish its source under the same licence. Versions published before 2026-10-13 were MIT, and that licence still applies to those copies.
- Curated data and aggregated ratings: [CC BY-NC-SA 4.0](data/LICENSE.md) (non-commercial; ask for commercial use).

University of Melbourne Handbook text is the University's copyright and is not reproduced here.
