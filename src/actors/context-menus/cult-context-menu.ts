import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { Rqid } from "../../system/api/rqidApi";

export const cultMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const rqid = getDomDataset(el, "rqid-link");
      return !!rqid;
    },
    callback: async (el: JQuery) => {
      const rqid = getDomDataset(el, "rqid-link");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Cult),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: JQuery) => !!getRequiredDomDataset(el, "item-id"),
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditCultError", {
          journalId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Cult),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM || actor.system.editMode,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
