import { RqgActorSheet } from "../rqgActorSheet";

export const gearMenuOptions = (actor) => [
  {
    name: "Set as not carried",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      ui.notifications.info("TODO set as not carried");
    },
  },
  {
    name: "Set as carried",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      ui.notifications.info("TODO set as carried");
    },
  },
  {
    name: "Set as equipped",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      ui.notifications.info("TODO set as equipped");
    },
  },
  {
    name: "Split into new location",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = actor.getOwnedItem(itemId);
      return item.data.data.physicalItemType !== "unique";
    },
    callback: async (el) => {
      ui.notifications.info("TODO Split into new location");
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      ui.notifications.info("TODO View Description");
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      actor.getOwnedItem(itemId).sheet.render(true);
    },
  },
  {
    name: "Drop",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
