# AI Development Guide for this Repository

Use this file as the default guidance for AI-generated changes in this codebase.

Instruction precedence: start with repository-wide defaults in `ai.md` at repo root, then apply this file for actor-related work.

## Scope and Intent

- Project: RuneQuest Glorantha system (`rqg`) for Foundry VTT.
- Runtime target: Foundry v13.
- Languages: TypeScript, SCSS, Handlebars.
- Primary objective: produce minimal, safe, repo-consistent changes.

## Core Rules

1. Prefer strong typing and existing project/domain types over `any`.
2. Keep changes narrowly scoped to the requested behavior.
3. Follow existing patterns in neighboring files before introducing new patterns.
4. Prefer fixing root cause over adding defensive patches in many places.
5. Do not refactor unrelated code in the same change.

## Foundry + RQG Conventions

- Use Foundry globals (`game`, `ui`, `canvas`, `CONFIG`) when needed; avoid re-wrapping them.
- Access system data through `document.system` (not legacy `document.data`).
- Use `localize()` from `src/system/util.ts` for user-facing text.
- For core lifecycle registration, follow existing hook usage (`Hooks.once("init")`, `Hooks.once("ready")`, `Hooks.on(...)`) as used in `src/rqg.ts`.
- Keep classes aligned with Foundry architecture (`Actor`, `Item`, sheet classes, applications).
- `update`, `create`, `delete`, and document operations are async: await them and handle failures clearly.

## Repository Workflow

Before handing off changes, run the smallest relevant checks first:

1. `pnpm lint:scripts` for TypeScript/JS changes.
2. `pnpm test` (or targeted vitest tests) when logic changes.
3. `pnpm typecheck` for type safety.
4. `pnpm build` only when build outputs/integration need verification.

Formatting and linting are enforced by project tooling (Prettier + ESLint + Stylelint); keep output clean.

## File and Feature Placement

- Place new code near related feature code (cohesive folder structure over generic utilities).
- Reuse existing helpers in `src/system/`, `src/data-model/`, and feature modules before creating new ones.
- Keep template (`.hbs`) updates synchronized with their corresponding sheet/app TypeScript data preparation.

## Localization and UX Text

- Never hardcode user-facing strings when they can be localized.
- Add/update i18n keys when introducing new labels, button text, warnings, or chat text.
- Hardcoded text is acceptable only for internal/debug/developer-only messages.

## Testing Guidance

- Prefer adding/updating targeted tests near changed logic (`*.test.ts`) when practical.
- Do not add broad snapshot-style tests for small behavior changes.
- Validate edge cases for rules-heavy mechanics (combat, rolls, effects, migrations).

### Current Actor DataPrep Coverage

- Core pure helpers: `src/actors/rqgActorSheetDataPrep.test.ts`
- Async/enrichment and organization helpers: `src/actors/rqgActorSheetDataPrep.async.test.ts`
- When changing actor sheet prep logic, extend one of these files first instead of creating broad integration tests.

## AI Output Quality Checklist

When generating code for this repo, ensure the result is:

- Correct for Foundry v13 APIs.
- Type-safe enough to pass project type checks.
- Consistent with local naming and architecture.
- Localized for any player-facing text.
- Verified with the smallest relevant lint/test/typecheck commands.
