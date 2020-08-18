export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/rqg/module/actor/rqgActorSheet.html",
    "systems/rqg/module/actor/parts/main-tab.html",
    "systems/rqg/module/actor/parts/skills-tab.html",
    "systems/rqg/module/actor/parts/inventory-tab.html",
    "systems/rqg/module/actor/parts/background-tab.html",
    "systems/rqg/module/actor/parts/passions-tab.html",

    "systems/rqg/module/actor/parts/armor.html",
    "systems/rqg/module/actor/parts/elemental.html",
    "systems/rqg/module/actor/parts/power.html",

    "systems/rqg/module/item/passion-item/passionSheet.html",
    "systems/rqg/module/item/skill-item/skillSheet.html",
    "systems/rqg/module/item/elemental-rune-item/elementalRuneSheet.html",
    "systems/rqg/module/item/power-rune-item/powerRuneSheet.html",
    "systems/rqg/module/item/hit-location-item/hitLocationSheet.html",
  ];

  return loadTemplates(templatePaths);
};
