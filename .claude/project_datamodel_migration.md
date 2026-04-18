---
name: Foundry DataModel migration plan
description: Migration plan to convert all item and actor types from template.json/interfaces to Foundry TypeDataModel classes, with current progress tracked
type: project
originSessionId: d752dd76-404b-4d22-91cc-c467c451a061
---

## Goal

Migrate all item and actor data types from legacy template.json + TypeScript interfaces to Foundry's TypeDataModel API for schema validation, type safety, built-in migration support, and data preparation hooks.

**Why:** TypeDataModel provides runtime schema validation, `migrateData()` for data migrations, and `prepareBaseData()`/`prepareDerivedData()` hooks that can eventually replace the current ResponsibleItemClass pattern.

## Approach

Items first (one subtype at a time, grouped by similarity), then actor.

## Progress (as of 2026-04-18)

### Completed - All 12 item DataModels created and registered

- **Shared helpers:** `resourceSchemaField.ts`, `spellSchemaFields.ts` (plus pre-existing `physicalItemSchemaFields`, `abilitySchemaFields`, `rqidLinkField`)
- **Phase 1 (Physical):** GearDataModel (pre-existing), ArmorDataModel, WeaponDataModel
- **Phase 2 (Ability):** SkillDataModel, PassionDataModel, RuneDataModel
- **Phase 3 (Magic):** RuneMagicDataModel, SpiritMagicDataModel
- **Phase 4 (Complex):** CultDataModel, HitLocationDataModel, HomelandDataModel, OccupationDataModel
- All registered in `rqgItem.ts` via `CONFIG.Item.dataModels[type]`
- Build, lint, and all 234 tests pass

### Not yet started

- **Phase 5: Actor — Character** DataModel (`characterDataModel.ts` + `RqgActorDataModel.ts` base class, move prepareBaseData/prepareDerivedData from rqgActor.ts)
- **Refactor CombatChatMessage schema** — Extract fields into modular helpers (e.g., `combatManeuverSchemaField()`, `weaponRollSchemaField()`) following the item type pattern for consistency and reusability
- TypeScript type cleanup: replace old interfaces with DataModel-derived types, update `global.d.ts` DataModelConfig to eliminate `as any` casts
- Remove `template.json` entries (Foundry supports both simultaneously)
- Data migrations via `migrateData()` if needed

## Key patterns learned

- All schemas must use lazy evaluation inside `defineSchema()` (not top-level const) to avoid import-order issues in the test environment
- PassionsEnum values are suggestions, not constraints — don't use `choices` validation for passion field
- The `as any` cast on `CONFIG.Item.dataModels[type]` is acceptable as a bridge
- Existing TS type contracts (`*Item`, `*DataSourceData`, type guards) are insulated from the DataModel change — consumers don't need updates during migration

## How to apply

Continue with Phase 5 (actor) when ready. Full plan details in `.claude/plans/zazzy-percolating-kernighan.md`.
