export const loadHandlebarsTemplates = async function () {
  const templatePaths = [
    "systems/rqg/actors/rqgActorSheet.hbs",
    // ActorSheet tabs
    "systems/rqg/actors/sheet-parts/runes-tab.hbs",
    "systems/rqg/actors/sheet-parts/spirit-magic-tab.hbs",
    "systems/rqg/actors/sheet-parts/rune-magic-tab.hbs",
    "systems/rqg/actors/sheet-parts/sorcery-tab.hbs",
    "systems/rqg/actors/sheet-parts/skills-tab.hbs",
    "systems/rqg/actors/sheet-parts/gear-tab.hbs",
    "systems/rqg/actors/sheet-parts/grid-rune.hbs",
    "systems/rqg/actors/sheet-parts/grid-skill.hbs",
    "systems/rqg/actors/sheet-parts/passions-tab.hbs",
    "systems/rqg/actors/sheet-parts/background-tab.hbs",
    "systems/rqg/actors/sheet-parts/activeeffects-debug-tab.hbs",

    "systems/rqg/items/sheet-parts/itemActiveEffects.hbs",
    "systems/rqg/items/sheet-parts/itemCommonPhysical.hbs",
    "systems/rqg/items/sheet-parts/itemRqgSystem.hbs",

    // RqidLink parts
    "systems/rqg/items/sheet-parts/rqidLink.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkTarget.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkArrayTarget.hbs",
    "systems/rqg/items/sheet-parts/rqidLinkSelector.hbs",

    // ActorSheet parts
    "systems/rqg/actors/sheet-parts/health.hbs",
    "systems/rqg/actors/sheet-parts/combat.hbs",
    "systems/rqg/actors/sheet-parts/spirit-combat.hbs",
    "systems/rqg/actors/sheet-parts/runes-elemental.hbs",
    "systems/rqg/actors/sheet-parts/runes-power.hbs",
    "systems/rqg/actors/sheet-parts/runes-form.hbs",
    "systems/rqg/actors/sheet-parts/runes-condition.hbs",
    "systems/rqg/actors/sheet-parts/physical-item-location.hbs",

    // Actor Wizard Sheet Parts
    "systems/rqg/dialog/actor-wizard-sheet-parts/creation-species.hbs",
    "systems/rqg/dialog/actor-wizard-sheet-parts/creation-homeland.hbs",

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

    // Chat Messages
    "systems/rqg/chat/characteristicChatHandler.hbs",
    "systems/rqg/chat/itemChatHandler.hbs",
    "systems/rqg/chat/spiritMagicChatHandler.hbs",
    "systems/rqg/chat/weaponChatHandler.hbs",

    // Dialogs & Settings
    "systems/rqg/dialog/improveAbilityDialog.hbs",
    "systems/rqg/dialog/hitLocationSettings.hbs",
    "systems/rqg/items/rune-magic-item/runeMagicCultDialog.hbs",

    // Interface
    "systems/rqg/foundryUi/pause.hbs",
  ];

  return loadTemplates(templatePaths);
};
