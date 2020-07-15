export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/rqg/module/actor/actor-sheet.html",
    "systems/rqg/module/actor/parts/main-tab.html",
    "systems/rqg/module/actor/parts/skills-tab.html",
    "systems/rqg/module/actor/parts/inventory-tab.html",
    "systems/rqg/module/actor/parts/background-tab.html",
    "systems/rqg/module/actor/parts/passions-tab.html",

    "systems/rqg/module/actor/parts/armor.html",
    "systems/rqg/module/actor/parts/elemental.html",
    "systems/rqg/module/actor/parts/power.html",

    "systems/rqg/module/item/passion-sheet.html",
    "systems/rqg/module/item/skill-sheet.html",
  ];

  return loadTemplates(templatePaths);
};
