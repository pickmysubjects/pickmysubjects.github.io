# Working on PickMySubjects

Notes for AI coding agents (and anyone else) working in this repo. CONTRIBUTING.md covers the data rules; this file covers how changes get made and shipped.

## Rules for every change

- **9 languages, always.** Every student-facing string goes into all of `src/i18n/messages/{en,zh-CN,zh-TW,ja,ko,vi,ms,id,hi}.ts`. zh-TW is Traditional Chinese in Taiwan usage, never Simplified copied over. Write the way students talk, with the words they search (水课, 楽単, 꿀강, môn dễ…), never keyword stuffing.
- **No subject-specific fixes.** Fix the general rule. Code never special-cases a subject code; tests check this for the career tiering.
- **Data stays honest.** If a correct tag or fact makes the eval worse, keep the data and fix the algorithm or the eval. Never keep data wrong to protect a number.
- **Short hints.** At most one short visible line per hint (about 20 Chinese characters / 12 English words). Longer text and privacy details go behind `InfoTip` (ⓘ). Don't add hints that repeat what the page already shows.
- **Keep the current look.** No visual redesign unless asked; reuse the existing tokens and components.
- **Every student input is optional.** Nothing a student fills in may be required.
- **Guide too.** New rules or features students should know about also get a line in the 墨大入门 guide (`src/components/guide/`, 9 languages).
- **Plans own their profile.** Plan A/B each keep their own skills, interests, goal and career; only the record (subjects and marks) is shared.
- **Privacy.** Nothing about a student leaves the browser except what they explicitly send (ratings, grade bands). No analytics.
- Comments in English.

## Checks

- While working: only the test files related to the change (`npx vitest related <changed files> --run`, or named files) and `npm run typecheck`. Don't run `npm test`, `npm run test:fast` or `npm run build` while working — the full suite and the build (~19,500 prerendered pages) run once, in the release check, for the whole batch. Tests use 3 workers locally (`TEST_WORKERS=<n>` to change) so the laptop stays cool; CI uses all cores.
- This runs on a 16 GB laptop that also hosts other AI tools and Docker: at most one background agent running tests or builds at a time.
- Before merging or pushing, once, and read the results before the next step:
  1. `npm run typecheck`
  2. `npm test` (if a planner test times out under load, rerun that file alone)
  3. `npx tsx scripts/eval-transcripts.ts` — recall@10 0.75 / 0.75 and mark MAE 6.80 are the current baseline. A drop needs explaining; it is one student, so it is a direction, not a measure.
  4. `npm run build`
- Look at UI changes in a browser (headless Chromium is fine) at 1440 and 390 wide, in en, zh-CN and one more language: no console errors, no horizontal overflow.

## Git

- Commit email must be the GitHub noreply address; `.githooks/pre-push` blocks anything else (`git config core.hooksPath .githooks`).
- No `Co-Authored-By` or other AI attribution lines in commits.
- Work on a branch (`feat/…`, `fix/…`), in `.worktrees/<name>` when another session may be using the main checkout.
- Push only when the maintainer says so; every push runs CI and deploys. Never chain the checks and `git push` in one command.
- After merging and pushing, delete the branch and its worktree.

## Where things are

- Data: `data/real/` (subjects, courses, majors, careers), validated by zod in `src/engine/schema.ts` and `src/engine/careers.ts`.
- Engine: `src/engine/` — `recommend.ts` (suggestions), `subjectFit.ts` (fit card), `easeRanking.ts` (easy/hard lists), `predict.ts` + `grades.ts` + `gradeModel.ts` (mark prediction, shared grade bands), `generate.ts` (plan builder), `relieve.ts` + `termStress.ts` (heavy semesters), `careerPaths.ts` + `careerGoal.ts` (careers).
- Search pages: titles and descriptions in `src/utils/seo.ts`, static HTML from `scripts/prerender.ts`, IndexNow in `scripts/indexnow.ts` (runs after each deploy).
