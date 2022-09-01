import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG, systemId } from "./system/config";
import { applyDefaultWorldMigrations, migrateWorld } from "./system/migrations/migrateWorld";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";
import { cacheAvailableRunes, getGame } from "./system/util";
// import { consolidateCompendiumItems } from "./system/migrations/ConsolidateItems";
import { RqgPause } from "./foundryUi/pause";
import { RqgChatMessage } from "./chat/RqgChatMessage";
import { nameGeneration } from "./system/api/nameGeneration.js";
import { Rqid } from "./system/api/rqidApi.js";
import { RqgJournalSheet } from "./journals/rqgJournalSheet";
import { RqgRollTableConfig } from "./rollTables/rqgRollTableConfig";

Hooks.once("init", async () => {
  console.log(
    "%c                                                                                            \n" +
      "                                                                                            \n" +
      '`7MM"""Mq.                                   .g8""8q.                                 mm    \n' +
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
      "                                                                                \n",
    "color: #F3A71E"
  );
  console.log("RQG | Initializing the Runequest Glorantha Game System");

  CONFIG.RQG = RQG_CONFIG;
  // @ts-expect-errors v10
  if (CONFIG?.compatibility) {
    // @ts-expect-errors v10 SILENT - no warnings
    CONFIG.compatibility.mode = CONST.COMPATIBILITY_MODES?.SILENT;
  }

  // CONFIG.debug.hooks = true; // console log when hooks fire
  // CONFIG.debug.time = true; // console log time

  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };
  Rqid.init();
  RqgChatMessage.init();
  RqgActiveEffect.init();
  RqgCombat.init();
  RqgCombatTracker.init();
  RqgToken.init();
  RqgActor.init();
  RqgItem.init();
  RqgPause.init();

  // @ts-expect-error
  Journal.unregisterSheet("core", JournalSheet);
  // @ts-expect-error
  Journal.registerSheet(systemId, RqgJournalSheet as any, {
    label: "Journal Sheet",
    makeDefault: true,
  });

  // @ts-expect-error
  RollTables.unregisterSheet("core", RollTableConfig);
  // @ts-expect-error
  RollTables.registerSheet(systemId, RqgRollTableConfig as any, {
    // label: localize("TABLE.SheetTitle"),
    makeDefault: true,
  });

  await loadHandlebarsTemplates();
  registerHandlebarsHelpers();
  registerRqgSystemSettings();

  // run game.system.api.migrate() to force a new migration
  (getGame().system as any).api = {
    // installModules: installModules,
    migrate: applyDefaultWorldMigrations,
    rqid: Rqid,
    names: nameGeneration,
  };
});

Hooks.once("ready", async () => {
  if (getGame().user?.isGM) {
    await migrateWorld();
    // await setupSimpleCalendar();
  }
  // Make sure the cache of available runes is preloaded
  await cacheAvailableRunes();
});
