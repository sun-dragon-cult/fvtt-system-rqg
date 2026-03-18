/**
 * Paths not used as handlebars partials
 */
export const templatePaths = {
  // Actor sheets
  rqgActorSheet: "systems/rqg/actors/rqgActorSheet.hbs",
  actorCharacterSheetV2Header: "systems/rqg/actors/actorSheetV2Header.hbs",
  actorCharacterSheetV2Characteristics: "systems/rqg/actors/actorSheetV2Characteristics.hbs",
  actorCharacterSheetV2Combat: "systems/rqg/actors/actorSheetV2Combat.hbs",
  actorCharacterSheetV2Skills: "systems/rqg/actors/actorSheetV2Skills.hbs",
  actorCharacterSheetV2Magic: "systems/rqg/actors/actorSheetV2Magic.hbs",
  actorCharacterSheetV2Background: "systems/rqg/actors/actorSheetV2Background.hbs",
  actorCharacterSheetV2Effects: "systems/rqg/actors/actorSheetV2Effects.hbs",

  // Item Sheets
  itemArmorSheet: "systems/rqg/items/armor-item/armorSheet.hbs",
  itemArmorSheetV2Header: "systems/rqg/items/armor-item/armorSheetV2Header.hbs",
  itemArmorSheetV2Armor: "systems/rqg/items/armor-item/armorSheetV2Armor.hbs",
  itemArmorSheetV2Description: "systems/rqg/items/armor-item/armorSheetV2Description.hbs",
  itemArmorSheetV2Gm: "systems/rqg/items/armor-item/armorSheetV2Gm.hbs",
  itemArmorSheetV2Effects: "systems/rqg/items/armor-item/armorSheetV2Effects.hbs",
  itemCultSheet: "systems/rqg/items/cult-item/cultSheet.hbs",
  itemCultSheetV2Header: "systems/rqg/items/cult-item/cultSheetV2Header.hbs",
  itemCultSheetV2Deity: "systems/rqg/items/cult-item/cultSheetV2Deity.hbs",
  itemCultSheetV2GiftsGeases: "systems/rqg/items/cult-item/cultSheetV2GiftsGeases.hbs",
  itemCultSheetV2Cults: "systems/rqg/items/cult-item/cultSheetV2Cults.hbs",
  itemGearSheet: "systems/rqg/items/gear-item/gearSheet.hbs",
  itemGearSheetV2Header: "systems/rqg/items/gear-item/gearSheetV2Header.hbs",
  itemGearSheetV2Gear: "systems/rqg/items/gear-item/gearSheetV2Gear.hbs",
  itemGearSheetV2Description: "systems/rqg/items/gear-item/gearSheetV2Description.hbs",
  itemGearSheetV2Gm: "systems/rqg/items/gear-item/gearSheetV2Gm.hbs",
  itemGearSheetV2Effects: "systems/rqg/items/gear-item/gearSheetV2Effects.hbs",
  itemHitLocationSheet: "systems/rqg/items/hit-location-item/hitLocationSheet.hbs",
  itemHitLocationSheetV2Header: "systems/rqg/items/hit-location-item/hitLocationSheetV2Header.hbs",
  itemHitLocationSheetV2HitLocation:
    "systems/rqg/items/hit-location-item/hitLocationSheetV2HitLocation.hbs",
  itemHitLocationSheetV2Definition:
    "systems/rqg/items/hit-location-item/hitLocationSheetV2Definition.hbs",
  itemHomelandSheet: "systems/rqg/items/homeland-item/homelandSheet.hbs",
  itemHomelandSheetV2Header: "systems/rqg/items/homeland-item/homelandSheetV2Header.hbs",
  itemHomelandSheetV2Homeland: "systems/rqg/items/homeland-item/homelandSheetV2Homeland.hbs",
  itemHomelandSheetV2WizardInstructions:
    "systems/rqg/items/homeland-item/homelandSheetV2WizardInstructions.hbs",
  itemOccupationSheet: "systems/rqg/items/occupation-item/occupationSheet.hbs",
  itemOccupationSheetV2Header: "systems/rqg/items/occupation-item/occupationSheetV2Header.hbs",
  itemOccupationSheetV2Occupation:
    "systems/rqg/items/occupation-item/occupationSheetV2Occupation.hbs",
  itemPassionSheet: "systems/rqg/items/passion-item/passionSheet.hbs",
  itemPassionSheetV2Header: "systems/rqg/items/passion-item/passionSheetV2Header.hbs",
  itemPassionSheetV2Passion: "systems/rqg/items/passion-item/passionSheetV2Passion.hbs",
  itemPassionSheetV2Backstory: "systems/rqg/items/passion-item/passionSheetV2Backstory.hbs",
  itemPassionSheetV2Gm: "systems/rqg/items/passion-item/passionSheetV2Gm.hbs",
  itemRuneSheet: "systems/rqg/items/rune-item/runeSheet.hbs",
  itemRuneSheetV2Header: "systems/rqg/items/rune-item/runeSheetV2Header.hbs",
  itemRuneSheetV2Rune: "systems/rqg/items/rune-item/runeSheetV2Rune.hbs",
  itemRuneMagicSheet: "systems/rqg/items/rune-magic-item/runeMagicSheet.hbs",
  itemRuneMagicSheetV2Header: "systems/rqg/items/rune-magic-item/runeMagicSheetV2Header.hbs",
  itemRuneMagicSheetV2RuneMagic: "systems/rqg/items/rune-magic-item/runeMagicSheetV2RuneMagic.hbs",
  itemRuneMagicSheetV2Effects: "systems/rqg/items/rune-magic-item/runeMagicSheetV2Effects.hbs",
  itemWeaponSheet: "systems/rqg/items/weapon-item/weaponSheet.hbs",
  itemWeaponSheetV2Header: "systems/rqg/items/weapon-item/weaponSheetV2Header.hbs",
  itemWeaponSheetV2Weapon: "systems/rqg/items/weapon-item/weaponSheetV2Weapon.hbs",
  itemWeaponSheetV2Usage: "systems/rqg/items/weapon-item/weaponSheetV2Usage.hbs",
  itemWeaponSheetV2Description: "systems/rqg/items/weapon-item/weaponSheetV2Description.hbs",
  itemWeaponSheetV2Gm: "systems/rqg/items/weapon-item/weaponSheetV2Gm.hbs",
  itemWeaponSheetV2Effects: "systems/rqg/items/weapon-item/weaponSheetV2Effects.hbs",
  itemSkillSheet: "systems/rqg/items/skill-item/skillSheet.hbs",
  itemSkillSheetV2Header: "systems/rqg/items/skill-item/skillSheetV2Header.hbs",
  itemSkillSheetV2Skill: "systems/rqg/items/skill-item/skillSheetV2Skill.hbs",
  itemSkillSheetV2Definition: "systems/rqg/items/skill-item/skillSheetV2Definition.hbs",
  itemSpiritMagicSheet: "systems/rqg/items/spirit-magic-item/spiritMagicSheet.hbs",
  itemSpiritMagicSheetV2Header: "systems/rqg/items/spirit-magic-item/spiritMagicSheetV2Header.hbs",
  itemSpiritMagicSheetV2SpiritMagic:
    "systems/rqg/items/spirit-magic-item/spiritMagicSheetV2SpiritMagic.hbs",
  itemSpiritMagicSheetV2Effects:
    "systems/rqg/items/spirit-magic-item/spiritMagicSheetV2Effects.hbs",

  // Dice & Rolls
  abilityRollTooltip: "systems/rqg/rolls/AbilityRoll/abilityRollTooltip.hbs",
  abilityRoll: "systems/rqg/rolls/AbilityRoll/abilityRoll.hbs",
  damageRollTooltip: "systems/rqg/rolls/DamageRoll/damageRollTooltip.hbs",
  damageRoll: "systems/rqg/rolls/DamageRoll/damageRoll.hbs",
  characteristicRollTooltip: "systems/rqg/rolls/CharacteristicRoll/characteristicRollTooltip.hbs",
  characteristicRoll: "systems/rqg/rolls/CharacteristicRoll/characteristicRoll.hbs",
  hitLocationRoll: "systems/rqg/rolls/HitLocationRoll/hitLocationRoll.hbs",
  hitLocationTooltip: "systems/rqg/rolls/HitLocationRoll/hitLocationRollTooltip.hbs",
  spiritMagicRollTooltip: "systems/rqg/rolls/SpiritMagicRoll/spiritMagicRollTooltip.hbs",
  spiritMagicRoll: "systems/rqg/rolls/SpiritMagicRoll/spiritMagicRoll.hbs",
  runeMagicRollTooltip: "systems/rqg/rolls/RuneMagicRoll/runeMagicRollTooltip.hbs",
  runeMagicRoll: "systems/rqg/rolls/RuneMagicRoll/runeMagicRoll.hbs",

  // Chat
  chatMessage: "systems/rqg/chat/chat-message.hbs",
  attackChatMessage: "systems/rqg/applications/AttackFlow/attackChatTemplate.hbs",

  rqidTooltip: "systems/rqg/documents/rqid-tooltip.hbs",

  // Actor Wizard
  actorWizardApplication: "systems/rqg/applications/actorWizardApplication.hbs",

  // Applications & Dialogs
  dialogRuneMagicCult: "systems/rqg/items/rune-magic-item/runeMagicCultDialog.hbs",
  dialogImproveAbility: "systems/rqg/applications/improveAbilityDialog.hbs",
  dialogMigrateWorld: "systems/rqg/applications/migrateWorldDialog.hbs",
  dialogRqidEditor: "systems/rqg/applications/rqidEditor/rqidEditor.hbs",
  rqidBatchEditor: "systems/rqg/applications/rqid-batch-editor/rqidBatchEditor.hbs",
  confirmCopyIntangibleItem: "systems/rqg/applications/confirmCopyIntangibleItem.hbs",
  confirmTransferPhysicalItem: "systems/rqg/applications/confirmTransferPhysicalItem.hbs",
  hitLocationAddWound: "systems/rqg/items/hit-location-item/hitLocationAddWound.hbs",
  hitLocationHealWound: "systems/rqg/items/hit-location-item/hitLocationHealWound.hbs",
  abilityRollDialogV2: "systems/rqg/applications/AbilityRollDialog/abilityRollDialogV2.hbs",
  characteristicRollDialogV2:
    "systems/rqg/applications/CharacteristicRollDialog/characteristicRollDialogV2.hbs",
  spiritMagicRollDialogV2:
    "systems/rqg/applications/SpiritMagicRollDialog/spiritMagicRollDialogV2.hbs",
  runeMagicRollDialogV2: "systems/rqg/applications/RuneMagicRollDialog/runeMagicRollDialogV2.hbs",
  attackDialogV2: "systems/rqg/applications/AttackFlow/attackDialogV2.hbs",
  defenceDialogV2: "systems/rqg/applications/AttackFlow/defenceDialogV2.hbs",
  defenceFooter: "systems/rqg/applications/AttackFlow/defenceFooter.hbs",
  attackFooter: "systems/rqg/applications/AttackFlow/attackFooter.hbs",
  rollHeader: "systems/rqg/applications/app-parts/rollHeader.hbs",
  rollFooter: "systems/rqg/applications/app-parts/rollFooter.hbs",
  combatRollHeader: "systems/rqg/applications/AttackFlow/combatRollHeader.hbs",

  // Settings
  defaultItemIconSettings: "systems/rqg/applications/defaultItemIconSettings.hbs",
  tokenRulerSettings: "systems/rqg/applications/settings/tokenRulerSettings.hbs",
  // Interface
  settings: "systems/rqg/foundryUi/settings.hbs",
  combatTracker: "systems/rqg/combat/tracker.hbs",
  combatHeader: "systems/rqg/combat/header.hbs",
} as const;

