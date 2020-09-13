import { registerRqgSystemSettings } from "./system/settings.js";
import { preloadTemplates } from "./system/preloadTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { handlebarSettings } from "./system/handlebarSettings";

Hooks.once("init", async () => {
  console.log(
    "RQG | Initializing the Runequest Glorantha (Unofficial) Game System"
  );
  // CONFIG.debug.hooks = true; // console log when hooks fire

  RqgActor.init();
  RqgItem.init();
  registerRqgSystemSettings();
  handlebarSettings();
  preloadTemplates();

  if (game.modules.get("about-time")?.active) {
    game.Gametime.DTC.createFromData(game.Gametime.calendars.Glorantha);
    game.Gametime.DTC.saveUserCalendar(game.Gametime.calendars.Glorantha);
  }
});
