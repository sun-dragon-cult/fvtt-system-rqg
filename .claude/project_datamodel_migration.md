Here is Claude's plan:

Plan: Migrate to Foundry DataModels
Context
The RQG system currently defines item/actor data shapes via template.json and TypeScript interfaces. Foundry's TypeDataModel API provides schema validation, type safety, built-in migration support (migrateData()), and data preparation hooks (prepareBaseData(), prepareDerivedData()). Gear has already been migrated as the first item type, establishing the base class (RqgItemDataModel) and shared field helpers. This plan continues that work across all remaining item types, then tackles the actor.

Approach: Items first, one subtype at a time, grouped by similarity
Phase 1: Physical Items (share physicalItemSchemaFields)
Gear is done. Two remain:

1. Armor — src/data-model/item-data/armorData.ts

New file: src/data-model/item-data/armorDataModel.ts
Schema: ...physicalItemSchemaFields() + size, hitLocationRqidLinks (rqidLinkArraySchemaField), namePrefix, armorType, material, absorbs, moveQuietlyPenalty
Register in rqgItem.ts: CONFIG.Item.dataModels["armor"] = ArmorDataModel 2. Weapon — src/data-model/item-data/weaponData.ts

New file: src/data-model/item-data/weaponDataModel.ts
Schema: ...physicalItemSchemaFields() + weapon-specific fields. The usage field is a complex nested structure (SchemaField with sub-SchemaField per usage type, each containing skillRqidLink, combatManeuvers array, damage, minStrength, minDexterity, strikeRank). Also hitPoints (resource), missile fields, isNatural, defaultUsage.
May need a new shared helper: resourceSchemaField() for { value, max } pattern (used by weapon hitPoints, cult runePoints, hitLocation hitPoints)
Register in rqgItem.ts
Phase 2: Ability Items (share abilitySchemaFields) 3. Skill — src/data-model/item-data/skillData.ts

New file: src/data-model/item-data/skillDataModel.ts
Schema: ...abilitySchemaFields() + descriptionRqidLink (rqidLinkSchemaField), category, skillName, specialization, baseChance, gainedChance, runeRqidLinks
Derived: chance = base + gained + categoryMod; categoryMod from actor
Register in rqgItem.ts 4. Passion — src/data-model/item-data/passionData.ts

New file: src/data-model/item-data/passionDataModel.ts
Schema: ...abilitySchemaFields() + passion (enum), subject, description, gmNotes
Register in rqgItem.ts 5. Rune — src/data-model/item-data/runeData.ts

New file: src/data-model/item-data/runeDataModel.ts
Schema: ...abilitySchemaFields() + descriptionRqidLink, rune, runeType (nested SchemaField with type enum + name), opposingRuneRqidLink, minorRuneRqidLinks, isMastered
Register in rqgItem.ts
Phase 3: Magic Items (share Spell fields)
Need a new shared helper: spellSchemaFields() for the common spell interface (points, castingRange, duration, concentration, isRitual, isEnchantment, descriptionRqidLink).

6. Rune Magic — src/data-model/item-data/runeMagicData.ts

New file: src/data-model/item-data/runeMagicDataModel.ts
Schema: ...spellSchemaFields() + cultId, runeRqidLinks, isStackable, isOneUse
Register in rqgItem.ts 7. Spirit Magic — src/data-model/item-data/spiritMagicData.ts

New file: src/data-model/item-data/spiritMagicDataModel.ts
Schema: ...spellSchemaFields() + isVariable, incompatibleWith (ArrayField of StringField), spellFocus, isMatrix
Register in rqgItem.ts
Phase 4: Complex Standalone Items 8. Cult — src/data-model/item-data/cultData.ts

New file: src/data-model/item-data/cultDataModel.ts
Schema: deity, descriptionRqidLink, runePoints (resourceSchemaField), holyDays, gifts, geases, runeRqidLinks, commonRuneMagicRqidLinks, joinedCults (ArrayField of SchemaField with cultName, tagline, rank)
Register in rqgItem.ts 9. Hit Location — src/data-model/item-data/hitLocationData.ts

New file: src/data-model/item-data/hitLocationDataModel.ts
Schema: dieFrom, dieTo, hitPoints (resourceSchemaField), baseHpDelta, naturalAp, wounds (ArrayField of NumberField), hitLocationHealthState, actorHealthImpact, hitLocationType, connectedTo
Derived: armorPoints = natural + worn
Register in rqgItem.ts 10. Homeland — src/data-model/item-data/homelandData.ts

New file: src/data-model/item-data/homelandDataModel.ts
Schema: homeland, homelandJournalRqidLink, region, regionJournalRqidLink, many \*RqidLinks arrays, wizardInstructions
Register in rqgItem.ts 11. Occupation — src/data-model/item-data/occupationData.ts

