export async function setupSimpleCalendar() {
  const simpleCalendarModule = "foundryvtt-simple-calendar";

  if (game.modules.get(simpleCalendarModule)?.active) {
    // that file is an export of simple-calendar settings
    const calendar = await import("./simple-calendar-glorantha.json");
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
