# design-sync notes

- This repo is a Foundry VTT system (Handlebars templates + `ApplicationV2`),
  not React/Svelte/Vue/Lit, and has no Storybook. Neither the `storybook`
  nor `package` shape applies — there is no bundleable component layer, so
  `package-build.mjs`/`resync.mjs` were never run.
- Synced 2026-08-11 as a **tokens-only** upload, built by hand from
  `src/variables.css` + `src/theme.css` + `DESIGN.md`, no `_ds_bundle.js`,
  no `components/`. Uploaded: `styles.css`, `tokens/tokens.json`,
  `guidelines/DESIGN.md`, `README.md`, `fonts/Norse-KaWl.otf` +
  `NorseBold-2Kge.otf`. No `_ds_sync.json` sidecar — neither shape's hash
  recipe applies, so this is an honest omission; a re-sync should just
  re-diff `DESIGN.md`/`variables.css`/`theme.css` against `tokens/tokens.json`
  and `styles.css` by hand and re-upload what changed.
- Signika (body font) is Foundry's own bundled default, not part of this
  repo, so it isn't in `fonts/`.
