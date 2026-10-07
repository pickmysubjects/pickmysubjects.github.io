# Research: a subject planner and recommender for University of Melbourne students

Researched 2026-10-07. This is general information gathered for planning. It is **not legal advice**. Get advice from a lawyer before charging money for anything built on this.

## 1. The problem

Choosing subjects at UniMelb means working through several overlapping constraints at once, and the rules change every year:

- course rules: total points, level limits, breadth, majors, specialisations
- prerequisites, corequisites and non-allowed subjects
- which teaching period each subject runs in, which can differ from year to year
- what each subject is actually like: difficulty, workload, how it is graded, which skills it needs
- the student's own record and goals: WAM, strengths, career direction

The official tools cover only part of this. The **Handbook** documents the rules one page at a time. **My Course Planner** validates a plan against course rules. Neither tells you which subjects suit *you*, or what a subject is like to take.

## 2. Data sources assessed

### 2.1 Handbook — `handbook.unimelb.edu.au`

**Structure** (observed 2026-10-07):

- URL patterns:
  - `/{year}/subjects/{code}`, with tabs `/eligibility-and-requirements`, `/assessment`, `/dates-times`, `/further-information`
  - `/{year}/courses/{code}/course-structure`
  - `/{year}/courses/{code}/majors-minors-specialisations`
  - `/{year}/components/{id}/print`, where `/print` shows every tab on one page
- Year switcher covers 2017 to 2026, plus archived Handbooks.
- **Subject header:** level, points, campus. Example: `COMP30027 Machine Learning`, Undergraduate level 3, 12.5 points, On Campus (Parkville).
- **Overview:** availability, for example "Semester 1 - On Campus".
- **Eligibility tab:**
  - Prerequisites are shown as a labelled table ("All of" / "One of") of code, name, teaching period and points.
  - **Free-text alternatives** are joined with **OR**. Example for COMP30027: all of COMP10002 and COMP20008, **OR** "Admission into the MC-SOFTENG Master of Software Engineering".
  - Corequisites.
  - **Non-allowed subjects** (table). COMP30027 lists COMP90049 and ACTL30008.
  - Recommended background knowledge (free text).
- **Dates-times tab:** one block per teaching period, with coordinator, delivery mode, contact hours, total time commitment (170 h for COMP30027), teaching period dates, self-enrol, census and withdraw dates.
- **Course structure, Bachelor of Science (2026):**
  - 300 points in total.
  - SCIE10005 is compulsory and must be taken in the first semester.
  - 225 points of science subjects, with at least 62.5 / 62.5 / 75 points at levels 1 / 2 / 3.
  - 50 points of breadth, with at most 25 points of level-1 breadth.
  - At most 125 points at level 1.
  - Exactly one major (50 points at level 3), and at most one specialisation (25 points at level 2 + 25 at level 3).
  - At least two distinct level-1 areas of study, with at most 37.5 points from any one of them.
  - Progression: normally 50 points at level 1 before moving to level 2, and the same again for level 2.
  - 44 majors are listed, some discontinued with an end year.
  - Specialisations: Artificial Intelligence and Advanced Computing. For ACS accreditation, one of them is needed alongside the Computing and Software Systems major.

**Access:**

- The Handbook sits behind **Imperva/Incapsula bot protection**.
- A plain `curl` request got a bot-check interstitial on its first attempt.
- A fetch tool got about 5 pages before it was challenged ("Pardon Our Interruption").
- A normal browser works.

### 2.2 My Course Planner — `course-planner.unimelb.edu.au`

- The University's own React single-page app. Its API sits behind login (for example `/apis/v1/login`, `/v1/enrollment`).
- Its `robots.txt` allows all, but the website terms forbid reverse-engineering the University's services (see §4.1). **Do not build on its internal API.**

### 2.3 UMSU Counter Course Handbook

- A student-run review site hosted by the student union: ratings and comments per subject.
- **Sparse.** Example: INFO30009 had 4 voters, submitted about 4 years ago.
- The reviews are other people's content. **Link to it; do not copy it.**

### 2.4 Subject Experience Survey (SES)

- Results are released to students **through the LMS (login required)**.
- They are not public, so they can't be used as a data source.

### 2.5 Reddit (r/unimelb)

- A rich source of informal opinion: which subjects are "easy H1", which are notoriously hard, and so on.
- **Reddit Data API terms:**
  - The free OAuth tier is for **non-commercial** use, roughly 100 queries per minute.
  - Commercial use needs a contract with Reddit, reportedly $0.24 per 1,000 calls.
  - **Training ML/AI models on Reddit content needs express permission.**
  - Posts belong to the users who wrote them.
