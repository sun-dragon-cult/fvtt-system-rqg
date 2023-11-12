export const loadHandlebarsTemplates = async function () {
  const templatePaths = [
    "systems/rqg/actors/rqgActorSheet.hbs",
    // ActorSheet tabs
    "systems/rqg/actors/sheet-parts/combat-tab/combat-tab.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/health/health.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/health/humanoid-hit-locations.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/health/default-hit-locations.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/health/hit-location-stats.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/combat.hbs",
    "systems/rqg/actors/sheet-parts/combat-tab/spirit-combat.hbs",

    "systems/rqg/actors/sheet-parts/runes-tab/runes-tab.hbs",
    "systems/rqg/actors/sheet-parts/runes-tab/runes-elemental.hbs",
    "systems/rqg/actors/sheet-parts/runes-tab/runes-power.hbs",
    "systems/rqg/actors/sheet-parts/runes-tab/runes-form.hbs",
    "systems/rqg/actors/sheet-parts/runes-tab/runes-condition.hbs",
    "systems/rqg/actors/sheet-parts/runes-tab/grid-rune.hbs",

    "systems/rqg/actors/sheet-parts/spirit-magic-tab.hbs",

    "systems/rqg/actors/sheet-parts/rune-magic-tab.hbs",

    "systems/rqg/actors/sheet-parts/sorcery-tab.hbs",

    "systems/rqg/actors/sheet-parts/skills-tab/skills-tab.hbs",
    "systems/rqg/actors/sheet-parts/skills-tab/grid-skill.hbs",

    "systems/rqg/actors/sheet-parts/gear-tab/gear-tab.hbs",
    "systems/rqg/actors/sheet-parts/gear-tab/physical-item-location.hbs",

    "systems/rqg/actors/sheet-parts/passions-tab.hbs",

    "systems/rqg/actors/sheet-parts/background-tab.hbs",

    "systems/rqg/actors/sheet-parts/activeeffects-debug-tab.hbs",

    // RqidLink parts
    "systems/rqg/items/sheet-parts/rqidLink.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkDropzone.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkArrayDropzone.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkSelector.hbs",
    "systems/rqg/documents/rqid-tooltip.hbs",

    // Actor Wizard Sheet Parts
    "systems/rqg/applications/actor-wizard-sheet-parts/creation-species.hbs",
    "systems/rqg/applications/actor-wizard-sheet-parts/creation-homeland.hbs",

    // Item sheets
    "systems/rqg/items/passion-item/passionSheet.hbs",
    "systems/rqg/items/skill-item/skillSheet.hbs",
    "systems/rqg/items/rune-item/runeSheet.hbs",
    "systems/rqg/items/hit-location-item/hitLocationSheet.hbs",
    "systems/rqg/items/gear-item/gearSheet.hbs",
    "systems/rqg/items/armor-item/armorSheet.hbs",
    "systems/rqg/items/weapon-item/weaponSheet.hbs",
    "systems/rqg/items/spirit-magic-item/spiritMagicSheet.hbs",
    "systems/rqg/items/rune-magic-item/runeMagicSheet.hbs",
    "systems/rqg/items/cult-item/cultSheet.hbs",

    // Item sheet parts
    "systems/rqg/items/sheet-parts/itemActiveEffects.hbs",
    "systems/rqg/items/sheet-parts/itemCommonPhysical.hbs",

    // Chat Messages
    "systems/rqg/chat/characteristicChatHandler.hbs",
    "systems/rqg/chat/itemChatHandler.hbs",
    "systems/rqg/chat/spiritMagicChatHandler.hbs",
    "systems/rqg/chat/weaponChatHandler.hbs",

    // Dialogs & Settings
    "systems/rqg/applications/improveAbilityDialog.hbs",
    "systems/rqg/items/rune-magic-item/runeMagicCultDialog.hbs",

    // Interface
    "systems/rqg/foundryUi/rqgPause.hbs",
  ];

  return loadTemplates(templatePaths);
};
