# AI Instructions (Repository Default)

This file is the default guidance for AI-assisted changes in this repository.

## Priority and Scope

- Applies to the whole repo unless a deeper folder contains a more specific `ai.md`.
- More specific `ai.md` files override this file for their subtree.
- For `src/actors/*`, also follow [src/actors/ai.md](src/actors/ai.md).

## Project Baseline

- System: RuneQuest Glorantha (`rqg`) for Foundry VTT.
- Runtime target: Foundry v13.
- Main stack: TypeScript, Handlebars templates, SCSS.

## Default Engineering Rules

1. Keep changes minimal and scoped to the request.
2. Prefer existing project patterns and helpers over new abstractions.
3. Use type-safe code and avoid unnecessary `any`.
4. Use `document.system` for system data access.
5. Localize player-facing text via `localize()` from `src/system/util.ts`.
6. Avoid unrelated refactors in the same change.

## Validation Order

Run the smallest relevant checks first:

1. `pnpm lint:scripts`
2. `pnpm test` (or targeted vitest tests)
3. `pnpm typecheck`
4. `pnpm build` only when needed for integration/build verification

## Handoff Checklist

Before finishing, ensure:

- Behavior matches request exactly.
- New UI text is localizable.
- Changes are consistent with nearby code style.
- Relevant lint/tests/type checks have been run when feasible.
