---
name: handoff
description: Use when the user asks for a handoff, HANDOFF.md, session summary or "write down where we are" before stopping or switching context - writes HANDOFF.md covering the work, decisions and why, current state, what's broken or unfinished, next steps and codebase lessons, then commits and pushes it.
---

# Handoff

Write `HANDOFF.md` at the repository root so a new session, or another person, can pick the work up without the conversation that produced it.

## Gather facts first

Verify everything before writing it down. Don't work from memory of the conversation.

- **Branches and commits:** `git status`, `git log --oneline origin/main..HEAD`, and the branch's upstream state. Is everything pushed?
- **PRs:** `gh pr view <n> --json state,headRefName,baseRefName,reviewDecision,mergeStateStatus` for every PR involved, including PRs in sibling repos (wiki module, docs site).
- **Checks:** the last results of `pnpm check:ci` and the relevant e2e specs. If they haven't run since the last change, run them, or say plainly that they weren't run.
- **Issues:** the milestone order and any issue comments posted during the session; link them.
- **Memory:** the memory files that were written or updated (they hold lessons too).

## Structure

Use these sections, in this order. Keep each item to a line or two, and link PRs, issues and comments instead of repeating them.

1. **What we were working on:** the issue, where it sits in the milestone order, and a table of the PRs/branches with what each holds and their merge order.
2. **Decisions and why:** each decision with its reason, and a rules citation (book and page) for game mechanics. Include decisions that rejected an obvious alternative, and the alternative.
3. **Current state:** commit hashes, pushed or not, test results with counts, and merge-gate status.
4. **Broken or unfinished:** known gaps, things skipped on purpose and why, and anything not verified live. Be honest: "not tested" beats silence.
5. **Next steps:** numbered, in the order to do them, with links to the issues and comments that hold the plan.
6. **Things learned about this codebase:** environment and tooling traps, framework (Foundry) gotchas, test recipes, and repo conventions that cost time to discover. Leave out anything already in `AGENTS.md`, or obvious from the code.

## Style

- Plain, direct sentences; no marketing tone, no emoji.
- Absolute dates (`2026-10-11`), not "today" or "yesterday".
- Exact identifiers in backticks: methods, files, settings, ports, users.
- Leave out secrets, passwords and private URLs, and the claude.ai session link.

## Commit and push

1. Commit on the current working branch unless the user names another, with a conventional message such as `docs: handoff for #<issue>`. Follow the repo's commit attribution rules (in this repo: no `Claude-Session:` trailer).
2. Push. The pre-push hook runs typecheck, the i18n audit and the unit tests; don't skip it.
3. Tell the user that if the branch is a PR, `HANDOFF.md` will land in `main` with the merge unless they delete it first, and offer to remove it then.
