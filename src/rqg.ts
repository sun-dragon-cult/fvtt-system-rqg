import { registerRqgSystemSettings } from "./system/settings.js";
import { handlebarsTemplates } from "./system/handlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { handlebarsHelpers } from "./system/handlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./system/rqgCombat";
import { RQG } from "./system/config";
import { Chat } from "./chat/chat";

Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha (Unofficial) Game System");
  CONFIG.RQG = RQG;

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
  Chat.init();
  registerRqgSystemSettings();
  await handlebarsTemplates();
  handlebarsHelpers();
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
