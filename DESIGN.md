---
name: RuneQuest Glorantha (RQG)
description: >
  Design tokens for the RQG Foundry VTT system, extracted from the current
  V2 actor/item sheets. This is a v1 baseline — it canonicalizes values that
  already existed in variables.css/theme.css/actorsheet-v2.css, picking one
  value where the audit found duplicates. See "Known Inconsistencies" for
  what is not yet migrated to these tokens.
colors:
  primary: "#854906"
  accent: "#f3a71e"
  secondary: "#5c8322"
  danger: "#901010"
  info: "#3a8fc1"
  surface: "#3e2723"
  on-surface: "#f7f3e8"
  on-surface-variant: "#efe6d8"
  border-on-surface: "rgba(255, 255, 255, 0.2)"
  input-bg-on-surface: "rgba(255, 255, 255, 0.12)"
  input-border-on-surface: "rgba(255, 255, 255, 0.25)"
  row-hover: "rgba(139, 90, 43, 0.18)"
  row-active: "rgba(139, 90, 43, 0.30)"
  enc-warning: "rgba(255, 100, 0, 0.27)"
  dex-sr-bg: "rgba(255, 227, 65, 0.56)"
  siz-sr-bg: "rgba(43, 215, 43, 0.56)"
  heading-border: "#782e22"
  critical-state-bg: "#620000d0"
  edit-mode-bg: "#007300d0"
  row-alternate: "rgba(255, 255, 255, 0.05)"
  enc-bg: "#3d2e14"
  enc-legend: "#4a3820"
  hl-stats-bg: "#1a1a1ab3"
  hl-stats-bg-severed: "#3a3a3a"
  wounded-bg: "#ff400030"
  wounded-border: "#cc8060"
  health-state: "#ff6b6b"
  sr-button-bg: "#4a3820"
  unassigned-rm-bg: "#d9c8aa"
  unassigned-rm-border: "#7b6245"
  unassigned-rm-text: "#1f1204"
  unassigned-rm-action: "#3a2208"
  tree-border-strong: "#8f6a32"
  income-skill-bg: "#4a3820"
  income-skill-border: "#7b6245"
typography:
  heading-lg:
    fontFamily: "Norse, Signika, 'Palatino Linotype', serif"
    fontSize: 2rem
    fontWeight: "700"
    letterSpacing: 1.5px
  heading-md:
    fontFamily: "Norse, Signika, 'Palatino Linotype', serif"
    fontSize: 1.5rem
    fontWeight: "700"
    letterSpacing: 1.5px
  heading-sm:
    fontFamily: "Norse, Signika, 'Palatino Linotype', serif"
    fontSize: 1.25rem
    fontWeight: "700"
    letterSpacing: 1.5px
  charname-display:
    fontFamily: Signika
    fontSize: 2.1875rem
    fontWeight: "700"
  body-lg:
    fontFamily: Signika
    fontSize: 1rem
    fontWeight: "400"
  body-md:
    fontFamily: Signika
    fontSize: 0.875rem
    fontWeight: "400"
  body-sm:
    fontFamily: Signika
    fontSize: 0.75rem
    fontWeight: "400"
  label:
    fontFamily: Signika
    fontSize: 0.75rem
    fontWeight: "600"
    letterSpacing: 0.06em
rounded:
  sm: 0.1875rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.625rem
  xl: 0.875rem
  full: 9999px
spacing:
  unit: 0.125rem
  1: 0.125rem
  2: 0.25rem
  3: 0.375rem
  4: 0.5rem
  6: 0.75rem
  8: 1rem
  12: 1.5rem
