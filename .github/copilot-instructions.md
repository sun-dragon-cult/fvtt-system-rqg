# Copilot Instructions for this Repository

These instructions are for AI assistants (including GitHub Copilot) working in this repo.

## Source of Truth and Precedence

1. Primary repo-wide guidance: [ai.md](../ai.md)
2. Feature-local guidance overrides root guidance when present (for example [src/actors/ai.md](../src/actors/ai.md) for actor-related work)

When instructions conflict, use the most specific file in the current folder subtree.

## Project Context

- Foundry VTT system: `rqg` (RuneQuest Glorantha)
- Target runtime: Foundry v13
- Main languages: TypeScript, SCSS, Handlebars

## Non-negotiable Rules

- Keep changes minimal and scoped to the request.
- Follow existing code patterns in nearby files.
- Prefer typed code and avoid unnecessary `any`.
- Use `document.system` for system data.
- Use `localize()` from `src/system/util.ts` for player-facing UI text.
- Do not perform unrelated refactors in the same change.

## Validation

Run smallest relevant checks first:

1. `pnpm lint:scripts`
2. `pnpm test` (or targeted tests)
3. `pnpm typecheck`
4. `pnpm build` only when integration/build validation is needed
