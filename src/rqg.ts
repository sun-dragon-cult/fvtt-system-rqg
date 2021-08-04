import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG, RqgConfig } from "./system/config";
import { ChatCardListeners } from "./chat/chatCardListeners";
import { migrateWorld } from "./system/migrate";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";
import { setupSimpleCalendar } from "./module-integration/simple-calendar-init";
import { RqgError } from "./system/util";

declare const CONFIG: RqgConfig;

Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha (Unofficial) Game System");
  CONFIG.RQG = RQG_CONFIG;

  // CONFIG.debug.hooks = true; // console log when hooks fire
  // CONFIG.debug.time = true; // console log time

  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };
  RqgActiveEffect.init();
  RqgCombat.init();
  RqgCombatTracker.init();
  RqgToken.init();
  RqgActor.init();
  RqgItem.init();
  ChatCardListeners.init();
  registerRqgSystemSettings();
  await loadHandlebarsTemplates();
  registerHandlebarsHelpers();
});

Hooks.once("ready", async () => {
  if (game.user?.isGM) {
    await migrateWorld();
    const runeCompendium = game.settings.get("rqg", "runesCompendium") as string;
    // Make sure the index for runes is preloaded
    try {
      await game.packs!.get(runeCompendium)!.getIndex();
    } catch (err) {
      const msg = `Couldn't load rune compendium - check that you have the compendium specified in the "Rune items compendium" enabled and that the link is correct`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, runeCompendium);
    }
    await setupSimpleCalendar();
  }
});
