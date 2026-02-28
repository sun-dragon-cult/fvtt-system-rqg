import { RqgActorSheet } from "../rqgActorSheet";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { HitLocationItem } from "@item-model/hitLocationData.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const hitLocationMenuOptions = (actor: CharacterActor): ContextMenu.Entry<HTMLElement>[] => [
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: HTMLElement) => !!getDomDataset(el, "item-id"),
    callback: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as HitLocationItem | undefined;
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.CantEditHitLocationError", {
          itemId: itemId!,
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
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM,
    callback: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
