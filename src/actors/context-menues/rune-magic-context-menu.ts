import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";

export const runeMagicMenuOptions = (actor) => [
  {
    name: "Roll",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = actor.items.get(itemId);
      const result = Ability.rollAgainst(item.data.data.chance, 0, item.name);
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while (firstItemEl.previousElementSibling.dataset.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling;
      }
      return !!firstItemEl.dataset.journalId;
    },
    callback: async (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while (firstItemEl.previousElementSibling.dataset.itemId === itemId) {
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