- **Implication:** while the project is free and non-commercial, deep links to Reddit searches (for example "COMP30027 site:reddit.com/r/unimelb") are safe. Bulk-ingesting posts, or summarising them with an LLM inside a paid product, is not, unless Reddit agrees to it.

### 2.6 Grade distributions

- Not published by the University. There is no legitimate source.
- A "WAM-friendly subject" signal therefore has to come from **students' own anonymous reports**.

## 3. Prior art

| Project | University | Notes |
|---|---|---|
| [Circles](https://github.com/csesoc/circles) | UNSW | Open-source degree planner from a student society (DevSoc). **Scrapes** the UNSW Handbook. Parses English enrolment conditions with regex and applies manual fixes per program. Widely used. |
| [NUSMods](https://github.com/chuabingquan/nusmods) | NUS | Open-source module search and timetable tool, student-run, not funded by NUS. Funded by donations and sponsor tiers on Open Collective (≈US$900 raised in total, which is tiny). |
| [PennPlanner](https://github.com/qu8n/pennplanner) | UPenn | Drag-and-drop planner with prerequisite warnings. |
| AlbertPlus | NYU | Web app, browser extension, scraper and docs. |
| ShixuanJiang/Unimelb-Handbook, jonoharms/PrereqParser | UniMelb | Tiny or abandoned (0★; PrereqParser is from 2013). |
| UniMelb WAM Checker (Chrome extension), GPA @ UniMelb (JR Academy), GradeStack (app) | UniMelb / generic | WAM/GPA calculators only. GPA @ UniMelb is run by a commercial education company, so the space has commercial players using tools as lead-gen. |

**Gap:** there is **no UniMelb tool that combines** rule-checked planning, semester availability, crowd-sourced difficulty/WAM signals and personalised recommendations.

## 4. Legal and terms analysis (general information, not advice)

### 4.1 UniMelb website terms

These are the [University website terms of use](https://www.unimelb.edu.au/legal/website-terms), read 2026-10-07. They apply to the Handbook and the Course Planner, since both are University websites. The key clauses, verbatim:

> "You may only use content on a University website for non-commercial purposes."

> You must not … "use automated means to retrieve information from a University website without our permission, for example, 'scraping';"

> You must not … "decompile, disassemble, or reverse-engineer the software or services relating to a University website;"

> You must not … "exercise the copyright in the whole or any part of a University website except as permitted by statute or with the University's prior consent;"

The terms are governed by Victorian law. Copyright queries go to `copyright-office@unimelb.edu.au`.

**Consequences:**

1. **No scraping without permission.** This is true even for a free, non-commercial project. Circles-style scraping is exactly what these terms prohibit.
2. **Commercial use of Handbook content is prohibited** without the University's consent.
3. **Do not bypass the bot protection.** Getting around an access control, rather than merely breaching the terms, raises the stakes. It can engage computer-offence provisions such as Part 10.7 of the Criminal Code Act 1995 (Cth) on restricted data. Never do it.

### 4.2 Copyright in the data itself

- Under Australian law, **facts are not protected**: that COMP30027 is 12.5 points, runs in Semester 1, and needs COMP10002 and COMP20008. Copyright protects the original *expression*.
  - See *IceTV v Nine Network* [2009] HCA 14.
  - See *Telstra v Phone Directories* [2010] FCAFC 149: compilations without sufficient human authorship are not protected.
- Prose such as subject overviews, learning outcomes and assessment descriptions **is** protected.
- **Design rule:**
  - Store only facts, in our own structure and our own words.
  - Never copy descriptive text. Link to the Handbook page instead.
  - Facts that a human gathers and re-expresses are much lower risk than a scraped mirror.
  - The website-terms contract still governs *how* the facts are retrieved, which is why the retrieval in §5 is manual.

### 4.3 The University's name and logo

- The logo and crest need a licence from the Brand team. Students generally may not use them.
- **Never use the logo, crest or "Traditional Heritage Blue" branding.**
- Using the *name* to describe what the tool is for ("a planner for University of Melbourne students") is ordinary descriptive use.
- **Do not imply endorsement:**
  - Use a prominent "Unofficial — not affiliated with or endorsed by the University of Melbourne" notice.
  - Avoid "UniMelb" or "Melbourne Uni" as the product name.
  - Implying affiliation risks misleading conduct under s18 of the Australian Consumer Law.

### 4.4 Students' personal data

- WAM and results are sensitive, and they are the core of the "recommend for me" feature.
- **Local-first design:**
  - Results stay in the user's browser.
  - No account is needed for the core features.
  - Nothing is uploaded unless the user explicitly shares something, such as an anonymous subject review.
- This keeps exposure under the Privacy Act 1988 (Cth) minimal and is a trust advantage.
- If accounts and paid tiers come later, the project will need a privacy policy at minimum.

### 4.5 Making money

| Model | Allowed? |
|---|---|
| Free and open-source, with donations or sponsorship (the NUSMods model) | Lowest risk. Still needs the data-retrieval rules above to be followed. |
| Paid product or ads built on Handbook-derived data | **Only with the University's written permission.** The website terms restrict content use to non-commercial purposes. Reddit-derived features would also need a Reddit commercial agreement. |
| Paid features built on **our own** data (crowd-sourced reviews, the recommender, the plan UX), with Handbook facts only as links | Plausible, but get a lawyer to review it first. |

- **Recommended path:** launch free and non-commercial, build users, then approach the University for a data permission or partnership. A tool students already love is the strongest argument. UMSU or a student society may be a natural partner.
- **Employment:** check the IP clause in your employment contract before a side project earns money.

## 5. Recommended data strategy

1. **Ask for permission early.** Email the Copyright Office or the Handbook/Student Systems team. Describe the project and ask for either a data feed or permission for low-rate automated retrieval. Many universities support student-built tools when asked.
2. **Until then, use a community-curated dataset in the repo:**
   - YAML files of facts only: code, title, level, points, offerings per year, a prerequisite *expression*, non-allowed subjects, breadth eligibility, Handbook URL.
   - Course rules (B-SCI etc.) encoded as data.
   - Every record carries `source_year` and `verified_on`.
   - Contributors check each record by hand against the Handbook in a normal browser.
3. **"Paste from Handbook" helper:**
   - The student copies the eligibility text from the Handbook page they are already reading.
   - The app parses it locally into a prerequisite expression.
   - This is the student's personal use, not automated retrieval by us, and it speeds up both curation and planning.
4. **Our own crowd-sourced subject signals:**
   - Anonymous ratings: difficulty, workload, grading generosity, whether the student would recommend it, skills used, semester taken.
   - This is the long-term, defensible core: no permission is needed, and it is the data nobody else has.
5. **Outbound links only** for the Handbook, the Counter Course Handbook and Reddit searches.

## 6. Initial scope

- **One course:** Bachelor of Science (2026 rules).
- **Majors:** Computing and Software Systems, Data Science, Mathematics and Statistics. Plus the AI and Advanced Computing specialisations.
- **About 60–80 subjects**, enough to plan those majors end-to-end.
- **Engine:**
  - Prerequisite-expression evaluator.
  - Course-rule checker.
  - Semester-availability-aware plan generator (constraint search).
  - Explainable scoring for recommendations.
- **UI:** a local-first web app with a drag-and-drop semester grid.

## Sources

- [University website terms of use](https://www.unimelb.edu.au/legal/website-terms) (read 2026-10-07)
- [Handbook – COMP30027](https://handbook.unimelb.edu.au/2026/subjects/comp30027), [eligibility](https://handbook.unimelb.edu.au/2026/subjects/comp30027/eligibility-and-requirements), [dates-times](https://handbook.unimelb.edu.au/2026/subjects/comp30027/dates-times)
- [Handbook – B-SCI course structure](https://handbook.unimelb.edu.au/2026/courses/b-sci/course-structure), [majors, minors and specialisations](https://handbook.unimelb.edu.au/2026/courses/b-sci/majors-minors-specialisations)
- [My Course Planner](https://course-planner.unimelb.edu.au/)
- [UMSU Counter Course Handbook](https://umsu.unimelb.edu.au/support/eduacademic/counter-course-handbook/)
- [UniMelb Branding Policy MPF1193](https://policy.unimelb.edu.au/MPF1193), [Brand hub – advice for students](https://brandhub.unimelb.edu.au/resources/advice-for-students)
- [UMSU on SES results released via LMS](https://umsu.unimelb.edu.au/news/article/7797/2013-06-30-ses-how-was-it-for-you)
- Reddit API: [The Decoder](https://the-decoder.com/reddit-ends-its-role-as-a-free-ai-training-data-goldmine/), [The Register](https://www.theregister.com/2023/04/18/reddit_charging_ai_api/), [Search Engine Journal](https://searchenginejournal.com/reddit-paid-api/485172)
- [Circles](https://github.com/csesoc/circles), [NUSMods](https://github.com/chuabingquan/nusmods), [NUSMods Open Collective](https://opencollective.ecosyste.ms/collectives/nusmods), [PennPlanner](https://github.com/qu8n/pennplanner)
- [UniMelb WAM Checker](https://chrome.google.com/webstore/detail/unimelb-wam-checker/kjdhdamemgfkkhblkfomomoohigekhll/reviews), [GPA @ UniMelb](https://unimelb-gpa.jiangren.com.au/gpa-calculator), [GradeStack](https://apps.apple.com/mx/app/gradestack/id6743357513)