export const loadHandlebarsTemplates = async function () {
  /**
   * Paths used with handlebars partials: {{> key}}
   */
  const partialPaths = {
    // ActorSheet tabs
    actorCombatTab: "systems/rqg/actors/sheet-parts/combat-tab/combat-tab.hbs",
    actorHealth: "systems/rqg/actors/sheet-parts/combat-tab/health/health.hbs",
    actorHumanoidHitLocations:
      "systems/rqg/actors/sheet-parts/combat-tab/health/humanoid-hit-locations.hbs",
    actorDefaultHitlocations:
      "systems/rqg/actors/sheet-parts/combat-tab/health/default-hit-locations.hbs",
    actorHitLocationStats:
      "systems/rqg/actors/sheet-parts/combat-tab/health/hit-location-stats.hbs",
    actorCombat: "systems/rqg/actors/sheet-parts/combat-tab/combat.hbs",
    actorSpiritCombat: "systems/rqg/actors/sheet-parts/combat-tab/spirit-combat.hbs",

    actorRuneTab: "systems/rqg/actors/sheet-parts/runes-tab/runes-tab.hbs",
    actorRuneElements: "systems/rqg/actors/sheet-parts/runes-tab/runes-elemental.hbs",
    actorRunePower: "systems/rqg/actors/sheet-parts/runes-tab/runes-power.hbs",
    actorRuneForm: "systems/rqg/actors/sheet-parts/runes-tab/runes-form.hbs",
    actorRuneCondition: "systems/rqg/actors/sheet-parts/runes-tab/runes-condition.hbs",
    actorRuneGrid: "systems/rqg/actors/sheet-parts/runes-tab/grid-rune.hbs",

    actorSpiritMagicTab: "systems/rqg/actors/sheet-parts/spirit-magic-tab.hbs",

    actorRuneMagicTab: "systems/rqg/actors/sheet-parts/rune-magic-tab.hbs",
    actorRuneMagicCultSection: "systems/rqg/actors/sheet-parts/rune-magic-cult-section.hbs",

    actorSorceryTab: "systems/rqg/actors/sheet-parts/sorcery-tab.hbs",

    actorSkillsTab: "systems/rqg/actors/sheet-parts/skills-tab/skills-tab.hbs",
    actorSkillsGrid: "systems/rqg/actors/sheet-parts/skills-tab/grid-skill.hbs",

    actorGearTab: "systems/rqg/actors/sheet-parts/gear-tab/gear-tab.hbs",
    actorGearPhysicalItemLocation:
      "systems/rqg/actors/sheet-parts/gear-tab/physical-item-location.hbs",

    actorPassionsTab: "systems/rqg/actors/sheet-parts/passions-tab.hbs",

    actorBackgroundTab: "systems/rqg/actors/sheet-parts/background-tab.hbs",

    actorActiveEffectsTab: "systems/rqg/actors/sheet-parts/activeeffects-debug-tab.hbs",

    // Actor Wizard Sheet Parts
    wizardCreationSpecies: "systems/rqg/applications/actor-wizard-sheet-parts/creation-species.hbs",
    wizardCreationHomeland:
      "systems/rqg/applications/actor-wizard-sheet-parts/creation-homeland.hbs",

    // Item sheet parts
    itemActiveEffects: "systems/rqg/items/sheet-parts/itemActiveEffects.hbs",
    itemCommonPhysical: "systems/rqg/items/sheet-parts/itemCommonPhysical.hbs",

    // Application sheet parts
    rollModes: "systems/rqg/applications/app-parts/rollModes.hbs",

    // RqidLink partials
    rqidLink: "systems/rqg/sheet-partials/rqidLink.hbs",
    rqidLinkDropzone: "systems/rqg/sheet-partials/rqidLinkDropzone.hbs",
    rqidLinkArrayDropzone: "systems/rqg/sheet-partials/rqidLinkArrayDropzone.hbs",
    rqidLinkSelector: "systems/rqg/sheet-partials/rqidLinkSelector.hbs",
  } as const;

  return foundry.applications.handlebars.loadTemplates(partialPaths);
};