components:
  table-row:
    backgroundColor: transparent
    padding: "{spacing.2}"
  table-row-hover:
    backgroundColor: "{colors.row-hover}"
  table-row-active:
    backgroundColor: "{colors.row-active}"
  status-pill:
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  sr-badge:
    rounded: "{rounded.md}"
    padding: "{spacing.4} {spacing.2}"
  sr-badge-dex:
    backgroundColor: "{colors.dex-sr-bg}"
  sr-badge-siz:
    backgroundColor: "{colors.siz-sr-bg}"
  cult-tab:
    backgroundColor: "{colors.row-active}"
    rounded: "{rounded.md} {rounded.md} 0 0"
  cult-tab-active:
    backgroundColor: transparent
  enc-totals-pill:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.full}"
  sheet-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  header-divider:
    backgroundColor: "{colors.border-on-surface}"
    height: 1px
  header-input:
    backgroundColor: "{colors.input-bg-on-surface}"
  header-input-border:
    backgroundColor: "{colors.input-border-on-surface}"
    height: 1px
  nav-tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-surface}"
  sr-slider-handle:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
  heading-underline:
    backgroundColor: "{colors.heading-border}"
    height: 2px
  drop-highlight:
    backgroundColor: "{colors.info}"
  warning-highlight:
    backgroundColor: "{colors.enc-warning}"
  wounded-indicator:
    backgroundColor: "{colors.danger}"
  sheet-critical-state:
    backgroundColor: "{colors.critical-state-bg}"
  sheet-edit-mode:
    backgroundColor: "{colors.edit-mode-bg}"
  table-row-alternate:
    backgroundColor: "{colors.row-alternate}"
  enc-panel:
    backgroundColor: "{colors.enc-bg}"
  enc-panel-legend:
    backgroundColor: "{colors.enc-legend}"
  hl-stats-chip:
    backgroundColor: "{colors.hl-stats-bg}"
    rounded: "{rounded.md}"
  hl-stats-chip-severed:
    backgroundColor: "{colors.hl-stats-bg-severed}"
  hit-location-wounded:
    backgroundColor: "{colors.wounded-bg}"
  hit-location-wounded-border:
    backgroundColor: "{colors.wounded-border}"
    height: 2px
  health-state-indicator:
    backgroundColor: "{colors.health-state}"
  sr-button:
    backgroundColor: "{colors.sr-button-bg}"
    rounded: "{rounded.md}"
  unassigned-rune-magic-slot:
    backgroundColor: "{colors.unassigned-rm-bg}"
    textColor: "{colors.unassigned-rm-text}"
  unassigned-rune-magic-border:
    backgroundColor: "{colors.unassigned-rm-border}"
    height: 1px
  unassigned-rune-magic-action:
    textColor: "{colors.unassigned-rm-action}"
  tree-divider:
    backgroundColor: "{colors.tree-border-strong}"
    height: 1px
  income-skill-row:
    backgroundColor: "{colors.income-skill-bg}"
  income-skill-row-border:
    backgroundColor: "{colors.income-skill-border}"
    height: 1px
---

## Brand & Style

RQG's V2 sheets read as an object sitting on parchment inside a dark wooden
frame — warm browns and amber accents, a serif small-caps display face for
headings, and Signika for everything functional. The tone is "well-worn
game table," not clean SaaS: textures (parchment background, wood-grain
window chrome) and slightly rough edges (double borders, drop shadows) are
intentional, not incidental.

## Naming Convention

Tokens above are documented by semantic name (e.g. `colors.row-hover`); the
codebase exposes them as CSS custom properties in `variables.css`/`theme.css`,
all prefixed `--rqg-`. There is no stricter mechanical rule than that — the
existing pre-V2 variables already mix `--rqg-color-main`, `--rqg-highlight`,
and `--rqg-secondary-color` for what would all be "brand/semantic colors" if
transcribed 1:1 from this doc, so migration PRs keep each token's existing
CSS name rather than renaming it to match the doc, and pick a plain
descriptive name (not a mechanical `--rqg-color-<key>` transcription) for new
ones. The table below is the source of truth for which is which:

