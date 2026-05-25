# Guide: AppV2 Sheet and Dialog Changes

Use this guide when changing AppV2 sheets/dialogs in `src/actors/**`, `src/items/**`, or `src/applications/**`.

## Checklist

- Identify the AppV2 class and keep existing lifecycle patterns (`DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, `_onRender`).
- Keep TypeScript context data aligned with referenced `.hbs` templates.
- Keep template registration in `src/system/loadHandlebarsTemplates.ts` aligned with template changes.
- Ensure user-facing UI strings are localized with `localize()` and valid i18n keys.
- Preserve V1/V2 coexistence where applicable; do not remove legacy sheet paths unless explicitly requested.
- Add/update targeted tests when behavior logic changes.
