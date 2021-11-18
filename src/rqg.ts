import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG } from "./system/config";
import { ChatCardListeners } from "./chat/chatCardListeners";
import { applyDefaultWorldMigrations, migrateWorld } from "./system/migrations/migrateWorld";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";
import { setupSimpleCalendar } from "./module-integration/simple-calendar-init";
import { getGame, RqgError } from "./system/util";
import { consolidateCompendiumItems } from "./system/migrations/ConsolidateItems";

Hooks.once("init", async () => {
  console.log(
    "                                                                                            \n" +
      "                                                                                            \n" +
      '`7MM"""Mq.  (Unofficial)                     .g8""8q.                                 mm    \n' +
      "  MM   `MM.                                .dP'    `YM.                               MM    \n" +
      '  MM   ,M9 `7MM  `7MM  `7MMpMMMb.  .gP"Ya  dM\'      `MM `7MM  `7MM  .gP"Ya  ,pP"Ybd mmMMmm  \n' +
      "  MMmmdM9    MM    MM    MM    MM ,M'   Yb MM        MM   MM    MM ,M'   Yb 8I   `\"   MM    \n" +
      '  MM  YM.    MM    MM    MM    MM 8M"""""" MM.      ,MP   MM    MM 8M"""""" `YMMMa.   MM    \n' +
      "  MM   `Mb.  MM    MM    MM    MM YM.    , `Mb.    ,dP'   MM    MM YM.    , L.   I8   MM    \n" +
      ".JMML. .JMM. `Mbod\"YML..JMML  JMML.`Mbmmd'   `\"bmmd\"'     `Mbod\"YML.`Mbmmd' M9mmmP'   `Mbmo \n" +
      "                                                 MMb                                        \n" +
      "                                                  `bood'                                    \n" +
      "              ,,                                             ,,                 \n" +
      '  .g8"""bgd `7MM                                      mm   `7MM                 \n' +
      ".dP'     `M   MM                                      MM     MM                 \n" +
      'dM\'       `   MM  ,pW"Wq.`7Mb,od8 ,6"Yb.  `7MMpMMMb.mmMMmm   MMpMMMb.   ,6"Yb.  \n' +
      "MM            MM 6W'   `Wb MM' \"'8)   MM    MM    MM  MM     MM    MM  8)   MM  \n" +
      "MM.    `7MMF' MM 8M     M8 MM     ,pm9MM    MM    MM  MM     MM    MM   ,pm9MM  \n" +
      "`Mb.     MM   MM YA.   ,A9 MM    8M   MM    MM    MM  MM     MM    MM  8M   MM  \n" +
      "  `\"bmmmdPY .JMML.`Ybmd9'.JMML.  `Moo9^Yo..JMML  JMML.`Mbmo.JMML  JMML.`Moo9^Yo.\n" +
      "                                                                                \n" +
      "                                                                                \n"
  );
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

  // run game.system.api.migrate() to force a new migration
  (getGame().system as any).api = {
    // installModules: installModules,
    migrate: applyDefaultWorldMigrations,
    consolidate: consolidateCompendiumItems,
  };
});

Hooks.once("ready", async () => {
  if (getGame().user?.isGM) {
    await migrateWorld();
    await setupSimpleCalendar();
  }
  const runeCompendium = getGame().settings.get("rqg", "runesCompendium");
  // Make sure the index for runes is preloaded
  try {
    await getGame().packs!.get(runeCompendium)!.getIndex();
  } catch (err) {
    const msg = `Couldn't load rune compendium - check that you have the compendium specified in the "Rune items compendium" enabled and that the link is correct`;
    ui.notifications?.error(msg);
    throw new RqgError(msg, runeCompendium);
  }
});
