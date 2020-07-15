import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/preloadTemplates.js";

import { ActorSheetRqgCharacter } from "./module/actor/actorSheetRqgCharacter.js";
import { ActorRqg } from "./module/actor/actorRqg.js";

import {
  passionType,
  skillType,
} from "./module/data-model/item-data/itemTypes";
import { PassionSheet } from "./module/item/passionSheet";
import { SkillSheet } from "./module/item/skillSheet";

/* ------------------------------------ */
/* Initialize system					*/
/* ------------------------------------ */
Hooks.once("init", async function () {
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
  CONFIG.Actor.entityClass = ActorRqg;

  // Register custom system settings
  registerSettings();

  // Add Handlebar utils
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  // Preload Handlebars templates
  await preloadTemplates();

  // Register custom sheets (if any)
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("rqg", ActorSheetRqgCharacter, { makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("rqg", PassionSheet, {
    types: [passionType],
    makeDefault: true,
  });
  Items.registerSheet("rqg", SkillSheet, {
    types: [skillType],
    makeDefault: true,
  });
});

/* ------------------------------------ */
/* Setup system						            	*/
/* ------------------------------------ */
Hooks.once("setup", function () {
  console.log("*** System is setup hook *** DEBUG");
  // Do anything after initialization but before
  // ready
});

/* ------------------------------------ */
/* When ready					              		*/
/* ------------------------------------ */
Hooks.once("ready", function () {
  console.log("*** System is ready hook *** DEBUG");
  // Do anything once the system is ready
});

/* ------------------------------------ */
/* When creating new Actor (see Swade system)							*/
/* ------------------------------------ */
// Hooks.on(
//   'createActor',
//   async (actor: ActorRqg, options: any, userId: String) => {
//     if (actor.data.type === 'character' && options.renderSheet) {
//       const skillsToFind = [
//         'Boat',
//         'Swim'
//         // ...
//       ];
//       const skillIndex = (await game.packs
//         .get('rqg.skills')
//         .getContent()) as SwadeItem[];
//       actor.createEmbeddedEntity(
//         'OwnedItem',
//         skillIndex.filter((i) => skillsToFind.includes(i.data.name)),
//       );
//     }
//   },
// );
