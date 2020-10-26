export const handlebarSettings = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

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

  Handlebars.registerHelper("quantity", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item ? item.data.data.quantity : "---";
  });

  Handlebars.registerHelper("checkedexperience", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.get(itemId);
    return item.data.data.experience ? "checked" : "";
  });
};
