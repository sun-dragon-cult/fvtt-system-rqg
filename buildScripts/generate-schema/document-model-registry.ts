/**
 * Registry of Item/Actor document `type`s and the DataModel class that owns their
 * `system` schema. Add an entry here whenever a new item/actor type is added (mirrors
 * `ItemTypeEnum` in `src/data-model/item-data/item-types.ts` and `ActorTypeEnum` in
 * `src/data-model/actor-data/rqg-actor-data.ts`).
 *
 * `importPath` is relative to this file and resolved dynamically at generation time
 * (after the schema shim has been installed), so only the DataModel module and its
 * transitive imports get loaded — not the full Foundry client bundle.
 */
export interface DocumentModelDescriptor {
  documentType: "Item" | "Actor";
  type: string;
  className: string;
  importPath: string;
}

export const itemDocumentModels: DocumentModelDescriptor[] = [
  {
    documentType: "Item",
    type: "armor",
    className: "ArmorDataModel",
    importPath: "../../src/data-model/item-data/armor-data-model.ts",
  },
  {
    documentType: "Item",
    type: "cult",
    className: "CultDataModel",
    importPath: "../../src/data-model/item-data/cult-data-model.ts",
  },
  {
    documentType: "Item",
    type: "gear",
    className: "GearDataModel",
    importPath: "../../src/data-model/item-data/gear-data-model.ts",
  },
  {
    documentType: "Item",
    type: "hitLocation",
    className: "HitLocationDataModel",
    importPath: "../../src/data-model/item-data/hit-location-data-model.ts",
  },
  {
    documentType: "Item",
    type: "homeland",
    className: "HomelandDataModel",
    importPath: "../../src/data-model/item-data/homeland-data-model.ts",
  },
  {
    documentType: "Item",
    type: "occupation",
    className: "OccupationDataModel",
    importPath: "../../src/data-model/item-data/occupation-data-model.ts",
  },
  {
    documentType: "Item",
    type: "passion",
    className: "PassionDataModel",
    importPath: "../../src/data-model/item-data/passion-data-model.ts",
  },
  {
    documentType: "Item",
    type: "rune",
    className: "RuneDataModel",
    importPath: "../../src/data-model/item-data/rune-data-model.ts",
  },
  {
    documentType: "Item",
    type: "runeMagic",
    className: "RuneMagicDataModel",
    importPath: "../../src/data-model/item-data/rune-magic-data-model.ts",
  },
  {
    documentType: "Item",
    type: "skill",
    className: "SkillDataModel",
    importPath: "../../src/data-model/item-data/skill-data-model.ts",
  },
  {
    documentType: "Item",
    type: "spiritMagic",
    className: "SpiritMagicDataModel",
    importPath: "../../src/data-model/item-data/spirit-magic-data-model.ts",
  },
  {
    documentType: "Item",
    type: "weapon",
    className: "WeaponDataModel",
    importPath: "../../src/data-model/item-data/weapon-data-model.ts",
  },
];

export const actorDocumentModels: DocumentModelDescriptor[] = [
  {
    documentType: "Actor",
    type: "character",
    className: "CharacterDataModel",
    importPath: "../../src/data-model/actor-data/character-data-model.ts",
  },
];

export const allDocumentModels: DocumentModelDescriptor[] = [
  ...itemDocumentModels,
  ...actorDocumentModels,
];
