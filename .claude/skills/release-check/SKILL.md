---
name: release-check
description: Check a PickMySubjects branch and, only if everything passes, merge it into main, push, and clean up. Use when the maintainer says "上线检查", "release check", "检查然后推送", "push it" for this repo.
---

# Release check

Run from the repo root. Steps run one at a time; read each result before the next. Never put a check and `git push` in the same command.

## 1. Know what is going out

- `git status --short` must be clean (commit or ask about stray files first).
- `git log --oneline origin/main..<branch>` — list the commits; every author email must end in `@users.noreply.github.com` and no message may carry `Co-Authored-By` or other AI attribution.
- If the branch lives in `.worktrees/<name>`, run the checks there.

## 2. Checks (once each)

1. `npm run typecheck` — must be clean.
2. `npm test` — all must pass. If a planner/stress test times out, rerun that file alone (`npx vitest run tests/<file>`); a real failure stops the release.
3. `npx tsx scripts/eval-transcripts.ts` (in a worktree add `~/Projects/subject-compass-eval/students`) — compare with the baseline in CLAUDE.md (recall@10 0.75 / 0.75, MAE 6.80). If a number got worse, stop and explain why to the maintainer before going on.
4. `npm run build` — must finish and print the prerendered page count.

If anything fails: stop, report what failed and the likely cause, and do not merge.

## 3. Ship (only when the maintainer has said to push)

1. `git switch main && git merge --ff-only <branch>` (or a merge commit if main moved; reword it to say what's in it).
2. `git push origin main`.
3. Watch the runs: `gh run list -L 3`, then `gh run watch <id> --exit-status` for "Deploy site" and "CI". The deploy also runs the IndexNow job; its log should say `HTTP 200` or `202`.
4. Delete the branch (`git branch -d <branch>`) and its worktree (`git worktree remove .worktrees/<name>`), then `git worktree prune`.

## 4. Tell the maintainer (in Chinese)

What went live in plain words, the check numbers (tests passed, eval, pages built), and anything left undone.
