export const loadHandlebarsTemplates = async function () {
  const templatePaths = [
    "systems/rqg/actors/rqgActorSheet.html",
    // ActorSheet tabs
    "systems/rqg/actors/sheet-parts/runes-tab.html",
    "systems/rqg/actors/sheet-parts/spirit-magic-tab.html",
    "systems/rqg/actors/sheet-parts/rune-magic-tab.html",
    "systems/rqg/actors/sheet-parts/sorcery-tab.html",
    "systems/rqg/actors/sheet-parts/skills-tab.html",
    "systems/rqg/actors/sheet-parts/gear-tab.html",
    "systems/rqg/actors/sheet-parts/passions-tab.html",
    "systems/rqg/actors/sheet-parts/background-tab.html",
    "systems/rqg/actors/sheet-parts/activeeffects-debug-tab.html",

    "systems/rqg/items/sheet-parts/itemActiveEffects.html",

    // ActorSheet parts
    "systems/rqg/actors/sheet-parts/health.html",
    "systems/rqg/actors/sheet-parts/combat.html",
    "systems/rqg/actors/sheet-parts/spirit-combat.html",
    "systems/rqg/actors/sheet-parts/elemental.html",
    "systems/rqg/actors/sheet-parts/power.html",
    "systems/rqg/actors/sheet-parts/form.html",
    "systems/rqg/actors/sheet-parts/condition.html",
    "systems/rqg/actors/sheet-parts/physical-item-location.html",

    // Dialog template for selecting runeMagic Cult
    "systems/rqg/actors/item-specific/runeMagicCultDialog.html",

    // Item sheets
    "systems/rqg/items/passion-item/passionSheet.html",
    "systems/rqg/items/skill-item/skillSheet.html",
    "systems/rqg/items/rune-item/runeSheet.html",
    "systems/rqg/items/hit-location-item/hitLocationSheet.html",
    "systems/rqg/items/gear-item/gearSheet.html",
    "systems/rqg/items/armor-item/armorSheet.html",
    "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
    "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
    "systems/rqg/items/weapon-item/weaponSheet.html",
    "systems/rqg/items/spirit-magic-item/spiritMagicSheet.html",
    "systems/rqg/items/rune-magic-item/runeMagicSheet.html",
    "systems/rqg/items/cult-item/cultSheet.html",

    // ChatCard
    "systems/rqg/chat/characteristicCard.html",
    "systems/rqg/chat/itemCard.html",
    "systems/rqg/chat/spiritMagicCard.html",
    "systems/rqg/chat/weaponCard.html",
  ];

  return loadTemplates(templatePaths);
};
