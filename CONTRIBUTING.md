# Contributing

Thanks for helping. Every contribution should make one of the problems in [`src/painPoints.ts`](src/painPoints.ts) less painful, or fix data or a bug.

## Without writing code

1. **Feedback:** open the app's *Feedback* page. Choose the problem, rate it, describe your idea, then send it as a GitHub issue or copy the text.
2. **Wrong or missing subject data:** use *Report wrong data* on any suggestion, or the "Subject data is wrong" issue template. A Handbook link helps us check it quickly.
3. **Add a subject:** use the app's *Add data* page.
   - Open the subject's Handbook page in your own browser.
   - Copy the *Eligibility and requirements* section and the *Availability* line, and paste them in.
   - Copy the generated YAML into an issue, or into a pull request if you're comfortable with one.

## Writing code or data

```bash
npm install
npm run dev          # http://localhost:5180
npm test
npm run typecheck
```

### Data rules (please read)

- **Facts only, in our own words:** codes, levels, points, semesters, prerequisite logic, non-allowed subjects, course rules. **Never** copy Handbook overviews, learning outcomes or assessment descriptions; that text is the University's copyright.
- **No scraping or automated fetching** of University websites. Their terms forbid it. Everything is checked by a person in a normal browser.
- One file per subject: `data/real/subjects/CODE.yaml`. Set `source_year`, and set `verified_on` to the date you checked it against the Handbook.
- `unknown` means "not curated yet". Use `none` only when you've confirmed there is nothing.
- `npm run data` validates everything and lists subjects that are referenced but not yet curated. Those are good next ones to add.
- Faster from the terminal: `pbpaste | npm run paste -- --code COMP30027 --title "Machine Learning" --level 3`

### Code

- `src/engine/` is pure TypeScript with no Vue. Add or adjust a test in `tests/` for any engine change.
- UI: Vue 3 `<script setup>`. Keep it simple and plain-language. Check it in the browser, including at phone width.
- Code comments are in English.

### Good first tasks

- Curate a subject that `npm run data` lists as "referenced but not curated".
- Add the structure of a B-SCI major (`data/real/components/B-SCI/2026/*.yaml` is `unknown` today).
- Improve the Handbook-paste parser for a requirement format it doesn't handle yet, with a test.
