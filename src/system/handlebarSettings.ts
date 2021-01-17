export const handlebarSettings = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  Handlebars.registerHelper("currency", (value, unit) => {
    return `${new Intl.NumberFormat().format(value)} ${unit}`;
  });

  Handlebars.registerHelper("itemname", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item ? item.data.name : "---";
  });

  Handlebars.registerHelper("skillchance", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item ? item.data.data.chance : "---";
  });

  Handlebars.registerHelper("experiencedclass", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item && item.data.data.experience ? "experienced" : "";
  });

  Handlebars.registerHelper("quantity", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item ? item.data.data.quantity : "---";
  });

  Handlebars.registerHelper("runeImg", (runeName) => {
    const allRunesIndex = game.settings.get("rqg", "runes");
    return allRunesIndex.find((r) => r.name === runeName)?.img;
  });

  Handlebars.registerHelper("checkedexperience", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    if (!item) {
      console.warn("Found a null itemId with checkedexperience");
    }
    return item?.data.data.experience ? "checked" : "";
  });

  Handlebars.registerHelper("yes-no", (bool) => {
    return bool ? "yes" : "no";
  });

  Handlebars.registerHelper("multiply", (v1, v2) => {
    return Math.round(v1 * v2);
  });
};
