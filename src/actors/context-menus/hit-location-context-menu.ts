import type { RqgContextMenuEntry } from "../../foundryUi/RqgContextMenu";
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
import type { HitLocationItem } from "@item-model/hitLocationDataModel.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const hitLocationMenuOptions = (actor: CharacterActor): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Edit,
    visible: (el: HTMLElement) => !!getDomDataset(el, "item-id"),
    onClick: (_event: Event, el: HTMLElement) => {
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.HitLocation),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => !!game.user?.isGM,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
