---
description: Make an AppV2 sheet or dialog change following the project's conventions.
---

Follow the **AppV2 sheet or dialog changes** workflow in [`AGENTS.md`](../../AGENTS.md#appv2-sheet-or-dialog-changes), plus repository defaults in the rest of that file.

Before finishing, verify:

- TypeScript context data, `.hbs` templates, and template registration in `src/system/load-handlebars-templates.ts` are in sync.
- All user-facing strings are localized via `localize()`.
- Relevant lint / targeted tests / typecheck have been run.
