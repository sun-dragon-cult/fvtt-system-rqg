import { RqgActorSheet } from "../rqgActorSheet";
import { ChatCards } from "../../chat/chatCards";
import { ItemCard } from "../../chat/itemCard";

export const skillMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      ChatCards.show("itemCard", actor, itemId);
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = actor.items.get(itemId);
      ItemCard.roll(actor, item, 0);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = actor.getOwnedItem(itemId);
      return item.data.data.canGetExperience;
    },
    callback: async (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = actor.getOwnedItem(itemId);
      await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = actor.getOwnedItem(itemId);
      return item.data.data.hasExperience;
    },
    callback: (el) => {
      ui.notifications.info("TODO Improve");
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while (firstItemEl.previousElementSibling?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling;
      }
      return !!firstItemEl.dataset.journalId;
    },
    callback: async (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while (firstItemEl.previousElementSibling?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling;
      }
      RqgActorSheet.showJournalEntry(
        firstItemEl.dataset.journalId,
        firstItemEl.dataset.journalPack
      );
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
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
