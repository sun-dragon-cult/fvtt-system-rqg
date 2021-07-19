import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG, RqgConfig } from "./system/config";
import { ChatCardListeners } from "./chat/chatCardListeners";
import { Migrate } from "./system/migrate";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";

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
    await Migrate.world();
    const runeCompendium = game.settings.get("rqg", "runesCompendium") as string;
    // Store runes in settings to avoid await on ItemSheet getData
    try {
      const runesIndex = await game.packs?.get(runeCompendium)?.getIndex();
      await game.settings.set("rqg", "runes", runesIndex);
    } catch (err) {
      await game.settings.set("rqg", "runes", []);
    }
    await setupSimpleCalendar();
  }
});

async function setupSimpleCalendar() {
  const simpleCalendarModule = "foundryvtt-simple-calendar";

  if (game.modules.get(simpleCalendarModule)?.active) {
    // that file is an export of simple-calendar settings
    const calendar = await import("./module-integration/simple-calendar-glorantha.json");
    const calendarSettings = (calendar as any).default;

    console.log("RQG | Configuring simple calendar for Glorantha");

    if (calendarSettings.hasOwnProperty("yearSettings")) {
      await game.settings.set(simpleCalendarModule, "year-config", calendarSettings.yearSettings);
    }
    if (calendarSettings.hasOwnProperty("monthSettings")) {
      await game.settings.set(simpleCalendarModule, "month-config", calendarSettings.monthSettings);
    }
    if (calendarSettings.hasOwnProperty("weekdaySettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "weekday-config",
        calendarSettings.weekdaySettings
      );
    }
    if (calendarSettings.hasOwnProperty("leapYearSettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "leap-year-rule",
        calendarSettings.leapYearSettings
      );
    }
    if (calendarSettings.hasOwnProperty("timeSettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "time-configuration",
        calendarSettings.timeSettings
      );
    }
    if (calendarSettings.hasOwnProperty("seasonSettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "season-configuration",
        calendarSettings.seasonSettings
      );
    }
    if (calendarSettings.hasOwnProperty("moonSettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "moon-configuration",
        calendarSettings.moonSettings
      );
    }
    if (calendarSettings.hasOwnProperty("generalSettings")) {
      await game.settings.set(
        simpleCalendarModule,
        "general-configuration",
        calendarSettings.generalSettings
      );
    }
    // if (calendarSettings.hasOwnProperty("currentDate")) {
    //   await game.settings.set(simpleCalendarModule, "current-date", calendarSettings.currentDate);
    // }
  }
}