| Token | CSS custom property |
|---|---|
| `colors.primary` | `--rqg-color-main` |
| `colors.accent` | `--rqg-color-main-bg` |
| `colors.secondary` | `--rqg-secondary-color` |
| `colors.danger` | `--rqg-highlight` |
| `colors.info` | `--rqg-drop-highlight-color` |
| `colors.surface` | `--rqg-color-header-bg` |
| `colors.on-surface` | `--rqg-color-header-text` |
| `colors.on-surface-variant` | `--rqg-color-header-input-text` |
| `colors.border-on-surface` | `--rqg-color-header-border` |
| `colors.input-bg-on-surface` | `--rqg-color-header-input-bg` |
| `colors.input-border-on-surface` | `--rqg-color-header-input-border` |
| `colors.row-hover` | `--rqg-row-hover` |
| `colors.row-active` | `--rqg-row-active` |
| `colors.enc-warning` | `--rqg-color-enc-warning` |
| `colors.dex-sr-bg` | `--rqg-color-dex-sr-bg` |
| `colors.siz-sr-bg` | `--rqg-color-siz-sr-bg` |
| `colors.heading-border` | `--rqg-color-heading-border` |
| `colors.critical-state-bg` | `--rqg-color-critical-state-bg` |
| `colors.edit-mode-bg` | `--rqg-color-edit-mode-bg` |
| `colors.row-alternate` | `--rqg-table-alternate-background` |
| `colors.enc-bg` | `--rqg-color-enc-bg` |
| `colors.enc-legend` | `--rqg-color-enc-legend` |
| `colors.hl-stats-bg` | `--rqg-color-hl-stats-bg` |
| `colors.hl-stats-bg-severed` | `--rqg-color-hl-stats-severed-bg` |
| `colors.wounded-bg` | `--rqg-color-wounded-bg` |
| `colors.wounded-border` | `--rqg-color-wounded-border` |
| `colors.health-state` | `--rqg-color-health-state` |
| `colors.sr-button-bg` | `--rqg-color-sr-button-bg` |
| `colors.unassigned-rm-bg` | `--rqg-unassigned-rm-bg` |
| `colors.unassigned-rm-border` | `--rqg-unassigned-rm-border` |
| `colors.unassigned-rm-text` | `--rqg-unassigned-rm-text` |
| `colors.unassigned-rm-action` | `--rqg-unassigned-rm-action` |
| `colors.tree-border-strong` | `--rqg-tree-border-strong` |
| `colors.income-skill-bg` | `--rqg-income-skill-bg` |
| `colors.income-skill-border` | `--rqg-income-skill-border` |
| `rounded.sm` / `DEFAULT` / `md` / `lg` / `xl` / `full` | `--rqg-radius-sm` / `--rqg-radius` / `--rqg-radius-md` / `--rqg-radius-lg` / `--rqg-radius-xl` / `--rqg-radius-full` |

`typography` and `spacing` are not yet exposed as CSS custom properties —
sheet rules reference literal `rem` values directly today. Introducing
`--rqg-font-*` / `--rqg-space-*` variables for them is future work, not a
prerequisite for the current token migration.

## Colors

