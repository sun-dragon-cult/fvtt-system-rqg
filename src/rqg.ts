import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/preloadTemplates.js";
import { RqgActorSheet } from "./module/actor/rqgActorSheet.js";
import { RqgActor } from "./module/actor/rqgActor.js";
import { ItemTypeEnum } from "./module/data-model/item-data/itemTypes";
import { PassionSheet } from "./module/item/passion-item/passionSheet";
import { SkillSheet } from "./module/item/skill-item/skillSheet";
import { RqgItem } from "./module/item/rqgItem";
import { ElementalRuneSheet } from "./module/item/elemental-rune-item/elementalRuneSheet";
import elementalRunes from "./default-items/elementalRunes";
import { PowerRuneSheet } from "./module/item/power-rune-item/powerRuneSheet";
import powerRunes from "./default-items/powerRunes";
import { HitLocationSheet } from "./module/item/hit-location-item/hitLocationSheet";
import hitLocations from "./default-items/hitLocations";
import { humanoid } from "./module/rqgCalculations";

/* ------------------------------------ */
/* Initialize system			          		*/
/* ------------------------------------ */
Hooks.once("init", async () => {
  console.log(
    "RQG | Initializing the Runequest Glorantha (Unofficial) Game System"
  );
  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // CONFIG.Combat.initiative = { // TODO Calculate initiative (SR) instead
  // 	formula: "1d20",
  // 	decimals: 2
  // };

  // Define custom Entity classes
  // @ts-ignore --- Wrong typing???
  CONFIG.Actor.entityClass = RqgActor;
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
/* Setup system						            	*/
/* ------------------------------------ */
Hooks.once("setup", async () => {});

/* ------------------------------------ */
/* When ready					              		*/
/* ------------------------------------ */
Hooks.once("ready", async () => {});

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

/* ------------------------------------ */
/* When Actor data is updated				    */
/* ------------------------------------ */
Hooks.on("updateActor", async (actor: Actor, data, options, someId) => {
  // TODO if options.diff === true Update actor skillItems using data.characteristics.dexterity.value
});
