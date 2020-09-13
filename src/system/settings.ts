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
};
