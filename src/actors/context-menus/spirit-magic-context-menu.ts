import { RqgActorSheet } from "../rqgActorSheet";
import {
  assertDocumentSubType,
  getDomDataset,
  getDomDatasetAmongSiblings,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const spiritMagicMenuOptions = (actor: CharacterActor): ContextMenu.Entry<HTMLElement>[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      await item.spiritMagicRoll();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      return !item.system.isVariable || item.system.points === 1;
    },
    callback: async (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      if (item.system.isVariable && item.system.points > 1) {
        await item.spiritMagicRoll();
      } else {
        await item.spiritMagicRollImmediate();
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    condition: (el: HTMLElement) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      return !!rqid;
    },
    callback: async (el: HTMLElement) => {
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
    icon: contextMenuRunes.Edit,
    condition: () => !!game.user?.isGM,
    callback: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      if (!item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditSpiritMagicError", {
          itemId: itemId!,
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
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM,
    callback: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
