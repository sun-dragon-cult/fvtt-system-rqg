export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/rqg/actors/rqgActorSheet.html",
    "systems/rqg/actors/parts/runes-tab.html",
    "systems/rqg/actors/parts/skills-tab.html",
    "systems/rqg/actors/parts/gear-tab.html",
    "systems/rqg/actors/parts/background-tab.html",
    "systems/rqg/actors/parts/passions-tab.html",
    "systems/rqg/actors/parts/activeeffectstesting-tab.html",

    "systems/rqg/actors/parts/health.html",
    "systems/rqg/actors/parts/elemental.html",
    "systems/rqg/actors/parts/power.html",

    "systems/rqg/items/passion-item/passionSheet.html",
    "systems/rqg/items/skill-item/skillSheet.html",
    "systems/rqg/items/elemental-rune-item/elementalRuneSheet.html",
    "systems/rqg/items/power-rune-item/powerRuneSheet.html",
    "systems/rqg/items/hit-location-item/hitLocationSheet.html",
    "systems/rqg/items/gear-item/gearSheet.html",
    "systems/rqg/items/armor-item/armorSheet.html",
    "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
    "systems/rqg/items/missile-weapon-item/missileWeaponSheet.html",
  ];

  return loadTemplates(templatePaths);
};
