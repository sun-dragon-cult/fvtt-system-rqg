# Handoff: #1171 damage and healing (6.2.0)

_2026-10-11, branch `feat/1171-heal-wounds-dialog`_

## What we were working on

#1171 adds public damage and healing methods on actors, for spells and modules. It is the first item of the 6.2.0 milestone order:

1. #1171 damage/heal
2. #1132 roll methods and hooks
3. #1170 step 6 spells, then #1178 Reflection
4. #1134, #1135–#1137, #1128

The work is in four open PRs, to be merged in this order:

| PR | Branch | Contents |
| --- | --- | --- |
| [#1180](https://github.com/sun-dragon-cult/fvtt-system-rqg/pull/1180) | `feat/1171-damage-heal` (base `main`) | `actor.damage` / `actor.heal`, `distributeHealing`, removing `applyDamage` / `applyWound` / `healWound` |
| [#1181](https://github.com/sun-dragon-cult/fvtt-system-rqg/pull/1181) | `feat/1171-heal-wounds-dialog` (base #1180) | The heal dialog for every wounded location, the `chooseWounds` API dialog, the `rqg-dot-picker` element |
| wiki [#38](https://github.com/sun-dragon-cult/fvtt-module-wiki-rqg-private/pull/38) | `feat/1171-heal-behaviours` | Heal, Heal Wound and Heal Body spell behaviours, in `module/scripts/spells/heal.mjs` |
| docs [#21](https://github.com/sun-dragon-cult/sun-dragon-cult.github.io/pull/21) | `docs/rqg-6.2.0-release-notes` | 6.2.0 release notes: the "Healing" section and "Changes that can break macros" |

## Decisions and why

- **No back-compat shim for `applyDamage`.** The old methods are removed, and the release notes name the replacements. Nothing unreleased gets fallbacks.
- **`damage({ amount, location, armorPoints?, applyToTotalHp?, … })`.**
  - `armorPoints` defaults to the location's own armor. It replaced `ignoreArmor` so that armor is subtracted only inside `damage()`.
  - The Add Wound dialog passes the armor the user chose. The attack flow passes `armorPoints: 0` when the defender's armor is ignored.
- **`heal({ location, points | "all", wound?, restoreSevered? })`.**
  - `wound` is an index into `system.wounds`. Without it, points go to the worst wound first (Core p.314 example), via `distributeHealing`.
  - `restoreSevered` defaults to a 6+ point heal (Core p.148). `points: "all"` never reattaches unless asked. This default lives only in `actor.heal`; `HealingCalculations.healWound` requires the argument.
  - A reattached limb whose damage is still at or above its max HP becomes "useless", not "wounded".
  - `heal()` skips the actor update when nothing was healed.
- **Rules for each kind of healing:**

  | Healing | Mode | Rule |
  | --- | --- | --- |
  | Heal (spirit magic, RBM p.115) | `location` | Points go to one location and spill over its wounds. |
  | Heal Wound (rune magic, RBM p.56) | `split` | Points equal MP spent and can be split over wounds anywhere. |
  | Heal Body | — | Heals everything and reattaches. |
  | First Aid (Core p.177) and the sheet dialog | single wound | Never more than that one wound. |

  "6 points reattaches a severed limb" is offered as a Reattach checkbox, one per cast.
- **The sheet's heal dialog is an `ApplicationV2` class (`HealWoundsApp`), not `DialogV2`.**
  - It stays open over several heals, which `DialogV2.wait` (a one-shot prompt) fought.
  - It registers on `actor.apps` in `_onFirstRender` and unregisters in `_onClose`, exactly as `DocumentSheetV2` does.
  - `_canRender` returns false while a heal is applied or animated. That also blocks a double-click from healing twice.
  - Cancel uses core's `data-action="close"`.
- **`chooseWounds` stays a `DialogV2.wait` prompt.** It resolves once, and loops with a fresh dialog if the wounds changed while it was open.
- **Stale-wounds guard.**
  - The template stamps `data-wounds-snapshot`. On submit, a mismatch means "warn and redraw" (sheet dialog) or "ask again" (`chooseWounds`).
  - The snapshot is sorted by location id, so the `sortHitLocationsLowToHigh` setting doesn't trigger it.
  - It exists because wounds are bare numbers without ids (see #438).
- **The dots are a web component, `rqg-dot-picker`, built on `AbstractFormInputElement`.**
  - It's form-associated, so `FormDataExtended` reads it.
  - It's registered at init in `src/rqg.ts`.
- **Points lines.** Every mode tells the user about their points:
  - split and location modes: "x of y points left";
  - any mode where points can't be used: "x of y points have nothing to heal".
- **Spell rules live in the wiki module, not the system.** A behaviour is registered by spell rqid through `rqg.registerSpellBehaviours`. The system only provides the API (`game.system.api.dialogs.chooseWounds`, `actor.heal`). When a system API is built "for spells", ship the spells in the same round.

## Current state

- **System PRs:**
  - #1180 is at `548bc770`.
  - #1181 is at `f18b2196` plus this handoff, and has #1180 merged in.
  - Both are pushed, with clean trees.
  - `pnpm check:ci` passes (1056 unit tests).
  - `tests/e2e/actor-damage-heal.spec.ts` passes (2 tests) on port 30001, in both the `e2e-playwright` world and the user's own world.
- **Wiki #38** is at `566bc3f`, and the wiki `dist` build is current.
- **Docs #21** is at `e3ca03e`. Its release notes use `armorPoints`.
- **Merge gate:** #1180 shows REVIEW_REQUIRED/BLOCKED. That's normal; the user approves and merges.

## Broken or unfinished

- **This HANDOFF.md is committed on the #1181 branch.** Delete it before the squash merge unless it should land in `main`.
- **Not done on purpose:**
  - "Heal all" makes about two server round trips per wounded location. Batching it needs a multi-location `heal()` API.
  - Snapshots are recomputed a few times per click. It's cheap.
- **API reference pages** on the docs site still lack `actor.damage` / `actor.heal` / `dialogs.chooseWounds`. That fits #1134.
- **The fix for "Add Wound with no actor" and the NaN check before the random location roll** were not exercised live; only their few lines were reviewed.

## Next steps

1. The user merges #1180, then #1181 (deleting this file first?), then wiki #38. Docs #21 goes with the 6.2.0 release.
2. Start #1132 (roll methods and hooks). Read the issue comments first:
   - the projectile spells move to a `rqg.attack` hook;
   - pre-hooks can add modifiers;
   - a "spell reaches target" hook;
   - skill behaviours. First Aid fits `chooseWounds` single mode plus `actor.heal`. `rqg.abilityRoll` should pass the skill, actor, success level, roll and targets. A separate skill-behaviour registry is proposed ([comment](https://github.com/sun-dragon-cult/fvtt-system-rqg/issues/1132#issuecomment-6110335520)).
3. Then #1170 step 6, then #1178 Reflection.
4. Later: #438 wound metadata. Its [plan comment](https://github.com/sun-dragon-cult/fvtt-system-rqg/issues/438#issuecomment-6108027912) covers wound ids, which would remove the snapshot guard. `heal({ wound })` can widen to `number | string` without breaking anything.

## Things learned about this codebase

- **Dev setup:**
  - Browse **port 30001** (the Vite dev server).
  - Foundry's own port, 30014, serves a stale `dist/`.
  - `pnpm dev` fails until Foundry (`pnpm foundry`) is up.
  - Foundry has an admin password the agent doesn't know. If no world is active (`curl localhost:30014/api/status`), ask the user to launch one.
- **e2e:**
  - Command: `FOUNDRY_PORT=30001 E2E_GM_USER=<user> E2E_GM_PASSWORD="" npx playwright test <spec>`.
  - The user is `AssistantGamemaster` in the `e2e-playwright` world, or `Assistant GM` in the user's world.
  - Wait for `game.ready`.
  - Playwright actions have **no timeout** here, so a missing or blocked locator hangs. Give throwaway specs `{ timeout }`.
  - Foundry's main menu can already be open and swallow clicks. Call `ui.menu.close()` first.
  - Use temporary actors and delete them, and their chat messages filtered by actor id, in `finally`. Never touch the user's own documents or cards.
- **DialogV2 traps (Foundry v14):**
  - String `content` goes through `cleanHTML` and its fixed tag allowlist, which silently drops system custom elements like `rqg-dot-picker`. Pass an `HTMLDivElement` instead (`dialogContent()`).
  - The `render` callback runs *after* DialogV2 rebuilds its first content.
  - `DialogV2.wait` resolves at the first submit even with `closeOnSubmit: false`.
  - `dialog.options` is frozen.
- **ApplicationV2:**
  - Core handles the actions `close`, `tab` and `toggleControls` itself.
  - `this.form` returns the form when `tag: "form"`.
  - `templates/generic/form-footer.hbs` renders `autofocus` from a button's `default`, which isn't in fvtt-types' `FormFooterButton`.
  - Removing `contentClasses: ["standard-form"]` breaks the footer layout.
  - A system CSS rule `& form` doesn't match an app whose root element *is* the form; add `&:is(form) > .window-content`.
- **Typecheck:**
  - `tsc` needs `NODE_OPTIONS=--max-old-space-size=8192`.
  - Running it alongside Foundry, Vite and e2e may be what crashed WSL once. Run heavy jobs one at a time.
- **Pre-push hook:** it runs typecheck, the English i18n unused-key audit and vitest. Unused i18n keys fail the push.
- **Git conventions:**
  - Conventional commits.
  - The wiki repo's commitlint wants a lowercase subject.
  - `gh pr edit` fails (Projects classic deprecation); use `gh api -X PATCH repos/<owner>/<repo>/pulls/<n>`.
  - No `Claude-Session:` trailer in commits or PRs.
- **Stacked PRs:** keep API changes on the #1180 branch and merge it into #1181. A worktree in the scratchpad avoids disturbing the dev server's checkout.
- **Rules:** cite pages from the `RQG_RULES_DOCS` clone (`books/core/core-skills-p163-190.md` has First Aid at p.176-177).
