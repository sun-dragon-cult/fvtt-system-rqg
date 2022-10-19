import { RqgActorSheet } from "../rqgActorSheet";
import {
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  localize,
  RqgError,
} from "../../system/util";
import { RqgActor } from "../rqgActor";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const hitLocationMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.HitLocation),
    }),
    icon: ContextMenuRunes.Edit,
    condition: (el: JQuery) => !!getDomDataset(el, "item-id"),
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.CantEditHitLocationError", {
          itemId: itemId,
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
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.HitLocation),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
