# Agent Instructions

Canonical guidance for AI-assisted changes in this repository. Applies to all AI agents (Claude Code, Codex, Aider, Cursor, VS Code Copilot, etc.).

VS Code Copilot also auto-loads this file via [`.github/copilot-instructions.md`](.github/copilot-instructions.md), and exposes the task workflows in the [Common Task Workflows](#common-task-workflows) section as slash-command prompts in [`.github/prompts/`](.github/prompts/).

## Project Baseline

- System: RuneQuest Glorantha (`rqg`) for Foundry VTT.
- Runtime target: Foundry v14.
- Main stack: TypeScript, Handlebars templates, SCSS.
- Foundry v14 source code is available for reference when investigating Foundry internals (e.g. client APIs, application lifecycle, context menus). The exact path varies per machine; read `FOUNDRY_V14_APP` from `.env.local` to locate it.
- Foundry v14 API reference: `https://foundryvtt.com/api/` — use to verify public API shape, method signatures, and document lifecycle.
- Foundry knowledge base (developer articles): `https://foundryvtt.com/kb/` — the "Community Development" section covers system data models, localization, API migration guides, and system development patterns.
- Foundry v14 release notes: individual builds at `https://foundryvtt.com/releases/14.{build}` — useful when investigating what changed in a specific v14 build.
- RQG rules reference: `https://rqwiki.chaosium.com/rules/` — consult when implementing an unfamiliar game mechanic (skills, runes, passions, combat, spirit magic, rune magic).
- Some repo docs/scripts mention v13 for local dual-version workflows; treat v14 as the implementation target unless explicitly requested otherwise.

## Default Engineering Rules

1. Keep changes minimal and scoped to the request.
2. Prefer existing project patterns and helpers over new abstractions.
3. Use type-safe code and avoid unnecessary `any`.
4. Use `document.system` for system data access.
5. Localize user-facing text via `localize()` from `src/system/util.ts` (window titles, notifications, dialog labels, chat text, and sheet UI labels).
6. Avoid unrelated refactors in the same change.
7. Hardcoded English is acceptable only for internal debug/developer-only logging and assertions.
8. Use `RqgLogger` from `src/system/logging/rqg-logger.ts` for all runtime logging; avoid bare `console.log`/`console.warn`.
9. When code needs to throw in runtime paths, use `logger.throw(...)` with a module-level `RqgLogger`; if a module does not yet have one, add it rather than directly constructing and throwing `RqgError`.
10. `update`, `create`, `delete` and other document operations are async; await them and handle failures clearly.
11. Naming convention: use **kebab-case** for new folders and non-type files (especially under `src/applications/**`); keep PascalCase for TypeScript symbol names (classes/types/interfaces). Treat legacy mixed-case paths as stable unless a task explicitly includes path normalization.
12. For i18n keys/messages, prefer translator-friendly strings: use one key with explicit placeholders where feasible, and avoid source phrasing that depends on dynamic-name grammar (article/gender/plural/case) so translations can reorder placeholders naturally.

## Foundry + fvtt-types Guidance

- Prefer existing project types and aliases before introducing new type shapes.
- Keep strict typing posture aligned with `tsconfig.json` and `fvtt-types`.
- Use `src/global.d.ts` for global Foundry/system augmentations and declarations.
- Use `src/system/fvtt-type-compat.ts` for runtime-safe compatibility wrappers around temporary typing gaps.
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

- If you add or rename `.hbs` templates, verify `src/system/load-handlebars-templates.ts` is updated.
- If you change sheets/dialogs, keep TypeScript context data, templates, and styles synchronized.
- If you change migrations, keep them idempotent, GM-safe, localized in player-facing reports, and covered by targeted migration tests.

## AI-Facing Codebase Map

- `src/rqg.ts`: lifecycle and registration entrypoint.
- `src/system/util.ts`: shared helpers, `localize()`, and common utility functions.
- `src/system/logging/rqg-logger.ts`: project logger.
- `src/global.d.ts`: global typing augmentation for Foundry/RQG.
- `src/system/fvtt-type-compat.ts`: temporary v14 typing compatibility wrappers.
- `src/system/load-handlebars-templates.ts`: centralized template registry.
- `src/system/migrations/`: migration orchestration, migration implementations, and reporting.

## RQG Domain Model

Key types and conventions specific to this system:

- **Core mechanic**: D100 roll-under. A roll succeeds if the result ≤ the skill/ability value; there are critical and special success thresholds derived from the value. See `src/rolls/` for implementation and the rules wiki for exact thresholds; results are reported to chat via `src/chat/`.
- **Actor types**: One actor type — `character` (`ActorTypeEnum.Character` in `src/data-model/actor-data/rqg-actor-data.ts`).
- **Item types**: `armor`, `cult`, `gear`, `hitLocation`, `homeland`, `occupation`, `passion`, `rune`, `runeMagic`, `skill`, `spiritMagic`, `weapon` (`ItemTypeEnum` in `src/data-model/item-data/item-types.ts`).
- **Ability items**: `skill`, `rune`, `passion` share roll mechanics (`AbilityItem` type).
- **Physical items**: `gear`, `weapon`, `armor` track encumbrance and hit location.
- **RQID**: Stable system identifier for cross-document item linking. `RqidLink` (`src/data-model/shared/rqid-link.ts`) stores `{ rqid, name }` and resolves at runtime via `src/system/api/rqid-api.ts`.

## Subtree Specifics

### When working on `src/actors/**`

- Both AppV1 (`rqgActorSheet.ts`) and AppV2 (`RqgActorSheetV2.ts`) sheets coexist; preserve both unless explicitly removing one.
- Prefer fixing root cause over adding defensive patches across multiple call sites.
- When changing actor sheet data prep, extend the existing test files rather than creating new ones:
  - Pure helpers: `src/actors/rqg-actor-sheet-data-prep.test.ts`
  - Async/enrichment helpers: `src/actors/rqg-actor-sheet-data-prep.async.test.ts`

### When working on `src/items/**`

- AppV1 (`RqgItemSheet.ts`) and AppV2 (`RqgItemSheetV2.ts`) sheets coexist; preserve compatibility.
- Use existing item model types from `src/data-model/item-data/**`.
- Keep drag/drop and RQID-link behavior consistent with `src/documents/drag-drop.ts` and `src/data-model/shared/rqid-link.ts`.
- Co-locate tests with their feature folder (e.g., `src/items/armor-item/armor.test.ts`); extend an existing `*.test.ts` before creating a new one.

### When working on `src/applications/**`

- Follow existing AppV2 patterns: `ApplicationV2`, `HandlebarsApplicationMixin`, `DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, `_onRender`.
- Keep form behavior consistent with current usage (`form.handler`, `submitOnChange`, `closeOnSubmit`) unless the task requires otherwise.
- For new folders/files, prefer kebab-case path names; avoid introducing new PascalCase directory names.
- No dedicated application test suite exists; co-locate a new `*.test.ts` in the same folder when adding non-trivial logic.

### When working on `src/system/**`

- Prefer existing utilities and logging patterns (`RqgLogger`, `localize()`, `RqgError`) over creating parallel helpers.
- For world migrations, maintain GM-only safety and localized user-facing migration reporting.
- Keep `@ts-expect-error TEMP(v14-types)` usage tightly scoped and justified by known runtime/type gaps.
- Add or update targeted migration tests in the matching folder:
  - Actor migration tests: `src/system/migrations/migrations-actor/**`
  - Item migration tests: `src/system/migrations/migrations-item/**`
  - World migration orchestration tests: `src/system/migrations/migrateWorld.*.test.ts`

## Common Task Workflows

### AppV2 sheet or dialog changes

AppV2 applications use `ApplicationV2` + `HandlebarsApplicationMixin`. Context flows from `_prepareContext` into named `PARTS` (Handlebars templates). Changes to displayed data almost always require keeping TypeScript context types, `.hbs` templates, and registered template paths consistent. The form submit/change lifecycle (`form.handler`, `submitOnChange`, `closeOnSubmit`) differs from AppV1, so check existing dialogs for the pattern before adding new form handling.

Checklist:

- Identify the AppV2 class and keep existing lifecycle patterns (`DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, `_onRender`).
- Keep TypeScript context data aligned with referenced `.hbs` templates.
- Keep template registration in `src/system/load-handlebars-templates.ts` aligned with template changes.
- Ensure user-facing UI strings are localized with `localize()` and valid i18n keys.
- Preserve V1/V2 coexistence; do not remove legacy sheet paths unless explicitly requested.
- Add/update targeted tests when behavior logic changes.

### World/document migrations

Migrations run automatically during a world upgrade. They must be idempotent (safe to run more than once), GM-only, and produce localized user-facing status reports. Individual migration functions live in `src/system/migrations/migrations-actor/` and `migrations-item/` and must be registered in `migrateWorld.ts` to take effect. The orchestrator controls ordering and deduplication; do not add ordering logic inside individual migrations.

Checklist:

- Keep migrations idempotent and safe if run multiple times.
- Ensure migration entry points remain GM-safe and non-GM behavior is explicit.
- Keep migration user messaging and reports localized.
- Follow existing logging and notification patterns in `migrateWorld.ts`.
- Add/update targeted migration tests in matching migration test files.
- Avoid broad refactors in the same change; isolate migration behavior updates.

### fvtt-types compatibility updates

`fvtt-types` often lags Foundry's runtime API. Handle mismatches in this order, falling through only when the previous option is impractical:

1. Use an existing typed API or project type alias.
2. Add a global augmentation in `src/global.d.ts` for new or changed Foundry globals/namespaces.
3. Add a runtime-safe wrapper in `src/system/fvtt-type-compat.ts` where a direct cast would be unsafe or noisy.
4. As a last resort, use `@ts-expect-error TEMP(v14-types)` with a comment explaining the known type gap so it can be removed once upstream typings catch up.

Verify with `pnpm typecheck` and any tests covering the affected behavior.

## Handoff Checklist

Before finishing, ensure:

- Behavior matches request exactly.
- New UI text is localizable.
- Changes are consistent with nearby code style.
- Relevant lint/tests/type checks have been run when feasible.
- If scope or approach was unclear at any point, confirm before making broad changes.
