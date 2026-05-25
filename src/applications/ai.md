# AI Development Guide for `src/applications`

Apply root guidance from `/home/runner/work/fvtt-system-rqg/fvtt-system-rqg/ai.md` first, then this file for application/dialog work.

## Scope

- AppV2 dialogs and applications under `src/applications/**`
- Shared application parts and form-handling helpers

## Application Rules

1. Follow existing AppV2 patterns (`ApplicationV2`, `HandlebarsApplicationMixin`, `DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, `_onRender`).
2. Keep form behavior consistent with current usage (`form.handler`, `submitOnChange`, `closeOnSubmit`) unless the task requires otherwise.
3. Prefer existing utilities from `src/system/util.ts` for guards, localization, and shared UI behavior.
4. Localize all user-facing titles, labels, and notifications via `localize()` and i18n keys.
5. Hardcoded text is acceptable only for developer-only/internal diagnostics.

## Sync Expectations

- If application templates are added or renamed, update `src/system/loadHandlebarsTemplates.ts`.
- Keep dialog/application TypeScript context in sync with corresponding `.hbs` parts.
- Update targeted tests where practical when behavior logic changes.