- **Brand:** `primary` (#854906, dark amber) and `accent` (#f3a71e, orange)
  are the system's signature pair — used for tab accents, active-state
  borders, and the main-bg wash behind headers/legends. `secondary`
  (#5c8322, olive) marks nature/rune-magic-adjacent accents (e.g. the
  encumbrance-totals pill).
- **Semantic:** `danger` (#901010) is reused for both the "wounded" state and
  literal error/invalid indicators — one token, two meanings, which is
  acceptable since they're never shown together. `info` (#3a8fc1) is the
  drag-and-drop highlight color and has no other use.
- **Row interaction:** `row-hover` / `row-active` are the single canonical
  tint for *every* hoverable/clickable row across skills, spells, weapons,
  passions, runes, and reputation — previously this value was duplicated
  ~12 times as a raw `rgb(139 90 43 / 18%)` / `/ 30%)` literal. Anything new
  should reference these tokens, not repeat the literal.
### Theming — Dark and Light

RQG mirrors Foundry's own Application theme setting via `theme.css`'s
`.theme-dark`/`.theme-light` blocks. (Foundry's separate "Interface" theme
setting does *not* apply to sheet windows, so it has no token here.) The
mechanism is exactly what you'd want: each row below is *one* CSS custom
property, referenced once by consuming rules, whose value is set inside
`.theme-dark { }` and set again (differently, for the rows that vary)
inside `.theme-light { }` — no duplicate variables, no JS, the cascade
does the swap. Several rows resolve to *another* token rather than their
own literal (`wounded-border`'s light value is literally
`var(--rqg-highlight)` in the CSS, i.e. `danger`) — those are written as
`= token-name` below rather than restated as a hex.

Dark is Foundry's default, which is why the `colors:` frontmatter above
records it — a practical choice (it matches a fresh install and what
`export` emits), **not** a claim that dark is the "real" design and light
a fallback. Every color token in this doc gets a row below, whether or not
it actually varies, so nothing is silently constant-by-omission:

| Token | Dark | Light | Varies |
|---|---|---|:---:|
| `primary` | `#854906` | `#854906` | — |
| `accent` | `#f3a71e` | `#f3a71e` | — |
| `secondary` | `#5c8322` | `#5c8322` | — |
| `danger` | `#901010` | `#901010` | — |
| `info` | `#3a8fc1` | `#3a8fc1` | — |
| `surface` (header bg) | `#3e2723` | = `accent` (`#f3a71e`) | ✓ |
| `on-surface` (header text) | `#f7f3e8` | `#111` | ✓ |
| `on-surface-variant` (header input text) | `#efe6d8` | `#222` | ✓ |
| `border-on-surface` (header rule) | `rgba(255,255,255,0.2)` | `rgba(0,0,0,0.4)` | ✓ |
| `input-bg-on-surface` (header input fill) | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.1)` | ✓ |
| `input-border-on-surface` | `rgba(255,255,255,0.25)` | `#666` | ✓ |
| `row-hover` | `rgba(139,90,43,0.18)` | `rgba(139,90,43,0.18)` | — |
| `row-active` | `rgba(139,90,43,0.30)` | `rgba(139,90,43,0.30)` | — |
| `enc-warning` | `rgba(255,100,0,0.27)` | `rgba(255,100,0,0.27)` | — |
| `dex-sr-bg` (DEX strike-rank badge) | `#ffe34190` | `#f2ff009e` | ✓ |
| `siz-sr-bg` (SIZ strike-rank badge) | `#2bd72b90` | `#15ff1f5e` | ✓ |
| `heading-border` | `#782e22` | `#782e22` | — |
| `critical-state-bg` | `#620000d0` | `#620000d0` | — |
| `edit-mode-bg` | `#007300d0` | `#007300d0` | — |
| `row-alternate` (odd-row tint) | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.08)` | ✓ |
| `enc-bg` (encumbrance panel) | `#3d2e14` | `#d8b16e` | ✓ |
| `enc-legend` | `#4a3820` | `#e4cc9d` | ✓ |
| `hl-stats-bg` (hit-location stat chip) | `#1a1a1ab3` | `#ffffffb3` | ✓ |
| `hl-stats-bg-severed` | `#3a3a3a` | `#afafaf` | ✓ |
| `wounded-bg` (hit-location fill) | `#ff400030` | = `enc-warning` (`#ff640045`) | ✓ |
| `wounded-border` | `#cc8060` | = `danger` (`#901010`) | ✓ |
| `health-state` | `#ff6b6b` | = `danger` (`#901010`) | ✓ |
| `sr-button-bg` | `#4a3820` | `#e1c794` | ✓ |
| `unassigned-rm-bg` (unclaimed rune-magic slot) | `#d9c8aa` | `#f0e8d0` | ✓ |
| `unassigned-rm-border` | `#7b6245` | `#a8926b` | ✓ |
| `unassigned-rm-text` | `#1f1204` | `#2f1f07` | ✓ |
| `unassigned-rm-action` | `#3a2208` | `#5a3a10` | ✓ |
| `tree-border-strong` | `#8f6a32` | `#7b5a29` | ✓ |
| `income-skill-bg` (training/research row) | `#4a3820` | `#e4cc9d` | ✓ |
| `income-skill-border` | `#7b6245` | `#a8926b` | ✓ |

24 of 35 color tokens vary by theme; 11 are genuinely constant (`theme.css`
defines them once, with no `.theme-dark`/`.theme-light` override).

