import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getRequiredDomDataset, RqgError } from "../../system/util";

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
      if (!journalId) {
        const msg = `Couldn't find journal Id [${journalId}] on actor ${actor.name} to show it from the cult context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await RqgActorSheet.showJournalEntry(journalId, journalPack);
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = itemId && actor.getOwnedItem(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit cult item from the cult context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
