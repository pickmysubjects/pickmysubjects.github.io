# Ratings and feedback without a server

Students rate subjects and send feedback from inside the app, with no account and anonymously. Everything runs on free tools:

```
App ──POST──▶ Google Form ──▶ private Google Sheet
                                      │  read-only service account (GitHub secret)
                                      ▼
              GitHub Actions (weekly) → scripts/ratings/fetch.ts → data/real/ratings.json
                                      │  weekly; aggregates only (3+ ratings): trimmed means, counts, median hours,
                                      │  plus "What I wish I knew" tips the maintainer approved (3+ per subject) → comments.json
                                      ▼
                         npm run data merges them into subjects → app shows them
```

## Privacy rules

- The forms **do not collect email addresses** and do not require sign-in.
- The sheet is **never published to the web or shared**. Only the service account can read it, and only read-only.
- Only aggregates are committed, plus approved "What I wish I knew" tips (see [Tips from students](#tips-from-students)). Every other free-text answer, the Feedback form and all contact details stay in the private sheet.
- A tip is published only after the maintainer ticks it, passes the automatic filter, and its subject has 3 such tips. It is published with its text, term and app language only, never with the rest of its row, so it can't be tied to a grade band or a rating.
- Aggregates need at least 3 reviews before the engine trusts them (it shrinks scores toward neutral below that).

## 1. Create the two forms

Use the question titles exactly as written below. The aggregation script matches on these titles.

**PickMySubjects – Subject ratings**

| Question | Type | Required |
|---|---|---|
| Subject code | short answer | yes |
| Year taken | short answer | yes |
| Semester taken | dropdown: Summer, Semester 1, Winter, Semester 2 | yes |
| Difficulty | linear scale 1–5 | yes |
| Workload | linear scale 1–5 | yes |
| Marking generosity | linear scale 1–5 | yes |
| Hours per week | short answer | |
| Grade band | dropdown: H1, H2A, H2B, H3, P, N, Prefer not to say | |
| Skills used | checkboxes: programming, algorithms, maths, statistics, data, systems, writing, presentation, lab, design, business | |
| Would you recommend it | multiple choice: Yes, Maybe, No | |
| What I wish I knew | paragraph | |
| App language | short answer | |

**PickMySubjects – Feedback**

| Question | Type | Required |
|---|---|---|
| Topic | short answer | yes |
| Rating | short answer | |
| Subject code | short answer | |
| Message | paragraph | yes |
| Contact | short answer | |
| App language | short answer | |

Settings for both forms:

- Collect email addresses: **Do not collect**.
- "Limit to 1 response": **off**. Turning it on forces sign-in.
- Responses → **Link to Sheets**. Don't publish or share the sheet.
- Publish so that anyone with the link can respond.

## 2. Connect the app

1. Open each form and choose ⋮ → **Get pre-filled link**. Fill every question with any sample answer, then click **Get link**.
2. The link looks like `https://docs.google.com/forms/d/e/<formId>/viewform?usp=pp_url&entry.123=...`.
3. Copy `<formId>` and each question's `entry.<number>` into `RATINGS_FORM` and `FEEDBACK_FORM` in `src/config.ts`.

Until this is done, the app shows "Ratings aren't switched on yet" instead of the form.

### Optional questions added later

`Exam difficulty`, `Usefulness`, `Interest` and `Teaching` are optional 1–5 questions. Forms made before they existed don't have them, and the app hides them until `src/config.ts` has their entry ids.

1. Open the ratings form in Google Forms and copy its address (`…/forms/d/<id>/edit`).
2. In the Apps Script project, paste it into `RATINGS_FORM_EDIT_URL` and run `addRatingQuestions` once.
3. Copy the four `entry.<number>` values from the logged pre-filled link into `examDifficulty`, `usefulness`, `interest` and `teaching` in `RATINGS_FORM`.

Each one is published only once at least 3 people have answered it.

## Grade bands with a WAM range

A grade band says how hard a subject grades only next to how strong the student is. So when a
student picks a grade band in a rating, or shares bands from the card on My page, the app also
sends the five-point range of their WAM without that subject (if My page has 3+ other marks). It
goes in the same ratings form, as one extra optional question. Marks never leave the browser.

1. In the Apps Script project, set `RATINGS_FORM_EDIT_URL` and run `addWamRangeQuestion` once.
2. Copy the logged `entry.<number>` into `wamBand` in `RATINGS_FORM` (`src/config.ts`). Until then
   ratings work as before and the My page card stays hidden.

The weekly job also writes `data/real/grade-offsets.json`: for each subject with at least 5 bands
that carry a WAM range, how far grades sit above or below the sharers' WAM, with how sure that is
(`sd`). Each band is read as the range of marks it covers (an H1 is anywhere from 80 up), not as one
typical mark, and bands from earlier years count a little less (0.8 per year). With few shares the
estimate stays close to 0. Rows are never published. The likely-mark estimate and "ease" use it.

It also writes `data/real/model.json`, the numbers the engine would otherwise assume, once there is
enough data for each: the grade model's spread, slope and how much subjects differ (from 200+ bands),
how strongly ratings and reviews are pulled toward average (from 30+ subjects with 3+ ratings), and
how Handbook facts (exam share, hurdles, class hours, level, the review verdict) predict a subject's
offset (from 40+ subjects with offsets), so a subject nobody has shared grades for borrows from
similar ones in its likely-mark estimate. Once that prior is in, an offset it moved also keeps
`shared`, what the bands alone say: ease and the "did N marks better" line read that, since they
count the Handbook facts and review verdicts themselves.
Until then the file is `{}` and the engine keeps its hand-set values exactly (`src/engine/fitted.ts`).

## Tips from students

The ratings form's "What I wish I knew" answers can be shown on subject pages as "Tips from students". Nothing is shown until you approve it.

**One-time setup**

1. Open the ratings responses sheet.
2. In the first empty column to the right of the form's columns, type the header `Show` (exactly that, in row 1).
3. Select the rest of that column and choose Insert → Checkbox.

The service account stays **Viewer** (read-only); it only reads the new column. Don't rename the column, and don't put it between the form's columns.

**Approving**

- Read new answers in "What I wish I knew" and tick `Show` for the ones that are useful and don't name or describe anyone. Leave everything else unticked.
- The weekly job publishes a ticked tip only if it also passes the automatic filter (`scripts/ratings/comments.ts`): it drops, never edits, any tip with an email, phone number, link, a 6+ digit number (student numbers), an @handle, a named member of staff ("Dr Smith", "tutor John", "王老师"), or more than 400 characters.
- A subject shows tips only once it has 3 that are ticked and pass the filter (`MIN_COMMENTS`). Below that nothing about its tips is written to `data/real/comments.json`.
- Each tip is published with its text, the year and semester, and the app language. Order: newest term first, then a fixed order from a hash of the text, so the order doesn't show when each arrived.

**Reports**

Each shown tip has a small "Report" link. It sends a Feedback response with topic `comment-report`, the subject code and `comment <id>`. The id is a hash of the subject and text (`commentId` in `scripts/ratings/comments.ts`), not a row number. A reported tip stays up until you untick `Show`; it disappears at the next weekly run (or run the workflow by hand). To find the row, filter the sheet by the subject code and compare the text shown on the site.

## 3. Daily aggregation

1. Google Cloud Console (free):
   - Create a project.
   - Enable the **Google Sheets API**.
   - Create a **service account** with no roles, and create a JSON key for it.
2. Share the ratings sheet with the service account's email address as **Viewer**. Share it with that address only.
3. GitHub repo → Settings → Secrets and variables → Actions. Add these two secrets:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: the whole JSON key.
   - `RATINGS_SHEET_ID`: the long id in the sheet's URL.
4. The **Aggregate ratings** workflow then runs weekly, and can also be run by hand. Without the secrets it skips quietly. It commits `ratings.json`, `grade-offsets.json`, `model.json` and `comments.json` only; weekly, not daily, because a daily diff could single out one person's rating or tip.

Keep the JSON key only in GitHub secrets. Delete the downloaded file after adding it, and never commit it.
