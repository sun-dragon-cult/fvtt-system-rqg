# Guide: Migration Changes

Use this guide when modifying world/document migrations in `src/system/migrations/**`.

## Checklist

- Keep migrations idempotent and safe if run multiple times.
- Ensure migration entry points remain GM-safe and non-GM behavior is explicit.
- Keep migration user messaging and reports localized.
- Follow existing logging and notification patterns in `migrateWorld.ts`.
- Add/update targeted migration tests in matching migration test files.
- Avoid broad refactors in the same change; isolate migration behavior updates.
