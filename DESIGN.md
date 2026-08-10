---
name: RuneQuest Glorantha (RQG)
description: >
  Design tokens for the RQG Foundry VTT system, extracted from the current
  V2 actor/item sheets. This is a v1 baseline — it canonicalizes values that
  already existed in variables.css/theme.css/actorsheet-v2.css, picking one
  value where the audit found duplicates. See "Known Inconsistencies" for
  what is not yet migrated to these tokens.
colors:
  brand-primary: "#854906"
  brand-accent: "#f3a71e"
  brand-secondary: "#5c8322"
  danger: "#901010"
  info: "#3a8fc1"
  surface: "#3e2723"
  on-surface: "#f7f3e8"
  on-surface-variant: "#efe6d8"
  border-on-surface: "rgba(255, 255, 255, 0.2)"
  input-bg-on-surface: "rgba(255, 255, 255, 0.12)"
  row-hover: "rgba(139, 90, 43, 0.18)"
  row-active: "rgba(139, 90, 43, 0.30)"
  enc-warning: "rgba(255, 100, 0, 0.27)"
  dex-sr-bg: "rgba(255, 227, 65, 0.56)"
  siz-sr-bg: "rgba(43, 215, 43, 0.56)"
  heading-border: "#782e22"
  critical-state-bg: "#620000d0"
  edit-mode-bg: "#007300d0"
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
    backgroundColor: "{colors.brand-secondary}"
    rounded: "{rounded.full}"
  sheet-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  header-divider:
    backgroundColor: "{colors.border-on-surface}"
    height: 1px
  header-input:
    backgroundColor: "{colors.input-bg-on-surface}"
  nav-tab-active:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.on-surface}"
  sr-slider-handle:
    backgroundColor: "{colors.brand-accent}"
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
| `colors.brand-primary` | `--rqg-color-main` |
| `colors.brand-accent` | `--rqg-color-main-bg` |
| `colors.brand-secondary` | `--rqg-secondary-color` |
| `colors.danger` | `--rqg-highlight` |
| `colors.info` | `--rqg-drop-highlight-color` |
| `colors.surface` | `--rqg-color-header-bg` |
| `colors.on-surface` | `--rqg-color-header-text` |
| `colors.on-surface-variant` | `--rqg-color-header-input-text` |
| `colors.border-on-surface` | `--rqg-color-header-border` |
| `colors.input-bg-on-surface` | `--rqg-color-header-input-bg` |
| `colors.row-hover` | `--rqg-row-hover` |
| `colors.row-active` | `--rqg-row-active` |
| `colors.enc-warning` | `--rqg-color-enc-warning` |
| `colors.dex-sr-bg` | `--rqg-color-dex-sr-bg` |
| `colors.siz-sr-bg` | `--rqg-color-siz-sr-bg` |
| `colors.heading-border` | `--rqg-color-heading-border` |
| `colors.critical-state-bg` | `--rqg-color-critical-state-bg` |
| `colors.edit-mode-bg` | `--rqg-color-edit-mode-bg` |
| `rounded.sm` / `DEFAULT` / `md` / `lg` / `xl` / `full` | `--rqg-radius-sm` / `--rqg-radius` / `--rqg-radius-md` / `--rqg-radius-lg` / `--rqg-radius-xl` / `--rqg-radius-full` |

`typography` and `spacing` are not yet exposed as CSS custom properties —
sheet rules reference literal `rem` values directly today. Introducing
`--rqg-font-*` / `--rqg-space-*` variables for them is future work, not a
prerequisite for the current token migration.

## Colors

- **Brand:** `brand-primary` (#854906, dark amber) and `brand-accent`
  (#f3a71e, orange) are the system's signature pair — used for tab accents,
  active-state borders, and the main-bg wash behind headers/legends.
- **Secondary:** `brand-secondary` (#5c8322, olive) marks nature/rune-magic
  adjacent accents (e.g. the encumbrance-totals pill).
- **Semantic:** `danger` (#901010) is reused for both the "wounded" state and
  literal error/invalid indicators — one token, two meanings, which is
  acceptable since they're never shown together. `info` (#3a8fc1) is the
  drag-and-drop highlight color and has no other use.
- **Row interaction:** `row-hover` / `row-active` are the single canonical
  tint for *every* hoverable/clickable row across skills, spells, weapons,
  passions, runes, and reputation — previously this value was duplicated
  ~12 times as a raw `rgb(139 90 43 / 18%)` / `/ 30%)` literal. Anything new
  should reference these tokens, not repeat the literal.
- **Theming:** colors above are the **dark-theme** (Foundry default)
  values, matching `body.theme-dark`. RQG mirrors Foundry's own
  Applications theme setting via `theme.css`'s `.theme-dark`/`.theme-light`
  blocks — see the table below for the light-theme counterparts. (Foundry's
  separate "Interface" theme setting does *not* apply to sheet windows, so
  it has no token here.)

| Token | Dark (canonical) | Light |
|---|---|---|
| `surface` (header bg) | `#3e2723` | `brand-accent` (`#f3a71e`) |
| `on-surface` (header text) | `#f7f3e8` | `#111` (`color-dark-1`) |
| `border-on-surface` | `rgba(255,255,255,0.2)` | `rgba(0,0,0,0.4)` |

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
`:hover`, `row-active` on `:active`, plus an alternating-row background
(`--rqg-table-alternate-background`, theme-dependent) on odd rows. This is
the most duplicated pattern in the codebase and the highest-value target
for consolidating into a shared class/mixin during the redesign.

### Badges & pills

`sr-badge` (DEX/SIZ strike-rank indicators) and `status-pill` share a
rounded-rect-with-inset-border look; `enc-totals-pill` is visually distinct
(full pill, brand-secondary fill) and marks the sticky encumbrance footer.
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
swaps to `brand-primary` (see Colors → Theming).

### Interactive accents

`sr-slider-handle` (the draggable DEX/SIZ strike-order knob) is the one
place `brand-accent` appears as a fill rather than a text/border color.
`drop-highlight` is the pulsing border/overlay shown while dragging an item
onto the sheet. `warning-highlight` is the encumbrance-overload outline/fill
(`.warning` in `rqg.css`, V1 and V2 both).

### Sheet state overlays

`wounded-indicator` (`danger`) marks the hit-location "wounded" border and
the combat "strike" line-through — the same token doubles as the literal
error/invalid color elsewhere (see Colors → Semantic). `sheet-critical-state`
tints the whole sheet when `.dead`/`.unconscious`/`.shock`/`.wounded`, and
`sheet-edit-mode` does the same for `.edit-mode` — both are full-sheet
background overlays, not component-level accents.

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
