---
name: foundry-version-diff
description: Use when preparing RQG for a new Foundry VTT major version (bumping compatibility.verified, "what breaks in v15", auditing the codebase before an upgrade). Diffs the locally installed Foundry source trees, cross-references RQG usage, and produces an upgrade report.
---

# Foundry Version Diff

Find what a Foundry major-version bump breaks in RQG, before it breaks a world.

The Foundry API is the source of truth and it ships the day the build does. `fvtt-types`
lags releases by weeks, so this workflow reads the real Foundry source, never the types.

## When to use

- Targeting a new Foundry major (e.g. raising `compatibility.verified` in `static/system.json`).
- The user asks "what breaks in v15", "is RQG v15-ready", "audit for the Foundry upgrade".
- A Foundry patch release started logging new deprecation warnings.

Not for routine bug work — this is a bump-time audit.

## Prerequisites

Both Foundry majors must be installed locally. Read the app paths from `.env.local`:
`FOUNDRY_V<old>_APP` and `FOUNDRY_V<new>_APP` (the directory containing `main.js`). The
uncompiled `.mjs` source is in `client/` and `common/` under that directory — or under
`resources/app/` on some installs. Probe both; use whichever has `client/client.mjs`.

If the target version isn't in `.env.local`, stop and tell the user to install it and add
`FOUNDRY_V<new>_APP` / `_DATA`, then `pnpm foundry <new>` to confirm it launches.

## Workflow

Run the passes in order. Collect findings as you go; write the report last.

### 1. Deprecation markers in the new source (authoritative enumeration)

Foundry annotates every deprecation at the call site. Grepping the new source enumerates the
**complete** set — including deprecations that only fire on action sequences no one would
reproduce by hand. Pass 5 (runtime) does not discover deprecations; this pass does.

In the **new** version's `client/` and `common/`:

- `grep -rn "logCompatibilityWarning"` — each call names the old API, the replacement, and
  `since` / `until` versions. Anything with `since:` at the new major is a fresh deprecation.
- `grep -rn "@deprecated"` in the same trees.

For each hit, note the deprecated symbol and its removal deadline. This is the master list;
passes 3 and 5 only narrow and confirm it.

### 2. Export-surface diff

Diff the two `client/` + `common/` trees (`diff -rq` for the file list, then targeted diffs).
Focus only on the areas RQG touches:

| Area | RQG code |
|---|---|
| Document classes, `CONFIG.<Doc>.dataModels` | `src/rqg.ts` init, `src/data-model/**` |
| DataModel lifecycle (`prepareBaseData`, `prepareDerivedData`, `_addDataFieldMigrations`, `migrateData`) | `src/data-model/**` |
| ApplicationV2 / sheet API, `PARTS`, `_prepareContext`, form handling | `src/actors/rqg-actor-sheet-v2.ts`, `src/items/rqg-item-sheet-v2.ts`, `src/**/sheet-parts-v2/**` |
| `foundry.data.fields.*` field classes and options | `src/data-model/**`, `buildScripts/generate-schema/**` |
| `ActiveEffect` — change modes, transfer, duration | `src/active-effect/**`, `src/system/migrations/migrations-effect/**` |
| `Roll` subclass contract, `Roll.fromData`, `CONFIG.Dice.rolls` | `src/rolls/**` |
| `ChatMessage` — roll modes, `CONFIG.ChatMessage.modes`, rendering | `src/chat/**` |
| `CONFIG.statusEffects`, `CONFIG.specialStatusEffects` | `src/system/token-status-effects.ts`, `src/system/fvtt-type-compat.ts` |
| Handlebars — `loadTemplates`, `renderTemplate`, built-in helpers | `src/system/load-handlebars-templates.ts`, `src/system/register-handlebars-helpers.ts`, `src/**/*.hbs` |
| `TextEditor` / enrichers | `src/foundry-ui/text-editor-hooks.ts` |
| Hook signatures (`preCreate*`, `render*`, `updateActor`, …) | grep `Hooks.on` / `Hooks.once` in `src/` |
| Manifest schema (`compatibility`, `documentTypes`, `esmodules`, `styles`, `flags`, `packs`, `relationships`) | `static/system.json` |

Note removed exports, renamed classes, moved namespaces, and changed method signatures.

### 3. Cross-reference RQG

For every deprecation (pass 1) and every removal / signature change (pass 2), grep `src/`
for usage and record `file:line`. A change Foundry made that RQG never touches is not a finding.

**Bare globals removed on a schedule.** Foundry exposes legacy globals (`randomID`,
`mergeObject`, `duplicate`, `setProperty`, …) via a shim with its own `until:` version — e.g.
the bare `foundry.utils.*` function globals are shimmed only `until: 14`, then gone. `fvtt-types`
still declares them as ambient globals, so `tsc` stays green while the call is a runtime
`ReferenceError` on the new version. Grep the **old** source for `until: <new>` shims, list
the names, then grep `src/` for bare (un-namespaced) calls to any of them. `fromUuid` /
`fromUuidSync` / `getDocumentClass` are still real globals — check the new source's
`Object.assign(globalThis, …)` block for the current set.

