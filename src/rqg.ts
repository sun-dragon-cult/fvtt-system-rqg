import { registerRqgSystemSettings } from "./system/settings.js";
import { preloadTemplates } from "./system/preloadTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { handlebarSettings } from "./system/handlebarSettings";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./system/rqgCombat";

Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha (Unofficial) Game System");
  // CONFIG.debug.hooks = true; // console log when hooks fire
  // @ts-ignore 0.7
  // CONFIG.debug.time = true; // console log time
  CONFIG.ActiveEffect.entityClass = RqgActiveEffect;
  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };

  RqgCombat.init();
  RqgActor.init();
  RqgItem.init();
  registerRqgSystemSettings();
  handlebarSettings();
  await preloadTemplates();
});

Hooks.once("ready", async () => {
  if (game.user.isGM) {
    const runeCompendium = game.settings.get("rqg", "runesCompendium");
    // Store runes in settings to avoid await on ItemSheet getData
    try {
      const runesIndex = await game.packs.get(runeCompendium).getIndex();
      await game.settings.set("rqg", "runes", runesIndex);
    } catch (err) {
      await game.settings.set("rqg", "runes", []);
    }

    if (game.modules.get("about-time")?.active) {
      game.Gametime.DTC.createFromData(game.Gametime.calendars.Glorantha);
      game.Gametime.DTC.saveUserCalendar(game.Gametime.calendars.Glorantha);
    }
  }
});