Two related swaps live outside this table because they aren't `colors:`
tokens themselves: `theme.css` also swaps `--rqg-income-skill-text` between
Foundry's own `color-light-1`/`color-dark-1` — the same pair `on-surface`
already resolves to, so it's another consumer of `on-surface`'s swap, not a
distinct token. And the header's active-tab pair (`nav-tab-active`, under
Components) swaps which of `accent`/`primary` is the fill and which of
`on-surface`'s two values is the text — see Components → Header chrome for
why. A handful of `--rqg-v2-*` blend-mode/filter values also flip per
theme but aren't colors, so they're outside this table too.

## Typography

Two families, two jobs:

- **Norse** (falling back to Signika, then Palatino Linotype serif) is used
  exclusively for headings (`h1`–`h6`), always with `font-variant: small-caps`
  and `1.5px` letter-spacing. Never used for body text or inputs.
- **Signika** is Foundry's own default and is used for everything else:
  labels, inputs, table cells.

All sizes are expressed in `rem`, not `px`. This is deliberate: Foundry's
"Font Size" accessibility slider (User Interface Configuration) sets the
root `<html>` `font-size` directly, so `rem`-based type scales
automatically with it, while `px`-based type does not. The current
stylesheets mix both (`--font-size-*` Foundry tokens are px, and several
sheet-specific declarations hardcode `px`), which is the root cause of the
"fonts don't all scale together" issue observed when adjusting that slider.
Migrating remaining `px` font-sizes onto this scale resolves it without any
new settings UI.

## Layout & Spacing

Spacing values collapse onto a `0.125rem` (2px) base unit — the audit found
gaps/padding scattered across `2px, 3px, 4px, 5px, 6px, 8px, 0.25rem,
0.3rem, 0.5rem, 0.55rem, 0.75rem`, which are really 5–6 intended sizes
expressed inconsistently. The scale above canonicalizes to the nearest step;
new spacing should pick from it rather than adding another one-off value.

Grid-based layouts (skill/weapon/gear tables) use fixed `px`/`ch` column
widths for icon and number columns — these stay in `px`/`ch` deliberately,
since they size to glyph/icon dimensions, not to the type scale.

## Shapes

`rounded` collapses the observed radii (`3px, 4px, 6px, 9px, 10px, 14px`)
into a five-step scale plus `full` for pills (the encumbrance-totals
footer is the only current pill use). Most interactive chrome (inputs,
cult tabs, status pills) sits at `sm`–`md`; larger decorative containers
(profile portrait frame, rune-magic cult sections) use `lg`–`xl`.

## Components

### Table rows

Every V2 item list (skills, spells, weapons, passions, runes, reputation)
shares one interaction pattern: transparent at rest, `row-hover` on
`:hover`, `row-active` on `:active`, plus `table-row-alternate`
(`row-alternate`, themed — see Theming) on odd rows. This is the most
duplicated pattern in the codebase and the highest-value target for
consolidating into a shared class/mixin during the redesign.

### Badges & pills

`sr-badge` (DEX/SIZ strike-rank indicators) and `status-pill` share a
rounded-rect-with-inset-border look; `enc-totals-pill` is visually distinct
(full pill, secondary fill) and marks the sticky encumbrance footer.
`sr-badge-dex` / `sr-badge-siz` are the same shape with a stat-specific fill
(`dex-sr-bg` yellow, `siz-sr-bg` green) so the two strike-rank badges stay
visually distinct at a glance.

### Header chrome

`sheet-header` (`surface` bg / `on-surface` text) is the branded bar at the
top of every item sheet — see the Colors section's dark/light table for its
themed counterparts. `header-divider` is the hairline border between the
header and body, and `header-input` is the translucent-overlay treatment for
any input field sitting directly on the header background. `nav-tab-active`
covers the header's active-tab styling in light theme, where the accent role
swaps to `primary` (see Colors → Theming).

### Interactive accents

