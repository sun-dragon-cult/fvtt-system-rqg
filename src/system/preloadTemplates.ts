export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/rqg/actors/rqgActorSheet.html",
    // ActorSheet tabs
    "systems/rqg/actors/parts/runes-tab.html",
    "systems/rqg/actors/parts/spirit-magic-tab.html",
    "systems/rqg/actors/parts/rune-magic-tab.html",
    "systems/rqg/actors/parts/sorcery-tab.html",
    "systems/rqg/actors/parts/skills-tab.html",
    "systems/rqg/actors/parts/gear-tab.html",
    "systems/rqg/actors/parts/passions-tab.html",
    "systems/rqg/actors/parts/background-tab.html",
    "systems/rqg/actors/parts/activeeffectstesting-tab.html",

    "systems/rqg/items/parts/itemActiveEffects.html",

    // ActorSheet parts
    "systems/rqg/actors/parts/health.html",
    "systems/rqg/actors/parts/combat.html",
    "systems/rqg/actors/parts/elemental.html",
    "systems/rqg/actors/parts/power.html",
    "systems/rqg/actors/parts/form.html",
    "systems/rqg/actors/parts/condition.html",

    // Item sheets
    "systems/rqg/items/passion-item/passionSheet.html",
    "systems/rqg/items/skill-item/skillSheet.html",
    "systems/rqg/items/rune-item/runeSheet.html",
    "systems/rqg/items/hit-location-item/hitLocationSheet.html",
    "systems/rqg/items/gear-item/gearSheet.html",
    "systems/rqg/items/armor-item/armorSheet.html",
    "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
    "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
    "systems/rqg/items/spirit-magic-item/spiritMagicSheet.html",
    "systems/rqg/items/rune-magic-item/runeMagicSheet.html",
    "systems/rqg/items/cult-item/cultSheet.html",
  ];

  return loadTemplates(templatePaths);
};
