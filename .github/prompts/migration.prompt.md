---
description: Add or modify a world/document migration following the project's conventions.
---

Follow the **World/document migrations** workflow in [`AGENTS.md`](../../AGENTS.md#worlddocument-migrations), plus the system subtree guidance in the same file.

Before finishing, verify:

- The migration is idempotent and GM-safe.
- It is registered in `migrateWorld.ts`.
- User-facing migration report strings are localized.
- Targeted migration tests have been added/updated under `src/system/migrations/migrations-actor/**` or `src/system/migrations/migrations-item/**`.