New file: src/data-model/item-data/occupationDataModel.ts
Schema: occupation, occupationRqidLink, specialization, homelands (ArrayField of StringField), occupationalSkills (ArrayField of SchemaField), standardOfLiving, baseIncome, baseIncomeNotes, cultRqidLinks, ransom, startingEquipmentRqidLinks
Register in rqgItem.ts
Phase 5: Actor — Character (CURRENT)
Phases 1-4 are complete. All 12 item types have DataModels. This phase adds the actor DataModel.

Step 1: Create RqgActorDataModel base class
New file: src/data-model/actor-data/RqgActorDataModel.ts

Mirror RqgItemDataModel exactly — extends foundry.abstract.TypeDataModel, includes:

defaultNumber(), coerceNumber(), coerceNumbers() helpers (copy from RqgItemDataModel.ts)
static override migrateData() that calls coerceNumbers then super.migrateData()
Same generic signature: <Schema, DerivedData>
Pattern to follow: src/data-model/item-data/RqgItemDataModel.ts

Note: The coerce helpers are duplicated between item and actor base classes. This is intentional — extracting a shared module is future cleanup, not part of this migration. Three files of duplication is better than a premature abstraction that complicates the import graph.

Step 2: Create CharacterDataModel
New file: src/data-model/actor-data/characterDataModel.ts

Schema must match CharacterDataSourceData field-for-field and align with template.json Actor.character. The schema has these top-level fields:

Detailed schema breakdown:

characteristics: SchemaField containing 7 identical sub-SchemaFields (strength, constitution, size, dexterity, intelligence, power, charisma). Each has:

value: NumberField({ integer: true, nullable: true, initial: 0 })
formula: StringField({ blank: true, nullable: true, initial: undefined })
hasExperience: BooleanField({ nullable: true, initial: undefined }) — only present on some stats (power)
Use a helper function characteristicSchemaField(initial) to avoid repetition, with different formula initials per stat ("3d6" vs "2d6+6").

background: SchemaField with:

species: StringField({ blank: true, nullable: false, initial: "Human" })
speciesRqidLink: rqidLinkSchemaField({ nullable: true })
occupation: StringField({ blank: true, nullable: false, initial: "" }) — NOT choices-validated (OccupationEnum values are suggestions)
currentOccupationRqidLink: rqidLinkSchemaField({ nullable: true })
homeland: StringField({ blank: true, nullable: true, initial: undefined })
town, gender, tribe, clan, standardOfLiving, ransomDetails, biography: StringField({ blank: true, nullable: true, initial: undefined })
birthYear, age, reputation, ransom, baseIncome: NumberField({ nullable: true, initial: undefined })
homelandJournalRqidLink, regionJournalRqidLink: rqidLinkSchemaField({ nullable: true })
cultureJournalRqidLinks, tribeJournalRqidLinks, clanJournalRqidLinks: rqidLinkArraySchemaField()
allies: StringField({ blank: true, nullable: false, initial: "" })

editMode: BooleanField({ nullable: false, initial: true })

extendedName: StringField({ blank: true, nullable: false, initial: "" })

attributes: SchemaField with:

magicPoints: resourceSchemaField() (reuse existing src/data-model/shared/resourceSchemaField.ts)
hitPoints: resourceSchemaField()
move: SchemaField with:
currentLocomotion: StringField({ blank: false, nullable: false, initial: "walk", choices: ["walk", "swim", "fly"] })
walk: SchemaField({ value: NumberField({ nullable: true, initial: 8 }), carryingFactor: NumberField({ nullable: true, initial: 1 }) })
swim: SchemaField({ value: NumberField({ nullable: true, initial: 2 }), carryingFactor: NumberField({ nullable: true, initial: 0.5 }) })
fly: SchemaField({ value: NumberField({ nullable: true, initial: undefined }), carryingFactor: NumberField({ nullable: true, initial: undefined }) })
heroPoints: NumberField({ integer: true, min: 0, nullable: false, initial: 0 })
isCreature: BooleanField({ nullable: false, initial: false })
health: StringField({ blank: false, nullable: false, initial: "healthy", choices: ["healthy", "wounded", "shock", "unconscious", "dead"] })
Derived data (via CharacterDataPropertiesData): skillCategoryModifiers: SkillCategories — but do NOT move prepare logic into the DataModel in this step. The existing RqgActor.prepareDerivedData() will continue to work since it writes to this.system.skillCategoryModifiers directly.

Step 3: Register in rqgActor.ts
In RqgActor.init(), after CONFIG.Actor.documentClass = RqgActor:

