import { registerRqgSystemSettings } from "./system/settings.js";
import { preloadTemplates } from "./system/preloadTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { handlebarSettings } from "./system/handlebarSettings";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";

Hooks.once("init", async () => {
  console.log(
    "RQG | Initializing the Runequest Glorantha (Unofficial) Game System"
  );
  // CONFIG.debug.hooks = true; // console log when hooks fire
  // @ts-ignore 0.7
  // CONFIG.debug.time = true; // console log time
  CONFIG.ActiveEffect.entityClass = RqgActiveEffect;
  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };
  RqgActor.init();
  RqgItem.init();
  registerRqgSystemSettings();
  handlebarSettings();
  await preloadTemplates();

  if (game.modules.get("about-time")?.active) {
    game.Gametime.DTC.createFromData(game.Gametime.calendars.Glorantha);
    game.Gametime.DTC.saveUserCalendar(game.Gametime.calendars.Glorantha);
  }
});
