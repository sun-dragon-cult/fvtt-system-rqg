import { registerSettings } from "./system/settings.js";
import { preloadTemplates } from "./system/preloadTemplates.js";
import { RqgActorSheet } from "./actors/rqgActorSheet.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import elementalRunes from "./assets/default-items/elementalRunes";
import powerRunes from "./assets/default-items/powerRunes";
import hitLocations from "./assets/default-items/hitLocations";
import { humanoid } from "./system/rqgCalculations";
import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { PassionSheet } from "./items/passion-item/passionSheet";
import { ElementalRuneSheet } from "./items/elemental-rune-item/elementalRuneSheet";
import { PowerRuneSheet } from "./items/power-rune-item/powerRuneSheet";
import { SkillSheet } from "./items/skill-item/skillSheet";
import { HitLocationSheet } from "./items/hit-location-item/hitLocationSheet";

Hooks.once("init", async () => {
  console.log(
    "RQG | Initializing the Runequest Glorantha (Unofficial) Game System"
  );

  CONFIG.Actor.entityClass = RqgActor as typeof Actor;
  CONFIG.Item.entityClass = RqgItem;

  // CONFIG.debug.hooks = true; // console log when hooks fire

  // Register custom game system settings
  registerSettings();

  // Add Handlebar utils
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  Handlebars.registerHelper("itemname", (itemId, actorId) => {
    // TODO itemId is not a global, it's in the Actor.items...
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.find((i) => i.key === itemId);
    return item ? item.data.name : "---";
  });

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("rqg", RqgActorSheet, { makeDefault: true });

  // RqgItem.init();
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("rqg", PassionSheet, {
    types: [ItemTypeEnum.Passion],
    makeDefault: true,
  });
  Items.registerSheet("rqg", ElementalRuneSheet, {
    types: [ItemTypeEnum.ElementalRune],
    makeDefault: true,
  });
  Items.registerSheet("rqg", PowerRuneSheet, {
    types: [ItemTypeEnum.PowerRune],
    makeDefault: true,
  });
  Items.registerSheet("rqg", SkillSheet, {
    types: [ItemTypeEnum.Skill],
    makeDefault: true,
  });
  Items.registerSheet("rqg", HitLocationSheet, {
    types: [ItemTypeEnum.HitLocation],
    makeDefault: true,
  });

  if (game.modules.get("about-time")?.active) {
    game.Gametime.DTC.createFromData(game.Gametime.calendars.Glorantha);
    game.Gametime.DTC.saveUserCalendar(game.Gametime.calendars.Glorantha);
  }
});

/* ------------------------------------ */
/* When creating new Actor					    */
/* ------------------------------------ */
Hooks.on(
  "createActor",
  async (actor: RqgActor, options: any, userId: String) => {
    if (actor.data.type === "character" && options.renderSheet) {
      await actor.createOwnedItem(elementalRunes);
      await actor.createOwnedItem(powerRunes);
      // TODO Add support for other races than humanoid - is race even set at this point?
      await actor.createOwnedItem(
        hitLocations.filter((h) => humanoid.includes(h.name))
      );
      // );
    }
  }
);
