import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";

export const cultMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");

      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling as HTMLElement;
      }
      return !!firstItemEl.dataset.journalId;
    },
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling as HTMLElement;
      }
      const journalId = firstItemEl.dataset.journalId;
      const journalPack = firstItemEl.dataset.journalPack;

      if (journalId) {
        await RqgActorSheet.showJournalEntry(journalId, journalPack);
      } else {
        logBug(
          `Couldn't find journal Id [${journalId}] on actor ${actor.name} to show it from the cult context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.getOwnedItem(itemId);
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit cult item from the cult context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        RqgActorSheet.confirmItemDelete(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete cult item from the cult context menu.`,
          true
        );
      }
    },
  },
];
