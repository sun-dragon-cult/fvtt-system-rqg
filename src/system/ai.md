# AI Development Guide for `src/system`

Apply root guidance from `/home/runner/work/fvtt-system-rqg/fvtt-system-rqg/ai.md` first, then this file for system-level work.

## Scope

- Core system helpers, settings, and utilities in `src/system/**`
- Migrations in `src/system/migrations/**`
- Compatibility shims and type integration with Foundry/fvtt-types

## System Rules

1. Prefer existing utilities and logging patterns (`RqgLogger`, `localize()`, `RqgError`) over creating parallel helpers.
2. Keep migration behavior idempotent and safe for repeated execution.
3. For world migrations, maintain GM-only safety and localized user-facing migration reporting.
4. Use `src/global.d.ts` for global type augmentations and `src/system/fvttTypeCompat.ts` for runtime compatibility wrappers.
5. Keep `@ts-expect-error TEMP(v14-types)` usage tightly scoped and justified by known runtime/type gaps.

## Testing Expectations

- Add or update targeted migration tests for migration changes.
- Keep existing migration test structure and naming patterns under `src/system/migrations/**`.
- Run relevant tests plus typecheck after system-level logic changes.
