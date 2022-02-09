import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getGame, getRequiredDomDataset, localize, RqgError } from "../../system/util";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const cultMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: ContextMenuRunes.ViewDescription,
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
        const msg = localize("RQG.ContextMenu.Notification.CantShowJournalDescriptionError", {journalId: journalId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await RqgActorSheet.showJournalEntry(journalId, journalPack);
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Cult)}),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditCultError", {journalId: itemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Cult)}),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
