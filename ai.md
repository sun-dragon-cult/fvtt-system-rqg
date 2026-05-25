# AI Instructions (Repository Default)

This file is the default guidance for AI-assisted changes in this repository.

## Priority and Scope

- Applies to the whole repo unless a deeper folder contains a more specific `ai.md`.
- More specific `ai.md` files override this file for their subtree.
- For actor work, also follow [src/actors/ai.md](src/actors/ai.md).
- For item work, also follow [src/items/ai.md](src/items/ai.md).
- For application/dialog work, also follow [src/applications/ai.md](src/applications/ai.md).
- For system/migration/util work, also follow [src/system/ai.md](src/system/ai.md).

## Project Baseline

- System: RuneQuest Glorantha (`rqg`) for Foundry VTT.
- Runtime target: Foundry v14.
- Main stack: TypeScript, Handlebars templates, SCSS.
- Foundry v14 source code is available at `~/foundry/Foundry-14/FoundryVTT/` for
  reference when investigating Foundry internals (e.g. client APIs, application
  lifecycle, context menus).
- A short version of the rules for the roleplaying game this system is for are available at `https://rqwiki.chaosium.com/rules/`
- Some repo docs/scripts mention v13 for local dual-version workflows; treat v14 as the implementation target unless explicitly requested otherwise.

## Default Engineering Rules

1. Keep changes minimal and scoped to the request.
2. Prefer existing project patterns and helpers over new abstractions.
3. Use type-safe code and avoid unnecessary `any`.
4. Use `document.system` for system data access.
5. Localize user-facing text via `localize()` from `src/system/util.ts` (window titles, notifications, dialog labels, chat text, and sheet UI labels).
6. Avoid unrelated refactors in the same change.
7. Hardcoded English is acceptable only for internal debug/developer-only logging and assertions.

## Foundry + fvtt-types Guidance

- Prefer existing project types and aliases before introducing new type shapes.
- Keep strict typing posture aligned with `tsconfig.json` and `fvtt-types`.
- Use `src/global.d.ts` for global Foundry/system augmentations and declarations.
- Use `src/system/fvttTypeCompat.ts` for runtime-safe compatibility wrappers around temporary typing gaps.
- Use `@ts-expect-error TEMP(v14-types)` only when:
  - the runtime API is confirmed in Foundry v14,
  - the type gap is from current `fvtt-types`,
  - and a typed wrapper/global augmentation is not viable for the callsite.
- Remove TEMP compatibility markers when upstream typings catch up.

## Validation Order

Run the smallest relevant checks first:

1. `pnpm lint:scripts`
2. `pnpm test` (or targeted vitest tests)
3. `pnpm typecheck`
4. `pnpm build` only when needed for integration/build verification

## CSS & Theming

Foundry themes use `body.theme-dark` / `body.theme-light`. Prefer theme-adaptive CSS variables over static ones:

- **Text**: use `--color-text-secondary`, `--color-text-primary` etc. (theme-aware) — **not** `--color-text-dark-secondary` or `--color-text-light-*` (static, dark-mode only).
- **Inputs**: Foundry automatically sets `--input-background-color`, `--input-border-color`, `--input-text-color` per theme, including a distinct rule for `input[readonly]`. Avoid overriding these with hard-coded `border`/`color`/`background` properties unless there is a specific reason.
- **Icon click (AppV2 sheets)**: `img[data-edit="img"]` triggers a FilePicker only when `data-action="editImage"` is also present (AppV2 routes clicks via `data-action`; `data-edit` alone was the AppV1 convention).

## Repo-Specific Workflow Rules

- If you add or rename `.hbs` templates, verify `src/system/loadHandlebarsTemplates.ts` is updated.
- If you change sheets/dialogs, keep TypeScript context data, templates, and styles synchronized.
- If you change migrations, keep them idempotent, GM-safe, localized in player-facing reports, and covered by targeted migration tests.
- If you change actor sheet data prep, extend existing tests in:
  - `src/actors/rqgActorSheetDataPrep.test.ts`
  - `src/actors/rqgActorSheetDataPrep.async.test.ts`

## AI-Facing Codebase Map

- `src/rqg.ts`: lifecycle and registration entrypoint.
- `src/system/util.ts`: shared helpers, `localize()`, and common utility functions.
- `src/global.d.ts`: global typing augmentation for Foundry/RQG.
- `src/system/fvttTypeCompat.ts`: temporary v14 typing compatibility wrappers.
- `src/system/loadHandlebarsTemplates.ts`: centralized template registry.
- `src/system/migrations/`: migration orchestration, migration implementations, and reporting.

## Reusable Task Guides

- [AppV2 sheets and dialogs](docs/ai-guides/appv2-sheet-dialog-changes.md)
- [World/document migrations](docs/ai-guides/migration-changes.md)
- [fvtt-types compatibility handling](docs/ai-guides/fvtt-types-compatibility.md)

## AI Documentation Consistency Checklist

When updating AI instructions, verify:

- Runtime target wording is consistent (Foundry v14).
- Root and subtree `ai.md` files do not duplicate conflicting rules.
- Guidance references existing files and valid paths.
- Validation order and localization guidance are aligned across docs.
- Any temporary typing workaround guidance still matches current code.

## Handoff Checklist

Before finishing, ensure:

- Behavior matches request exactly.
- New UI text is localizable.
- Changes are consistent with nearby code style.
- Relevant lint/tests/type checks have been run when feasible.
