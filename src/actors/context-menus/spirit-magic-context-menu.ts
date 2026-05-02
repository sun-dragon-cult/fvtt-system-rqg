import type { RqgContextMenuEntry } from "../../foundryUi/RqgContextMenu";
import { RqgActorSheet } from "../rqgActorSheet";
import {
  assertDocumentSubType,
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";
import { isValidRqidString } from "../../system/api/rqidValidation";
import type { SpiritMagicItem } from "@item-model/spiritMagicDataModel.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const spiritMagicMenuOptions = (actor: CharacterActor): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      await item.spiritMagicRoll();
    },
  },
  {
    label: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    visible: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic);
      return !item.system.isVariable || item.system.points === 1;
    },
    onClick: async (_event: Event, el: HTMLElement) => {
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
    label: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SpiritMagicItem | undefined;
      return isValidRqidString(item?.system.descriptionRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SpiritMagicItem | undefined;
      const rqid = item?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.SpiritMagic),
    }),
    icon: contextMenuRunes.Edit,
    visible: () => !!game.user?.isGM,
    onClick: (_event: Event, el: HTMLElement) => {
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.SpiritMagic),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => !!game.user?.isGM,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
