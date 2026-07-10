import type { RqgContextMenuEntry } from "../../foundry-ui/rqg-context-menu";
import { confirmActorItemDelete } from "../confirm-item-delete-dialog";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./context-menu-runes";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";

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
        const msg = localize("RQG.ContextMenu.Notification.CantEditHitLocationError", {
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
      void confirmActorItemDelete(actor, itemId);
    },
  },
];
