import { RqgActorSheet } from "../rqgActorSheet";
import { SpiritMagicCard } from "../../chat/spiritMagicCard";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  findDatasetValueInSelfOrAncestors,
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  localize,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { Rqid } from "../../system/api/rqidApi";

export const spiritMagicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollCard"),
    icon: ContextMenuRunes.RollCard,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
      item.id && (await SpiritMagicCard.show(item.id, actor, token));
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: ContextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
      if (item.data.data.isVariable && item.data.data.points > 1) {
        item.id && (await SpiritMagicCard.show(item.id, actor, token));
      } else {
        const speakerName = token?.name ?? actor.data.token.name ?? "";
        await SpiritMagicCard.roll(
          item.data.toObject(),
          item.data.data.points,
          0,
          actor,
          speakerName
        );
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: ContextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const rqid = findDatasetValueInSelfOrAncestors(el[0] as HTMLElement, "spiritMagicSpellRqid");
      return rqid ? true : false;
    },
    callback: async (el: JQuery) => {
      const rqid = findDatasetValueInSelfOrAncestors(el[0] as HTMLElement, "spiritMagicSpellRqid");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.SpiritMagic),
    }),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
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
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.SpiritMagic),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