### 4. Manifest check

Compare `static/system.json` against the new version's manifest expectations:

- `compatibility.minimum` / `verified` / `maximum`.
- `documentTypes.<Doc>.<subtype>` — every subtype declared; `htmlFields` lists every
  `HTMLField` / `FilePathField` path (missing entries silently disable enrichment/links).
- `esmodules` / `styles` shape, `flags.hotReload`, `packs` metadata, `relationships`.
- Confirm no `template.json` has reappeared — schema lives only in `defineSchema()`.

### 5. Runtime pass — confirm and rank, don't discover

This pass narrows the pass-1 master list to what RQG actually hits and how easily. It is a
bounded exercise, not an open-ended watch: nobody keeps a session running for a week hoping
warnings surface. The durable record is `docs/foundry-upgrades/v<new>.md`; the exercise below
just tags entries in it.

Ask the user to run `pnpm foundry <new>` + `pnpm dev <new>` on a **copy of a real world** and
work through:

- Open every actor and item sheet type; edit a field on each.
- Roll each roll type (`src/rolls/**`); resolve an attack through the chat flow.
- Combat: add combatants, roll initiative, advance turns.
- Active effects: apply and remove one that changes a `{ value, max }` resource.
- Run `migrateWorld()` on the copied world.
- Drag an item from a compendium onto an actor.

Then paste back console `logCompatibilityWarning` / deprecation lines whose stack frame is in
`systems/rqg/`.

Reconcile against the pass-1 + pass-3 findings:

- Warning already in the findings → mark it **confirmed live**, rank it high.
- Warning **not** in the findings → the static passes had a gap (RQG reaches the API through
  a helper, a dynamic path, or a grep miss). Trace it back, add the call site, note the gap.

## Recurring breakage classes

Check these even when the diff looks quiet. Past reports in `docs/foundry-upgrades/` add more.

- Numeric `ActiveEffect` change modes instead of `CONST.ACTIVE_EFFECT_MODES.*`.
- Bare `mergeObject` / `duplicate` / `getProperty` / `setProperty` / `randomID` globals
  instead of `foundry.utils.*`.
- Removed Handlebars helpers (`{{#select}}`, `{{colorPicker}}`, `{{filePicker}}`).
- Chat roll-mode string keys drifting (`publicroll` → `public`, etc.).
- Whole-array assignment to `CONFIG.statusEffects` (breaks on v12–v13; v14+ made the setter
  mutate in place, so it's a rule with a shelf life — check which version you're on).
- Token bar attributes not pointing at a `{ value, max }` schema node.
- `<form>` nested inside an AppV2 `PARTS` template instead of the sheet root being the form.
- Unawaited `TextEditor.enrichHTML`, or the old `TextEditor` global vs
  `foundry.applications.ux.TextEditor.implementation`.
- `doc.data` instead of `doc.system`; `entity` / `entities` terminology.
- Namespace moves under `foundry.*` (e.g. `loadTemplates` →
  `foundry.applications.handlebars.loadTemplates`).

## Output

**`docs/foundry-upgrades/v<new>.md` is the deliverable.** The chat session is disposable;
this file is the upgrade's working state and is expected to outlive many sessions. Expect to
re-invoke this skill weeks apart — after a fix PR lands, or when the user has been playing on
the `<new>` world and collected more `systems/rqg/` warnings during normal use. Each
invocation reads the existing file, reconciles what's new, and updates it.

The file contains:

- **Header** — Foundry builds diffed (old → new), release-notes link
  (`https://foundryvtt.com/releases/<new>`), date started, current status.
- **Findings**, grouped by severity, most severe first:
  - **Removed / hard break** — throws or silently missing in the new version.
  - **Silent behavior change** — no error, wrong result (the expensive kind).
  - **Deprecated** — still works, `logCompatibilityWarning`, has a removal deadline.

  Each finding: RQG `file:line` · the Foundry change (source path or release-note link) ·
  fix direction · removal deadline if known · state (`open` / `confirmed live` / `fixed #PR`
  / `wontfix — reason`).
- **Runtime log** — a running list of warnings seen during play that are already covered
  above (so a later session knows they're accounted for) and any not-yet-triaged ones.

Never rewrite the header or delete findings on a later pass — update states, append new
findings, move triaged runtime-log entries up. Also read any older `docs/foundry-upgrades/*.md`
at the start of a run: recurring findings there are extra checklist items.

Then give a short **chat summary** — counts by severity, what's newly confirmed since last
run, what's still open — and point at the file for detail.

## Response style

- Update the file first, then lead the chat reply with the summary — not the process narrative.
- Distinguish confirmed (runtime pass, or clear source removal) from suspected (signature
  looks changed, needs a runtime check).
- If a pass can't run (target not installed, source tree layout unexpected), say so and
  continue with the passes that can.
- On a re-invocation, say what changed since the last file update, not the whole picture again.
