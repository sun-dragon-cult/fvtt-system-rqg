/**
 * Paths not used as handlebars partials
 */
export const templatePaths = {
  // Actor sheets
  rqgActorSheet: "systems/rqg/actors/rqg-actor-sheet.hbs",
  actorSheetV2Nav: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-nav.hbs",
  actorSheetV2Content: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-content.hbs",

  // Item Sheets
  itemArmorSheet: "systems/rqg/items/armor-item/armor-sheet.hbs",
  itemArmorSheetV2Header: "systems/rqg/items/armor-item/armor-sheet-v2-header.hbs",
  itemArmorSheetV2Armor: "systems/rqg/items/armor-item/armor-sheet-v2-armor.hbs",
  itemArmorSheetV2Description: "systems/rqg/items/armor-item/armor-sheet-v2-description.hbs",
  itemArmorSheetV2Gm: "systems/rqg/items/armor-item/armor-sheet-v2-gm.hbs",
  itemArmorSheetV2Effects: "systems/rqg/items/armor-item/armor-sheet-v2-effects.hbs",
  itemCultSheet: "systems/rqg/items/cult-item/cult-sheet.hbs",
  itemCultSheetV2Header: "systems/rqg/items/cult-item/cult-sheet-v2-header.hbs",
  itemCultSheetV2Deity: "systems/rqg/items/cult-item/cult-sheet-v2-deity.hbs",
  itemCultSheetV2GiftsGeases: "systems/rqg/items/cult-item/cult-sheet-v2-gifts-geases.hbs",
  itemCultSheetV2Cults: "systems/rqg/items/cult-item/cult-sheet-v2-cults.hbs",
  itemGearSheet: "systems/rqg/items/gear-item/gear-sheet.hbs",
  itemGearSheetV2Header: "systems/rqg/items/gear-item/gear-sheet-v2-header.hbs",
  itemGearSheetV2Gear: "systems/rqg/items/gear-item/gear-sheet-v2-gear.hbs",
  itemGearSheetV2Description: "systems/rqg/items/gear-item/gear-sheet-v2-description.hbs",
  itemGearSheetV2Gm: "systems/rqg/items/gear-item/gear-sheet-v2-gm.hbs",
  itemGearSheetV2Effects: "systems/rqg/items/gear-item/gear-sheet-v2-effects.hbs",
  itemHitLocationSheet: "systems/rqg/items/hit-location-item/hit-location-sheet.hbs",
  itemHitLocationSheetV2Header:
    "systems/rqg/items/hit-location-item/hit-location-sheet-v2-header.hbs",
  itemHitLocationSheetV2HitLocation:
    "systems/rqg/items/hit-location-item/hit-location-sheet-v2-hit-location.hbs",
  itemHitLocationSheetV2Definition:
    "systems/rqg/items/hit-location-item/hit-location-sheet-v2-definition.hbs",
  itemHomelandSheet: "systems/rqg/items/homeland-item/homeland-sheet.hbs",
  itemHomelandSheetV2Header: "systems/rqg/items/homeland-item/homeland-sheet-v2-header.hbs",
  itemHomelandSheetV2Homeland: "systems/rqg/items/homeland-item/homeland-sheet-v2-homeland.hbs",
  itemHomelandSheetV2WizardInstructions:
    "systems/rqg/items/homeland-item/homeland-sheet-v2-wizard-instructions.hbs",
  itemOccupationSheet: "systems/rqg/items/occupation-item/occupation-sheet.hbs",
  itemOccupationSheetV2Header: "systems/rqg/items/occupation-item/occupation-sheet-v2-header.hbs",
  itemOccupationSheetV2Occupation:
    "systems/rqg/items/occupation-item/occupation-sheet-v2-occupation.hbs",
  itemPassionSheet: "systems/rqg/items/passion-item/passion-sheet.hbs",
  itemPassionSheetV2Header: "systems/rqg/items/passion-item/passion-sheet-v2-header.hbs",
  itemPassionSheetV2Passion: "systems/rqg/items/passion-item/passion-sheet-v2-passion.hbs",
  itemPassionSheetV2Backstory: "systems/rqg/items/passion-item/passion-sheet-v2-backstory.hbs",
  itemPassionSheetV2Gm: "systems/rqg/items/passion-item/passion-sheet-v2-gm.hbs",
  itemRuneSheet: "systems/rqg/items/rune-item/rune-sheet.hbs",
  itemRuneSheetV2Header: "systems/rqg/items/rune-item/rune-sheet-v2-header.hbs",
  itemRuneSheetV2Rune: "systems/rqg/items/rune-item/rune-sheet-v2-rune.hbs",
  itemRuneMagicSheet: "systems/rqg/items/rune-magic-item/rune-magic-sheet.hbs",
  itemRuneMagicSheetV2Header: "systems/rqg/items/rune-magic-item/rune-magic-sheet-v2-header.hbs",
  itemRuneMagicSheetV2RuneMagic:
    "systems/rqg/items/rune-magic-item/rune-magic-sheet-v2-rune-magic.hbs",
  itemRuneMagicSheetV2Effects: "systems/rqg/items/rune-magic-item/rune-magic-sheet-v2-effects.hbs",
  itemWeaponSheet: "systems/rqg/items/weapon-item/weapon-sheet.hbs",
  itemWeaponSheetV2Header: "systems/rqg/items/weapon-item/weapon-sheet-v2-header.hbs",
  itemWeaponSheetV2Weapon: "systems/rqg/items/weapon-item/weapon-sheet-v2-weapon.hbs",
  itemWeaponSheetV2Usage: "systems/rqg/items/weapon-item/weapon-sheet-v2-usage.hbs",
  itemWeaponSheetV2Description: "systems/rqg/items/weapon-item/weapon-sheet-v2-description.hbs",
  itemWeaponSheetV2Gm: "systems/rqg/items/weapon-item/weapon-sheet-v2-gm.hbs",
  itemWeaponSheetV2Effects: "systems/rqg/items/weapon-item/weapon-sheet-v2-effects.hbs",
  itemSkillSheet: "systems/rqg/items/skill-item/skill-sheet.hbs",
  itemSkillSheetV2Header: "systems/rqg/items/skill-item/skill-sheet-v2-header.hbs",
  itemSkillSheetV2Skill: "systems/rqg/items/skill-item/skill-sheet-v2-skill.hbs",
  itemSkillSheetV2Definition: "systems/rqg/items/skill-item/skill-sheet-v2-definition.hbs",
  itemSpiritMagicSheet: "systems/rqg/items/spirit-magic-item/spirit-magic-sheet.hbs",
  itemSpiritMagicSheetV2Header:
    "systems/rqg/items/spirit-magic-item/spirit-magic-sheet-v2-header.hbs",
  itemSpiritMagicSheetV2SpiritMagic:
    "systems/rqg/items/spirit-magic-item/spirit-magic-sheet-v2-spirit-magic.hbs",
  itemSpiritMagicSheetV2Effects:
    "systems/rqg/items/spirit-magic-item/spirit-magic-sheet-v2-effects.hbs",

  // Dice & Rolls
  abilityRollTooltip: "systems/rqg/rolls/ability-roll/ability-roll-tooltip.hbs",
  abilityRoll: "systems/rqg/rolls/ability-roll/ability-roll.hbs",
  damageRollTooltip: "systems/rqg/rolls/damage-roll/damage-roll-tooltip.hbs",
  damageRoll: "systems/rqg/rolls/damage-roll/damage-roll.hbs",
  characteristicRollTooltip:
    "systems/rqg/rolls/characteristic-roll/characteristic-roll-tooltip.hbs",
  characteristicRoll: "systems/rqg/rolls/characteristic-roll/characteristic-roll.hbs",
  hitLocationRoll: "systems/rqg/rolls/hit-location-roll/hit-location-roll.hbs",
  hitLocationTooltip: "systems/rqg/rolls/hit-location-roll/hit-location-roll-tooltip.hbs",
  spiritMagicRollTooltip: "systems/rqg/rolls/spirit-magic-roll/spirit-magic-roll-tooltip.hbs",
  spiritMagicRoll: "systems/rqg/rolls/spirit-magic-roll/spirit-magic-roll.hbs",
  runeMagicRollTooltip: "systems/rqg/rolls/rune-magic-roll/rune-magic-roll-tooltip.hbs",
  runeMagicRoll: "systems/rqg/rolls/rune-magic-roll/rune-magic-roll.hbs",

  // Chat
  chatMessage: "systems/rqg/chat/chat-message.hbs",
  attackChatMessage: "systems/rqg/applications/attack-flow/attack-chat-template.hbs",

  rqidTooltip: "systems/rqg/documents/rqid-tooltip.hbs",

  // Actor Wizard
  actorWizardApplication: "systems/rqg/applications/actor-wizard-application.hbs",

  // Applications & Dialogs
  dialogRuneMagicCult: "systems/rqg/items/rune-magic-item/rune-magic-cult-dialog.hbs",
  improveDialogHeader: "systems/rqg/applications/improve-dialogs/improve-dialog-header.hbs",
  improveDialogSourceChooser:
    "systems/rqg/applications/improve-dialogs/improve-dialog-source-chooser.hbs",
  improveDialogSourceOption:
    "systems/rqg/applications/improve-dialogs/improve-dialog-source-option.hbs",
  improveAbilityDialogBody:
    "systems/rqg/applications/improve-dialogs/improve-ability-dialog-body.hbs",
  improveCharacteristicDialogBody:
    "systems/rqg/applications/improve-dialogs/improve-characteristic-dialog-body.hbs",
  dialogMigrateWorld: "systems/rqg/applications/migrate-world-dialog.hbs",
  migrationReportPerformed: "systems/rqg/applications/migration-report-performed.hbs",
  migrationReportIssues: "systems/rqg/applications/migration-report-issues.hbs",
  migrationReportSummary: "systems/rqg/applications/migration-report-summary.hbs",
  dialogRqidEditor: "systems/rqg/applications/rqid-editor/rqid-editor.hbs",
  dialogRqidEditorInfo: "systems/rqg/applications/rqid-editor/rqid-editor-info.hbs",
  rqidBatchEditor: "systems/rqg/applications/rqid-batch-editor/rqid-batch-editor.hbs",
  confirmCopyIntangibleItem: "systems/rqg/applications/confirm-copy-intangible-item.hbs",
  confirmTransferPhysicalItem: "systems/rqg/applications/confirm-transfer-physical-item.hbs",
  hitLocationAddWound: "systems/rqg/items/hit-location-item/hit-location-add-wound.hbs",
  hitLocationHealWound: "systems/rqg/items/hit-location-item/hit-location-heal-wound.hbs",
  abilityRollDialogV2: "systems/rqg/applications/ability-roll-dialog/ability-roll-dialog-v2.hbs",
  characteristicRollDialogV2:
    "systems/rqg/applications/characteristic-roll-dialog/characteristic-roll-dialog-v2.hbs",
  spiritMagicRollDialogV2:
    "systems/rqg/applications/spirit-magic-roll-dialog/spirit-magic-roll-dialog-v2.hbs",
  runeMagicRollDialogV2:
    "systems/rqg/applications/rune-magic-roll-dialog/rune-magic-roll-dialog-v2.hbs",
  attackDialogV2: "systems/rqg/applications/attack-flow/attack-dialog-v2.hbs",
  defenceDialogV2: "systems/rqg/applications/attack-flow/defence-dialog-v2.hbs",
  defenceFooter: "systems/rqg/applications/attack-flow/defence-footer.hbs",
  attackFooter: "systems/rqg/applications/attack-flow/attack-footer.hbs",
  rollHeader: "systems/rqg/applications/app-parts/roll-header.hbs",
  rollFooter: "systems/rqg/applications/app-parts/roll-footer.hbs",
  combatRollHeader: "systems/rqg/applications/attack-flow/combat-roll-header.hbs",

  // Settings
  defaultItemIconSettings: "systems/rqg/applications/default-item-icon-settings.hbs",
  defaultItemIconSettingsFooter: "systems/rqg/applications/default-item-icon-settings-footer.hbs",
  tokenRulerSettings: "systems/rqg/applications/settings/token-ruler-settings.hbs",
  // Interface
  settings: "systems/rqg/foundry-ui/settings.hbs",
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

    // V2 Actor Sheet tab partials
    actorSheetV2Header: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-header.hbs",
    actorSheetV2Body: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-body.hbs",
    actorSheetV2Combat: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-combat.hbs",
    actorSheetV2Runes: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-runes.hbs",
    actorSheetV2Passions: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-passions.hbs",
    actorSheetV2SpiritMagic: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-spirit-magic.hbs",
    actorSheetV2RuneMagic: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-rune-magic.hbs",
    actorSheetV2Sorcery: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-sorcery.hbs",
    actorSheetV2Skills: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-skills.hbs",
    actorSheetV2Gear: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-gear.hbs",
    actorSheetV2Background: "systems/rqg/actors/sheet-parts-v2/actor-sheet-v2-background.hbs",

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
    itemActiveEffects: "systems/rqg/items/sheet-parts/item-active-effects.hbs",
    itemCommonPhysical: "systems/rqg/items/sheet-parts/item-common-physical.hbs",

    // Application sheet parts
    improveDialogSourceChooser:
      "systems/rqg/applications/improve-dialogs/improve-dialog-source-chooser.hbs",
    improveDialogSourceOption:
      "systems/rqg/applications/improve-dialogs/improve-dialog-source-option.hbs",

    // RqidLink partials
    rqidLink: "systems/rqg/sheet-partials/rqid-link.hbs",
    rqidLinkDropzone: "systems/rqg/sheet-partials/rqid-link-dropzone.hbs",
    rqidLinkArrayDropzone: "systems/rqg/sheet-partials/rqid-link-array-dropzone.hbs",
    rqidLinkSelector: "systems/rqg/sheet-partials/rqid-link-selector.hbs",
  } as const;

  return foundry.applications.handlebars.loadTemplates(partialPaths);
};
