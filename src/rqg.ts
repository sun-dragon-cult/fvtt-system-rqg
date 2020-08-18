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

/* ------------------------------------ */
/* Initialize system					*/
/* ------------------------------------ */
Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha Game System");

  // Assign custom classes and constants here
  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // CONFIG.Combat.initiative = { // TODO Calculate initiative (SR) instead
  // 	formula: "1d20",
  // 	decimals: 2
  // };

  // Define custom Entity classes
  CONFIG.Actor.entityClass = RqgActor;
  CONFIG.Item.entityClass = RqgItem;

  CONFIG.debug.hooks = true; // console log when hooks fire

  // Register custom system settings
  registerSettings();

  // Add Handlebar utils
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  Handlebars.registerHelper("itemname", (itemId, actorId) => {
    console.log("***********", itemId, actorId);
    // TODO itemId is not a global, it's in the Actor.items...
    const actor = game.actors.find((a) => a._id === actorId);
    const item = actor.items.find((i) => i.key === itemId);
    return item ? item.data.name : "---";
  });

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets (if any)
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

  const GloranthanCalendar = {
    // month lengths in days - first number is non-leap year, second is leapy year
    month_len: {
      "Sea season - Disorder week": { days: [7, 7] },
      "Sea season - Harmony week": { days: [7, 7] },
      "Sea season - Death week": { days: [7, 7] },
      "Sea season - Fertility week": { days: [7, 7] },
      "Sea season - Stasis week": { days: [7, 7] },
      "Sea season - Movement week": { days: [7, 7] },
      "Sea season - Illusion week": { days: [7, 7] },
      "Sea season - Truth week": { days: [7, 7] },

      "Fire season - Disorder week": { days: [7, 7] },
      "Fire season - Harmony week": { days: [7, 7] },
      "Fire season - Death week": { days: [7, 7] },
      "Fire season - Fertility week": { days: [7, 7] },
      "Fire season - Stasis week": { days: [7, 7] },
      "Fire season - Movement week": { days: [7, 7] },
      "Fire season - Illusion week": { days: [7, 7] },
      "Fire season - Truth week": { days: [7, 7] },

      "Earth season - Disorder week": { days: [7, 7] },
      "Earth season - Harmony week": { days: [7, 7] },
      "Earth season - Death week": { days: [7, 7] },
      "Earth season - Fertility week": { days: [7, 7] },
      "Earth season - Stasis week": { days: [7, 7] },
      "Earth season - Movement week": { days: [7, 7] },
      "Earth season - Illusion week": { days: [7, 7] },
      "Earth season - Truth week": { days: [7, 7] },

      "Dark season - Disorder week": { days: [7, 7] },
      "Dark season - Harmony week": { days: [7, 7] },
      "Dark season - Death week": { days: [7, 7] },
      "Dark season - Fertility week": { days: [7, 7] },
      "Dark season - Stasis week": { days: [7, 7] },
      "Dark season - Movement week": { days: [7, 7] },
      "Dark season - Illusion week": { days: [7, 7] },
      "Dark season - Truth week": { days: [7, 7] },

      "Storm season - Disorder week": { days: [7, 7] },
      "Storm season - Harmony week": { days: [7, 7] },
      "Storm season - Death week": { days: [7, 7] },
      "Storm season - Fertility week": { days: [7, 7] },
      "Storm season - Stasis week": { days: [7, 7] },
      "Storm season - Movement week": { days: [7, 7] },
      "Storm season - Illusion week": { days: [7, 7] },
      "Storm season - Truth week": { days: [7, 7] },

      "Sacred Time - First week": { days: [7, 7] },
      "Sacred Time - Second week": { days: [7, 7] },
    },
    // a function to return the number of leap years from 0 to the specified year.
    leap_year_rule: (year) => 0,
    // names of the days of the w. It is assumed weeklengths don't change
    weekdays: [
      "Freezeday",
      "Waterday",
      "Clayday",
      "Windsday",
      "Fireday",
      "Wildday",
      "Godsday",
    ],
    // year when the clock starts and time is recorded as seconds from this 1/1/clock_start_year 00:00:00. If is set to 1970 as a unix joke. you can set it to 0.
    clock_start_year: 0,
    // day of the w of 0/0/0 00:00:00
    first_day: 0,
    notes: {},
    hours_per_day: 24,
    seconds_per_minute: 60,
    minutes_per_hour: 60,
    // Is there a year
    has_year_0: false,
  };
  if (game.modules.get("about-time")?.active) {
    game.Gametime.DTC.createFromData(GloranthanCalendar);
    game.Gametime.DTC.saveUserCalendar(GloranthanCalendar);
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

// Hooks.on(
//   "renderActorSheet",
//   (actorSheet: RqgActorSheet, htmlElement: HTMLElement, actorObject) => {
//     const actorData: ActorData<RqgActorData> = actorObject.actor;
//     const embeddedItems: Items = actorObject.items;
//     console.log("**** hook actorObject", actorObject);
//     embeddedItems
//       .filter((i: Item) => i.type === ItemTypeEnum.Skill.toString())
//       .forEach((s: Item<SkillData>) => {
//         console.log("*** Calling from rqg.ts with item", s);
//         SkillSheet.calculateSkillChance(s);
//       });
//   }
// );

/* ------------------------------------ */
/* When creating new Actor (see Swade system)							*/

Hooks.on(
  "createActor",
  async (actor: RqgActor, options: any, userId: String) => {
    if (actor.data.type === "character" && options.renderSheet) {
      await actor.createEmbeddedEntity("OwnedItem", elementalRunes);
      await actor.createEmbeddedEntity("OwnedItem", powerRunes);
    }
  }
);

Hooks.on("updateActor", async (actor: Actor, data, options, someId) => {
  // TODO if options.diff === true Update actor skillItems using data.characteristics.dexterity.value
});
