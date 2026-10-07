# Maintenance checklist

Student projects die when the person who knows the routine graduates (see docs/competitive-analysis.md). This is the routine.

## Every year, when the new Handbook is published (usually around August–October)

1. For each course in `data/real/courses/`, compare the new year's rules by hand. If they changed, add `courses/<CODE>/<YEAR>.yaml`. Keep the old year, because students follow the rules of the year they started.
2. For each major or specialisation, check its structure and add the new year's file if it changed.
3. For each subject, check its semesters for the new year and add a new year under `offerings:`. Re-check prerequisites and non-allowed subjects. Update `verified_on`.
4. Run `npm run data && npm test`, then fix whatever breaks.
5. Update the status column in `src/painPoints.ts` and the README if anything improved.

## Every semester

- Triage new issues: label them, and close the ones with nothing to do.
- Thank contributors, and add data-only contributors to the README.

## Handover

- At least two maintainers at all times. Before you graduate, add a successor as a GitHub collaborator and walk them through this file.
