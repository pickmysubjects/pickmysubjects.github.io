# Maintenance checklist

Student projects die when the person who knows the routine graduates (see docs/competitive-analysis.md). This is the routine.

## Every year, when the new Handbook is published (usually around August–October)

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
