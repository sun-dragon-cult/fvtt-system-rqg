import { RqgActorSheet } from "../rqgActorSheet";
import { SpiritMagicCard } from "../../chat/spiritMagicCard";

export const spiritMagicMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = actor.items.get(itemId);
      SpiritMagicCard.show(actor, item._id);
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item: Item = actor.items.get(itemId);
      if (item.data.data.isVariable && item.data.data.points > 1) {
        SpiritMagicCard.show(actor, item._id);
      } else {
        SpiritMagicCard.roll(actor, item.data, item.data.data.points, 0);
      }
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
