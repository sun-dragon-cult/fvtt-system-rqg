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
- Foundry v14 source code is available at `~/foundry/Foundry-14/FoundryVTT/` for
  reference when investigating Foundry internals (e.g. client APIs, application
  lifecycle, context menus).
- A short version of the rules for the roleplaying game this system is for are available at `https://rqwiki.chaosium.com/rules/`

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

## CSS & Theming

Foundry v13 has two themes (`body.theme-dark` / `body.theme-light`). Prefer theme-adaptive CSS variables over static ones:

- **Text**: use `--color-text-secondary`, `--color-text-primary` etc. (theme-aware) — **not** `--color-text-dark-secondary` or `--color-text-light-*` (static, dark-mode only).
- **Inputs**: Foundry automatically sets `--input-background-color`, `--input-border-color`, `--input-text-color` per theme, including a distinct rule for `input[readonly]`. Avoid overriding these with hard-coded `border`/`color`/`background` properties unless there is a specific reason.
- **Icon click (AppV2 sheets)**: `img[data-edit="img"]` triggers a FilePicker only when `data-action="editImage"` is also present (AppV2 routes clicks via `data-action`; `data-edit` alone was the AppV1 convention).

## Handoff Checklist

Before finishing, ensure:

- Behavior matches request exactly.
- New UI text is localizable.
- Changes are consistent with nearby code style.
- Relevant lint/tests/type checks have been run when feasible.
