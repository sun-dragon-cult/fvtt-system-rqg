import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDataset,
  getDomDatasetAmongSiblings,
  getGame,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ContextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";

export const spiritMagicMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: ContextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.type, ItemTypeEnum.SpiritMagic);
      await item?.toChat();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: ContextMenuRunes.RollQuick,
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.type, ItemTypeEnum.SpiritMagic);
      return !item.system.isVariable || item.system.points === 1;
    },
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.type, ItemTypeEnum.SpiritMagic);
      if (item.system.isVariable && item.system.points > 1) {
        await item.toChat();
      } else {
        await item?.abilityRoll({ level: item.system.points, boost: 0 });
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: ContextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      return !!rqid;
    },
    callback: async (el: JQuery) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.SpiritMagic),
    }),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.type, ItemTypeEnum.SpiritMagic);
      if (!item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditSpiritMagicError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.SpiritMagic),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
