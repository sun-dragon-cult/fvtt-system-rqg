---
description: Resolve a Foundry runtime vs fvtt-types type mismatch.
---

Follow the **fvtt-types compatibility updates** workflow in [`AGENTS.md`](../../AGENTS.md#fvtt-types-compatibility-updates).

Preferred order of resolution:

1. Use an existing typed API or project type alias.
2. Add a global augmentation in `src/global.d.ts`.
3. Add a runtime-safe wrapper in `src/system/fvttTypeCompat.ts`.
4. Only as a last resort, use `@ts-expect-error TEMP(v14-types)` with a comment explaining the gap.

Verify with `pnpm typecheck` and any tests covering the affected behavior.