`sr-slider-handle` (the draggable DEX/SIZ strike-order knob) is the one
place `accent` appears as a fill rather than a text/border color.
`drop-highlight` is the pulsing border/overlay shown while dragging an item
onto the sheet. `warning-highlight` is the encumbrance-overload outline/fill
(`.warning` in `rqg.css`, V1 and V2 both). `sr-button` (themed —
`sr-button-bg`) is the strike-rank action button background, distinct from
the DEX/SIZ badges above.

### Sheet state overlays

`wounded-indicator` (`danger`) marks the hit-location "wounded" border and
the combat "strike" line-through — the same token doubles as the literal
error/invalid color elsewhere (see Colors → Semantic). `sheet-critical-state`
tints the whole sheet when `.dead`/`.unconscious`/`.shock`/`.wounded`, and
`sheet-edit-mode` does the same for `.edit-mode` — both are full-sheet
background overlays, not component-level accents.

### Encumbrance & hit-location chrome

`enc-panel` / `enc-panel-legend` are the encumbrance section's own
background and fieldset-legend fill (themed — distinct from
`enc-totals-pill`, which is the sticky footer). `hl-stats-chip` /
`hl-stats-chip-severed` are the hit-location stat overlay's normal and
useless/severed backgrounds (themed). `hit-location-wounded` /
`hit-location-wounded-border` are the wounded hit-location's fill and
border (themed — the border resolves to `danger` in light theme, see
Theming); `health-state-indicator` (`health-state`, themed) colors the
health-state icon.

### Slot & row chrome

`unassigned-rune-magic-slot` (bg + text), `unassigned-rune-magic-border`,
and `unassigned-rune-magic-action` style an unclaimed rune-magic slot
(themed throughout). `income-skill-row` / `income-skill-row-border` do the
same for a training/research income-skill row — `income-skill-border`
currently duplicates `unassigned-rm-border`'s exact value in both themes,
see Known Inconsistencies. `tree-divider` (`tree-border-strong`, themed) is
the stronger divider used in tree/hierarchy layouts (e.g. hit-location
grouping).

### Cult tabs

The gear/rune-magic sub-navigation (`nav.cult-tabs`, `nav.gear-tabs`) uses
a browser-tab metaphor: rounded-top inactive tabs on a tinted background,
transparent + bold for the active tab. Distinct from the main vertical
sheet-navigation, which uses a different pattern (rotated text, colored
border edges) inherited from V1.

### Rune strength indicators

`img.rune.rune-str-0` through `-10` scale opacity (0.05–1.0) and transform
`scale()` (0.55–1.1) together to represent rune strength visually. This is
an RQG-specific continuous scale, not a discrete token set — documented
here as a named pattern rather than enumerated tokens.

## Known Inconsistencies (not yet migrated)

Carried over from the pre-redesign audit — resolve these by replacing the
literal with the token above, not by adding new one-off values:

- Raw `rgb(139 90 43 / 18%)` / `/ 30%)` still appear as literals in several
  rules instead of `colors.row-hover` / `colors.row-active`.
- `#901010` appears as a literal in `actorsheet-v2.css` (combat "strike"
  and "wounded-border") even though `colors.danger` already exists.
- Heading border color `#782e22` (h1/h2/h3 underlines) now has a token
  (`colors.heading-border`); migrating the `actorsheet-v2.css` literal to it
  is tracked by #971.
- State backgrounds for dead/unconscious/wounded/shock (`#620000d0`) and
  edit-mode (`#007300d0`) now have tokens (`colors.critical-state-bg`,
  `colors.edit-mode-bg`); migrating the literals is tracked by #971.
- Font sizes still mix `px`, Foundry's px-based `--font-size-*`, keyword
  sizes (`small`, `x-small`), and the `rem` scale above.
- Border-radius values outside the `rounded` scale still appear ad hoc in
  a few places (e.g. `50px` used directly instead of `rounded.full`).
- `income-skill-border` (`--rqg-income-skill-border`) duplicates
  `unassigned-rm-border`'s exact value in both themes (`#7b6245` dark,
  `#a8926b` light) — worth collapsing to one token once a shared name is
  picked, rather than two identically-valued CSS variables.
