# Copilot Instructions for this Repository

Canonical implementation guidance lives in `/home/runner/work/fvtt-system-rqg/fvtt-system-rqg/ai.md`.

## Source of Truth and Precedence

1. Start with [`ai.md`](../ai.md) at repository root.
2. Apply the most specific subtree `ai.md` for files you touch:
   - [`src/actors/ai.md`](../src/actors/ai.md)
   - [`src/items/ai.md`](../src/items/ai.md)
   - [`src/applications/ai.md`](../src/applications/ai.md)
   - [`src/system/ai.md`](../src/system/ai.md)
3. If instructions conflict, the most specific `ai.md` in the current subtree wins.

## GitHub-Specific Notes

- Keep pull requests narrowly scoped and reviewable.
- Include only files relevant to the requested change.
- If behavior changes, include the smallest relevant validation evidence (lint/tests/typecheck/build as applicable).
