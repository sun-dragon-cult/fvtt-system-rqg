import { registerRqgSystemSettings } from "./system/rqg-system-settings.js";
import { loadHandlebarsTemplates } from "./system/load-handlebars-templates.js";
import { RqgActor } from "./actors/rqg-actor.js";
import { RqgItem } from "./items/rqg-item";
import { registerHandlebarsHelpers } from "./system/register-handlebars-helpers";
import { RqgActiveEffect } from "./active-effect/rqg-active-effect";
import { RqgCombat } from "./combat/rqg-combat";
import { RQG_CONFIG, systemId } from "./system/config";
import { applyDefaultWorldMigrations, migrateWorld } from "./system/migrations/migrate-world";
import { RqgCombatTracker } from "./combat/rqg-combat-tracker";
import { RqgToken } from "./combat/rqg-token";
import { cacheAvailableHitLocations, cacheAvailableRunes } from "./system/util";
import { RqgChatMessage } from "./chat/rqg-chat-message";
import { nameGeneration } from "./system/api/name-generation.js";
import { openDataModelRepairDialog } from "./system/api/data-model-repair";
import { Rqid } from "./system/api/rqid-api.js";
import { RqgHotbar } from "./foundry-ui/rqg-hotbar";
import { TextEditorHooks } from "./foundry-ui/text-editor-hooks";
import { RqgJournalEntry } from "./journals/rqg-journal-entry";
import { getTokenStatusEffects } from "./system/token-status-effects";
import { RqgSettings } from "./foundry-ui/rqg-settings";
import { RqidBatchEditor } from "./applications/rqid-batch-editor/rqid-batch-editor";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { initSockets } from "./sockets/rqg-socket";
import { AbilityRoll } from "./rolls/ability-roll/ability-roll";
import { CharacteristicRoll } from "./rolls/characteristic-roll/characteristic-roll";
import { SpiritMagicRoll } from "./rolls/spirit-magic-roll/spirit-magic-roll";
import { RuneMagicRoll } from "./rolls/rune-magic-roll/rune-magic-roll";
import { HitLocationRoll } from "./rolls/hit-location-roll/hit-location-roll";
import { DamageRoll } from "./rolls/damage-roll/damage-roll";
import { RqgRollTableSheet } from "./roll-tables/rqg-roll-table-sheet";
import { RqgTokenRuler } from "./combat/rqg-token-ruler";
import { ClickableScriptsRegionBehavior } from "./scene/clickable-scripts-region-behavior";
import { RqgTokenLayer } from "./scene/rqg-token-layer";
import { RqgCombatant } from "./combat/rqg-combatant";
import { setConfigStatusEffects } from "./system/fvtt-type-compat";

// CONFIG.debug.hooks = true; // console log when hooks fire
// CONFIG.debug.time = true; // console log time

Hooks.once("init", () => {
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
    "color: #F3A71E",
  );
  console.log("RQG | Initializing the Runequest Glorantha Game System");

  CONFIG.RQG = RQG_CONFIG;

  CONFIG.time.turnTime = 0; // Don't advance time per combatant
  CONFIG.time.roundTime = 12; // Melee round

  setConfigStatusEffects(getTokenStatusEffects());

  CONFIG.fontDefinitions["Norse"] = {
    editor: true,
    fonts: [
      { urls: ["systems/rqg/fonts/Norse-KaWl.otf"] },
      { urls: ["systems/rqg/fonts/NorseBold-2Kge.otf"], weight: "bold" },
    ],
  };

  CONFIG.Dice.rolls = [
    ...CONFIG.Dice.rolls,
    AbilityRoll,
    CharacteristicRoll,
    SpiritMagicRoll,
    RuneMagicRoll,
    HitLocationRoll,
    DamageRoll,
  ];

  Rqid.init();
  RqgChatMessage.init();
  RqgActiveEffect.init();
  RqgCombat.init();
  RqgCombatTracker.init();
  RqgTokenRuler.init();
  RqgToken.init();
  RqgActor.init();
  RqgItem.init();
  RqgHotbar.init();
  RqgJournalEntry.init();
  TextEditorHooks.init();
  RqgSettings.init();
  RqgTokenLayer.init();
  ClickableScriptsRegionBehavior.init();
  RqgCombatant.init();
  initSockets();

  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  const sheets = foundry.applications.sheets;

  DocumentSheetConfig.unregisterSheet(RollTable, "core", sheets.RollTableSheet);
  DocumentSheetConfig.registerSheet(RollTable, systemId, RqgRollTableSheet, {
    label: "RQG.SheetName.RollTable",
    makeDefault: true,
  });

  registerHandlebarsHelpers();
  registerRqgSystemSettings();

  // Define the system.api
  (game.system as any).api = {
    migration: {
      applyWorldMigrations: applyDefaultWorldMigrations,
      openDataModelRepairDialog,
      /**
       * Show an application that lets you set rqid for items.
       */
      openRqidBatchEditor: async (...itemTypes: string[]): Promise<void> => {
        const itemTypeEnums = (
          itemTypes.length
            ? itemTypes.map((it) => it as ItemTypeEnum)
            : [
                ItemTypeEnum.Skill, // weapon skills need Rqid for weapon -> skill link
                ItemTypeEnum.RuneMagic, // common spells need Rqid for visualisation in spell list
                ItemTypeEnum.Rune, // Future needs
              ]
        ) as Item.SubType[];
        await RqidBatchEditor.factory(...itemTypeEnums);
      },
    },
    rqid: Rqid,
    names: nameGeneration,
  };
});

Hooks.once("i18nInit", () => {
  // Preload Handlebars templates in the background while Foundry continues initialization.
  // By the time any sheet renders (setup/ready), the templates will already be cached.
  loadHandlebarsTemplates();
});

Hooks.once("ready", async () => {
  await migrateWorld();
  // Preload compendium item caches in parallel - both scan all packs but are independent
  await Promise.all([cacheAvailableRunes(), cacheAvailableHitLocations()]);

  // Verify that at least one wiki module is activated
  if (
    game.user?.isGM &&
    ![...game.modules.entries()].some(([name, mod]) => /wiki-[a-z]{2}-rqg/.test(name) && mod.active)
  ) {
    await Rqid.renderRqidDocument("je..quick-start");
  }
});
