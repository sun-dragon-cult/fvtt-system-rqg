import { getGame, getGameUser, localize } from "../system/util";
import { calendarSeasons } from "./simple-calendar-glorantha-seasons";
import { calendarWeeks } from "./simple-calendar-glorantha-weeks";

export class ModuleSupport {
  simpleCalendarModule = "foundryvtt-simple-calendar";

  //@ts-ignore
  SimpleCalendar = SimpleCalendar;

  //** Run from console or macro: "await game.system.api.module.dateToChatSeasons()" */
  async dateToChatSeasons() {
    if (!getGame().modules.get(this.simpleCalendarModule)?.active) {
      ui.notifications?.error(localize("RQG.Item.Notification.SimpleCalendarNotInstalled"));
      return;
    }

    const day = this.SimpleCalendar.api.getCurrentDay();
    const month = this.SimpleCalendar.api.getCurrentMonth();
    const dayofweeknum = (day.numericRepresentation % 7) - 1;
    const dayofweek = this.SimpleCalendar.api.getAllWeekdays()[dayofweeknum];

    const dayrunes = [
      { name: "Darkness", img: "systems/rqg/assets/images/runes/darkness.svg" },
      { name: "Water", img: "systems/rqg/assets/images/runes/water.svg" },
      { name: "Earth", img: "systems/rqg/assets/images/runes/earth.svg" },
      { name: "Air", img: "systems/rqg/assets/images/runes/air.svg" },
      { name: "Fire/Sky", img: "systems/rqg/assets/images/runes/fire_sky.svg" },
      { name: "Chaos", img: "systems/rqg/assets/images/runes/chaos.svg" },
      { name: "Gods", img: "systems/rqg/assets/images/runes/god.svg" },
    ];
    const dayofweekrune = dayrunes[dayofweeknum];

    const weeknum = ~~(day.numericRepresentation / 7);

    const weekrunes = [
      { name: "Disorder", img: "systems/rqg/assets/images/runes/disorder.svg" },
      { name: "Harmony", img: "systems/rqg/assets/images/runes/harmony.svg" },
      { name: "Death", img: "systems/rqg/assets/images/runes/death.svg" },
      { name: "Fertility", img: "systems/rqg/assets/images/runes/fertility.svg" },
      { name: "Stasis", img: "systems/rqg/assets/images/runes/stasis.svg" },
      { name: "Movement", img: "systems/rqg/assets/images/runes/movement_change.svg" },
      { name: "Illusion", img: "systems/rqg/assets/images/runes/illusion.svg" },
      { name: "Truth", img: "systems/rqg/assets/images/runes/truth.svg" },
    ];

    const sacredweekrunes = [
      { name: "Luck", img: "systems/rqg/assets/images/runes/luck.svg" },
      { name: "Fate", img: "systems/rqg/assets/images/runes/fate.svg" },
    ];

    let weekrune;

    if (month.numericRepresentation === 6) {
      // Sacred time
      weekrune = sacredweekrunes[weeknum];
    } else {
      weekrune = weekrunes[weeknum];
    }

    const seasonrunes = [
      { name: "Water", img: "systems/rqg/assets/images/runes/water.svg" },
      { name: "Fire", img: "systems/rqg/assets/images/runes/fire_sky.svg" },
      { name: "Earth", img: "systems/rqg/assets/images/runes/earth.svg" },
      { name: "Darkness", img: "systems/rqg/assets/images/runes/darkness.svg" },
      { name: "Air", img: "systems/rqg/assets/images/runes/air.svg" },
      { name: "Gods", img: "systems/rqg/assets/images/runes/god.svg" },
    ];

    const seasonrune = seasonrunes[month.numericRepresentation - 1];
    const year = this.SimpleCalendar.api.getCurrentYear();
    const redmoon = this.SimpleCalendar.api.getAllMoons()[0];

    // Note that "Black" and "Dying" moons have the same svg
    const moonimgs = [
      { name: "Full", img: "systems/rqg/assets/images/runes/moon_full.svg" },
      { name: "Full Half", img: "systems/rqg/assets/images/runes/moon_full_half.svg" },
      { name: "Crescent Going", img: "systems/rqg/assets/images/runes/moon_crescent_go.svg" },
      { name: "Dying", img: "systems/rqg/assets/images/runes/moon_black.svg" },
      { name: "Black", img: "systems/rqg/assets/images/runes/moon_black.svg" },
      { name: "Crescent Coming", img: "systems/rqg/assets/images/runes/moon_crescent_come.svg" },
      { name: "Empty Half", img: "systems/rqg/assets/images/runes/moon_empty_half.svg" },
    ];

    const moonimg = moonimgs.find((i) => i.name === redmoon.currentPhase.name);

    if (!moonimg) {
      console.log("Moon image not found!");
      return;
    }

    const daysinyear = 56 * 5 + 14;
    const dayofyear =
      (Number(month.numericRepresentation) - 1) * 56 + Number(day.numericRepresentation);
    const daysleftinyear = daysinyear - dayofyear;

    const flags = {
      year: year,
      moonimg: moonimg,
      redmoon: redmoon,
      dayofweekrune: dayofweekrune,
      dayofweek: dayofweek,
      weekrune: weekrune,
      seasonrune: seasonrune,
      month: month,
      daysinyear: daysinyear,
      dayofyear: dayofyear,
      daysleftinyear: daysleftinyear,
    };

    const html = await renderTemplate("systems/rqg/chat/dateToChatCard.hbs", flags);

    ChatMessage.create({
      user: getGameUser().id,
      speaker: ChatMessage.getSpeaker(),
      content: html,
    });
  }

  //** Run from console or macro: "await game.system.api.module.setupSimpleCalendarWeeks()" */
  async setupSimpleCalendarWeeks() {
    if (getGame().modules.get(this.simpleCalendarModule)?.active) {
      this.SimpleCalendar.api.configureCalendar(calendarWeeks); // calendar is basically an export of simple-calendar settings with current date removed
      return;
    } else {
      ui.notifications?.error(localize("RQG.Item.Notification.SimpleCalendarNotInstalled"));
      return;
    }
  }

  //** Run from console or macro: "await game.system.api.module.setupSimpleCalendarSeasons()" */
  async setupSimpleCalendarSeasons() {
    if (getGame().modules.get(this.simpleCalendarModule)?.active) {
      this.SimpleCalendar.api.configureCalendar(calendarSeasons); // calendar is basically an export of simple-calendar settings with current date removed
      return;
    } else {
      ui.notifications?.error(localize("RQG.Item.Notification.SimpleCalendarNotInstalled"));
      return;
    }
  }
}
