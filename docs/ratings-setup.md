# Ratings and feedback without a server

Students rate subjects and send feedback from inside the app, with no account and anonymously. Everything runs on free tools:

```
App ──POST──▶ Google Form ──▶ private Google Sheet
                                      │  read-only service account (GitHub secret)
                                      ▼
              GitHub Actions (daily) → scripts/ratings/fetch.ts → data/real/ratings.json
                                      │  aggregates only: trimmed means, counts, median hours
                                      ▼
                         npm run data merges them into subjects → app shows them
```

## Privacy rules

- The forms **do not collect email addresses** and do not require sign-in.
- The sheet is **never published to the web or shared**. Only the service account can read it, and only read-only.
- Only aggregates are committed. Free text ("What I wish I knew") and contact details stay in the private sheet. Free text could be shown later, but only after moderation.
- Aggregates need at least 3 reviews before the engine trusts them (it shrinks scores toward neutral below that).

## 1. Create the two forms

Use the question titles exactly as written below. The aggregation script matches on these titles.

**Subject Compass – Subject ratings**

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

**Subject Compass – Feedback**

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

## 3. Daily aggregation

1. Google Cloud Console (free):
   - Create a project.
   - Enable the **Google Sheets API**.
   - Create a **service account** with no roles, and create a JSON key for it.
2. Share the ratings sheet with the service account's email address as **Viewer**. Share it with that address only.
3. GitHub repo → Settings → Secrets and variables → Actions. Add these two secrets:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: the whole JSON key.
   - `RATINGS_SHEET_ID`: the long id in the sheet's URL.
4. The **Aggregate ratings** workflow then runs daily, and can also be run by hand. Without the secrets it skips quietly.

Keep the JSON key only in GitHub secrets. Delete the downloaded file after adding it, and never commit it.
