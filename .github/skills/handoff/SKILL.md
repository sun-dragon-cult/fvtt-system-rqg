---
name: handoff
description: Use when the user asks for a handoff, HANDOFF.md, session summary or "write down where we are" before stopping or switching context - writes HANDOFF.md covering the work, decisions and why, current state, what's broken or unfinished, next steps and codebase lessons, and publishes it as a secret gist (never committed to the repo).
---

# Handoff

Write a `HANDOFF.md` so a new session, or another computer, can pick the work up without the conversation that produced it. A handoff is a temporary working note, not part of the codebase: publish it as a secret gist and never commit it to a branch.

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

## Publish as a secret gist

1. Write the file in the session's scratchpad directory, not the repository, so it can't be committed by accident.
2. Look for an earlier handoff gist for this repo:
   `gh gist list --limit 50 | grep -i "handoff"`.
   - If there is one, update it in place, so the link stays the same and gets a new revision: `gh gist edit <id> -f HANDOFF.md <scratchpad>/HANDOFF.md`.
   - If not, create one: `gh gist create --desc "<repo> handoff: <topic>" <scratchpad>/HANDOFF.md`. `gh` creates secret gists by default; never pass `--public`.
3. Give the user the gist URL and the command to fetch it on another computer:
   `gh gist view <id> -f HANDOFF.md > HANDOFF.md` (or just open the URL).
4. Secret means unlisted, not private: anyone with the link can read it. Leave out secrets, passwords and private URLs.

Uploading may need the user's permission. If the call is refused, leave the file in the scratchpad, give its path, and suggest the user run the `gh gist` command themselves with the `!` prefix.

## Picking up a handoff

At the start of a session, if the user says to continue from a handoff: fetch the gist, read it, then check its "Current state" against `git log` and the PRs before acting on it, since things may have moved on (merges, new commits).
