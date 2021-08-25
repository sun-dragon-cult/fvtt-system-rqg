declare const SimpleCalendar: any;
const simpleCalendarModule = "foundryvtt-simple-calendar";

export async function setupSimpleCalendar() {
  if (game.modules.get(simpleCalendarModule)?.active) {
    const calendar = await import("./simple-calendar-glorantha.json"); // that file is an export of simple-calendar settings with current date removed
    SimpleCalendar.api.configureCalendar(calendar);
    return;
  }
}
