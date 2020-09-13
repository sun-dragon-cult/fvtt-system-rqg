export const handlebarSettings = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  Handlebars.registerHelper("itemname", (itemId, actorId) => {
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.find((i) => i.key === itemId);
    return item ? item.data.name : "---";
  });
};
