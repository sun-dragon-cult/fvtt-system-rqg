export const registerRqgSystemSettings = function () {
  game.settings.register("rqg", "specialCrit", {
    name: "Special & Hyper Critical results",
    hint:
      "Add the possibility to roll a special critical (skill/100) and hyper critical (skill/500)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("rqg", "runesCompendium", {
    name: "Name of compendium with rune items",
    hint: "The runes in the specified compendium will be used in the system.",
    scope: "world",
    config: true,
    type: String,
    default: "rqg-compendiums.runes",
  });

  game.settings.register("rqg", "runes", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });
};
