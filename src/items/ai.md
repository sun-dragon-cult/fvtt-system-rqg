# AI Development Guide for `src/items`

Apply root guidance from `/home/runner/work/fvtt-system-rqg/fvtt-system-rqg/ai.md` first, then this file for item-related work.

## Scope

- Item classes and lifecycle under `src/items/**`
- Item sheets (AppV1 + AppV2)
- Item-specific utilities and linked item behavior

## Item-Specific Rules

1. Preserve compatibility where AppV1 and AppV2 sheets coexist.
2. Follow established patterns in `RqgItemSheet.ts` and `RqgItemSheetV2.ts` before introducing new abstractions.
3. Use `document.system` data and existing item model types from `src/data-model/item-data/**`.
4. Keep drag/drop and RQID-link behavior consistent with existing helpers in `src/documents/dragDrop.ts` and `src/data-model/shared/rqidLink.ts`.
5. Localize user-facing sheet text and notifications via `localize()`.

## Sync Expectations

- If templates change, verify `src/system/loadHandlebarsTemplates.ts`.
- Keep sheet TypeScript context, `.hbs` templates, and related styles synchronized.
- If item lifecycle behavior changes, add/update targeted tests near the changed logic (for example `src/items/**/**/*.test.ts`).
