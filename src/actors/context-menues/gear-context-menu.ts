import { RqgActorSheet } from "../rqgActorSheet";

export const gearMenuOptions = (actor) => [
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      console.log("======== TODO View Description");
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