Import CharacterDataModel at the top of rqgActor.ts.

Step 4: TypeScript updates
Existing interfaces (CharacterDataSourceData, CharacterDataPropertiesData, CharacterActor) remain unchanged
global.d.ts SourceConfig.Actor / DataConfig.Actor remain unchanged
The as any cast is acceptable (same as items)
Do NOT change rqgActorData.ts interfaces or any consumers
Files to create
src/data-model/actor-data/RqgActorDataModel.ts
src/data-model/actor-data/characterDataModel.ts
Files to modify
src/actors/rqgActor.ts — add import + registration line in init()
Files to reuse (no changes)
src/data-model/shared/resourceSchemaField.ts
src/data-model/shared/rqidLinkField.ts
New shared helpers needed
Helper File Used by
resourceSchemaField() src/data-model/shared/resourceSchemaField.ts weapon, cult, hitLocation, actor
spellSchemaFields() src/data-model/shared/spellSchemaFields.ts runeMagic, spiritMagic
Existing helpers to reuse:

physicalItemSchemaFields() — src/data-model/shared/physicalItemSchemaFields.ts
abilitySchemaFields() — src/data-model/shared/abilitySchemaFields.ts
rqidLinkSchemaField() / rqidLinkArraySchemaField() — src/data-model/shared/rqidLinkField.ts
TypeScript type update strategy
The codebase uses a 4-part type pattern per item type (using Armor as example):

ArmorDataSourceData — base interface (read-only, DB source)
ArmorDataPropertiesData — extends source with derived/computed data
ArmorDataSource — { type: "armor"; system: ArmorDataSourceData }
ArmorDataProperties — { type: "armor"; system: ArmorDataPropertiesData }
ArmorItem — convenience type RqgItem & { system: ArmorDataPropertiesData }
These flow into global config via src/global.d.ts (SourceConfig.Item, DataConfig.Item) and union types in src/data-model/item-data/itemTypes.ts (RqgItemDataSource, RqgItemDataProperties).

Per-type TS updates:

The new DataModel class becomes the source of truth for the data shape
Update or replace the *DataSourceData interface to derive from the DataModel schema (or keep as-is if the fields match exactly — no need to change working types prematurely)
The *Item convenience types, type guards (isDocumentSubType<ArmorItem>), and item.system access patterns continue to work unchanged — they depend on the type contract, not the implementation
The as any cast on CONFIG.Item.dataModels[type] = XyzDataModel as any is acceptable as a bridge; proper DataModelConfig typing in global.d.ts can be done as a cleanup pass after all types are migrated
What NOT to change during migration:

Don't refactor consumers of item.system — they're insulated by the type contract
Don't remove old interfaces until all types are migrated and stable
Don't change function signatures or type guards
Per-type checklist (repeat for each)
Create *DataModel.ts mirroring the existing interface fields as schema fields
Verify the DataModel schema matches the existing *DataSourceData interface field-for-field
Register in rqgItem.ts (or actor equivalent) via CONFIG.Item.dataModels[type] = ...
Update TypeScript definitions:
a. Ensure the *DataSourceData interface stays compatible with the DataModel schema
b. If the DataModel adds derived data via prepareDerivedData(), ensure *DataPropertiesData reflects it
c. Verify \*Item type, union types in itemTypes.ts, and global.d.ts config remain consistent
Ensure template.json still has the type listed (Foundry uses both; DataModel takes precedence when registered)
Verify the system loads without errors (npm run build + test in Foundry)
Spot-check that existing items of that type still render and function
Execution order
Work through phases 1-5 sequentially. Within each phase, complete one type fully before starting the next. After each type:

Build: npm run build
Typecheck: npm run typecheck
Test: npm run test (if applicable)
Verification
After implementation:

npm run build — must succeed
npm run typecheck — must pass (no new type errors)
npm run test — all existing tests must pass
Manual: load a world in Foundry, open a character sheet, verify all fields render correctly
Manual: the datamodel-repair macro should now also detect actor-level validation errors (via CONFIG.Actor.dataModels)
What this plan does NOT include (future work)
Moving prepareDerivedData / prepareBaseData logic into DataModels — the existing RqgActor methods and ResponsibleItemClass pattern coexist with DataModels
Removing template.json entries — Foundry supports both simultaneously; removal is a separate cleanup step
Fully replacing old TypeScript interfaces with DataModel-derived types — keep old interfaces compatible for now
Proper DataModelConfig typing in global.d.ts to eliminate as any casts — cleanup pass after all types are migrated
Data migrations via migrateData() — not needed yet since the schema matches existing data shapes
Extracting shared coerce helpers from RqgItemDataModel / RqgActorDataModel into a common module
