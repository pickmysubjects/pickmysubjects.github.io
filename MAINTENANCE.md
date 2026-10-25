# Maintenance checklist

Student projects die when the person who knows the routine graduates (see docs/competitive-analysis.md). This is the routine.

## November: moving to the next year

The next year's Handbook comes out around mid-November, and the data is entered subject by subject over November and December. The site handles the in-between by itself (one rule in `src/engine/dataYear.ts`): each subject shows its newest entered year, marked "From the 2026 Handbook" when a newer Handbook is out, the planner assumes it runs the same semesters, and Handbook links go to the year the facts come from. The routine:

1. Bump `HANDBOOK_PUBLISHED` in `src/engine/dataYear.ts` to the new year (e.g. 2027) once the Handbook is published. While most subjects are still behind, a one-line notice shows across the site.
2. Freeze the outgoing year **before** entering anything: `npm run snapshot-year -- 2026`, and commit `data/real/snapshots/2026.json`.
3. Enter the new year's data subject by subject (steps 1–4a below). `npm run audit` lists the subjects with no entry for the newest year yet.
4. Add a one-line entry (all nine languages) to `src/content/updates.ts`; the About page shows it.

## Every year, when the new Handbook is published (usually mid-November)

0. **Before changing any file**, freeze the outgoing year: `npm run snapshot-year -- 2026` (the year you are leaving), then commit `data/real/snapshots/2026.json`. Subjects keep one file across years, so typing the new year's prerequisites, assessment or title over the old ones loses them; the snapshot keeps them for the "What changed" page. Majors work the same way: edit the component file in place (ids are unique across years), and the snapshot keeps the old compulsory list.
1. For each course in `data/real/courses/`, compare the new year's rules by hand. If they changed, add `courses/<CODE>/<YEAR>.yaml`. Keep the old year, because students follow the rules of the year they started.
2. For each major or specialisation, check its structure and add the new year's file if it changed.
3. For each subject, check its semesters for the new year and add a new year under `offerings:`. Re-check prerequisites and non-allowed subjects. Update `verified_on`.
4. Run `npm run data && npm test`, then fix whatever breaks.
4a. `npm run changes` prints what changed since the snapshot. The page `/changes/<year>/` (all languages, linked from every page and listed in the sitemap) is built only once some subject lists the new year under `offerings:` and something actually differs; until then there is no page. What it compares, per subject: new, discontinued (`discontinued_from`), the periods it runs, prerequisites, final-exam share, points, title; per major, minor and specialisation: new, closed (`closed_from`), compulsory subjects added or removed. A subject not yet re-entered for the new year (no `offerings` for it) shows no change in when it runs.
5. Update the status column in `src/painPoints.ts` and the README if anything improved.

## Every semester

- Triage new issues: label them, and close the ones with nothing to do.
- Thank contributors, and add data-only contributors to the README.

## Handover

- At least two maintainers at all times. Before you graduate, add a successor as a GitHub collaborator and walk them through this file.
