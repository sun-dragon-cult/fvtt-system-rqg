import { getGame } from "./util";
import { hitLocationNamesObject } from "./settings/hitLocationNames";

export const registerRqgSystemSettings = function () {
  getGame().settings.register("rqg", "specialCrit", {
    name: "Special & Hyper Critical results",
    hint: "Add the possibility to roll a special critical (skill/100) and hyper critical (skill/500)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  getGame().settings.register("rqg", "runesCompendium", {
    name: "Rune items compendium",
    hint: "The runes in the specified compendium will be used in the system. Please include all possible runes.",
    scope: "world",
    config: true,
    type: String,
    default: "rqg.runes",
  });

  getGame().settings.register("rqg", "fumbleRollTable", {
    name: "Fumble Roll Table",
    hint: "The name of the Fumble roll table - will be used in combat",
    scope: "world",
    config: true,
    type: String,
    default: "Fumble",
  });

  getGame().settings.register("rqg", "hitLocations", {
    name: "List of hit location names",
    hint: "The hit location names are used in dropdowns for armor coverage and when naming a new hit location.",
    scope: "world",
    config: false, // TODO create a submenu for configuration
    type: Object,
    default: hitLocationNamesObject,
  });

  getGame().settings.register("rqg", "systemMigrationVersion", {
    name: "System Migration Version",
    hint: "Do not touch this unless you really know what you are doing!",
    scope: "world",
    config: true, // TODO make this false eventually
    type: String,
    default: "",
  });
};
