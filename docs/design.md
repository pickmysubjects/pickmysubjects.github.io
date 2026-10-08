# Design

## Positioning

The University already runs **My Course Planner**, verified on its [students site](https://students.unimelb.edu.au/course-admin/planning-your-course-and-subjects/faculty-course-planning-resources/my-course-planner) on 2026-10-07. It lets students:

- view the majors and subjects available in their course
- test "what if I pick this major or subject"
- add completed subjects
- build a printable, shareable visual plan

Its own FAQ admits some pain points:

- "The information in My Course Planner is different to the Handbook"
- "doesn't meet the requirements of my major when I have all the required subjects"
- "How do I know … if it will be offered in a future year?"

So PickMySubjects does **not** compete on "is my plan valid?". It answers what the official tool can't:

1. **Which subjects suit *me*?** A ranking based on the student's own results, skills, interests and goal (WAM vs challenge), with every number explained.
2. **What is a subject actually like?** Crowd-sourced difficulty, workload and grading, and the skills it uses.
3. **Build me a good plan.** Automatic generation and comparison of whole plans. The official tool only lets you try one change at a time.
4. **Explain the rules in plain language**, with Chinese as well as English for international students.

The rule engine still exists, because recommendations and generated plans must be valid. But we treat it as plumbing, not as the product. The intended flow is: decide in PickMySubjects, then confirm in My Course Planner and enrol.

**Out of scope: weekly timetabling and clash detection.** There are two reasons:

1. Class times sit behind a login. The Handbook's "Timetable" tab links to TimeEdit and is marked "login required", so a public tool has no legitimate source.
2. UniMelb allocates class times from student preferences. A hand-built clash-free timetable isn't what students end up with anyway.

Revisit this only if the University offers a data source.

This document also follows from [research.md](research.md). The constraints it leads to:

- **No scraping.** Data is curated by hand.
- **Facts only.** No Handbook prose.
- **Local-first.** A student's results never leave their browser.

## Architecture

```
data/                       curated facts (YAML), reviewed by humans
  real/                     real UniMelb facts — small, grows over time
    subjects/<CODE>.yaml
    courses/<COURSE>/<YEAR>.yaml
    components/<COURSE>/<YEAR>/<id>.yaml   majors, specialisations
  demo/                     fictional "Example University" data for demos and tests
scripts/
  build-data.ts             validate YAML -> src/generated/<dataset>.json
  paste-handbook.ts         CLI: pasted Handbook text -> YAML snippet
src/
  engine/                   pure TypeScript, no Vue, fully unit-tested
  composables/, components/, views/   the Vue 3 app (local-first)
tests/                      Vitest
```

### Engine modules

| Module | Responsibility |
|---|---|
| `schema.ts` | zod schemas for every data file; the single source of truth for data shape |
| `expr.ts` | Evaluate and describe requirement expressions: prerequisites and corequisites |
| `handbookPaste.ts` | Parse text a student copies from a Handbook page into a requirement expression, availability, and non-allowed subjects |
| `availability.ts` | Is subject X offered in period P of year Y? Falls back to the latest known year, flagged as an *assumption* |
| `planCheck.ts` | Check each term of a plan: offered, prerequisites met by *earlier* terms, corequisites, non-allowed clashes, load |
| `courseRules.ts` | Check course-level rules: total points, level caps, science/breadth minimums, major/specialisation, level-1 areas, progression |
| `generate.ts` | Build a full plan from course + major + start term + completed subjects + preferences |
| `recommend.ts` | Score eligible subjects for one student, with plain-language reasons and warnings |

### Requirement expressions

Prerequisites are a small expression language. In YAML a bare subject code is shorthand for `{ subject: CODE }`.

```yaml
prerequisites:
  any:
    - all: [COMP10002, COMP20008]
    - admission: MC-SOFTENG
```

The node types:

- `subject`
- `all`
- `any`
- `points`: a minimum number of points, optionally at a level or in an area
- `admission`: admission into a course
- `manual`: free text the engine can't evaluate, so it shows "check manually"

`unknown` means *not curated yet*, which is different from `none`. The UI must never treat missing data as "no prerequisites".

### Honesty rules for the engine

1. A result is one of `ok`, `fail` or `unknown`. Uncurated data yields `unknown`, never `ok`.
2. Availability carried forward from an older year is reported as an assumption.
3. A recommendation shows a number only together with the reasons behind it. Crowd signals with fewer than 3 reviews are labelled "few reviews" and weighted toward neutral.

## UI — component map

| Component | Responsibility | Contract |
|---|---|---|
| `App.vue` | Shell: header, unofficial notice, view switcher | composition only |
| `views/PlannerView.vue` | Composes planner setup, grid and issues | composition only |
| `components/planner/PlanSetup.vue` | Course, start term, major, specialisation | v-model on setup object |
| `components/planner/PlanGrid.vue` | Terms as columns | props: terms, subjects; emits: remove, add, move |
| `components/planner/TermColumn.vue` | One term with its subjects and a points total | props: term, issues; emits as above |
| `components/planner/SubjectPicker.vue` | Search box for adding a subject to a term | emits: pick(code) |
| `components/planner/PlanIssues.vue` | List of validation issues | props: issues |
| `views/RecommendView.vue` | Recommendation list for the profile | composition only |
| `components/recommend/RecommendationCard.vue` | One subject: score, reasons, warnings, outbound links | props: rec |
| `views/ProfileView.vue` | Composes the profile editors | composition only |
| `components/profile/CompletedSubjects.vue` | Completed subjects and marks; shows WAM | v-model |
| `components/profile/SkillsEditor.vue` | Skill self-ratings, interests, goal | v-model |
| `views/ContributeView.vue` | Paste-from-Handbook helper: parsed result plus YAML to copy | composition only |
| `composables/useDataset.ts` | Load the real or demo dataset | readonly data |
| `composables/useProfile.ts` | Profile state persisted to localStorage | readonly state + actions |
| `composables/usePlan.ts` | Plan state, check results, generate | readonly state + actions |

## Scope of v0.1

- One course: Bachelor of Science (2026 rules).
- The real dataset starts with only the subjects verified during research. The demo dataset shows the full experience.
- No accounts and no backend. Static hosting is enough.
