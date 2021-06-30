import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { handlebarsTemplates } from "./system/handlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { handlebarsHelpers } from "./system/handlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./system/rqgCombat";
import { RQG_CONFIG, RqgConfig } from "./system/config";
import { ChatCardListeners } from "./chat/chatCardListeners";
import { Migrate } from "./system/migrate";

declare const CONFIG: RqgConfig;

Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha (Unofficial) Game System");
  CONFIG.RQG = RQG_CONFIG;

  // CONFIG.debug.hooks = true; // console log when hooks fire
  // CONFIG.debug.time = true; // console log time
  // @ts-ignore 0.8
  CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };

  RqgCombat.init();
  RqgActor.init();
  RqgItem.init();
  ChatCardListeners.init();
  registerRqgSystemSettings();
  await handlebarsTemplates();
  handlebarsHelpers();
});

Hooks.once("ready", async () => {
  if (game.user?.isGM) {
    await Migrate.world();
    const runeCompendium = game.settings.get("rqg", "runesCompendium") as string;
    // Store runes in settings to avoid await on ItemSheet getData
    try {
      const runesIndex = await game.packs?.get(runeCompendium)?.getIndex();
      await game.settings.set("rqg", "runes", runesIndex);
    } catch (err) {
      await game.settings.set("rqg", "runes", []);
    }

    if (game.modules.get("about-time")?.active) {
      const gameTime: any = game.GameTime;
      gameTime.DTC.createFromData(gameTime.calendars.Glorantha);
      gameTime.DTC.saveUserCalendar(gameTime.calendars.Glorantha);
    }
  }
});
