import type { RqgContextMenuEntry } from "../../foundryUi/RqgContextMenu";
import { RqgActorSheet } from "../rqgActorSheet";
import { getRequiredDomDataset, localize, localizeItemType, RqgError } from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { Rqid } from "../../system/api/rqidApi";
import { isValidRqidString } from "../../system/api/rqidValidation";
import type { CultItem } from "@item-model/cultDataModel.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const cultMenuOptions = (actor: CharacterActor): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as CultItem | undefined;
      return isValidRqidString(item?.system.descriptionRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as CultItem | undefined;
      const rqid = item?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Cult),
    }),
    icon: contextMenuRunes.Edit,
    visible: (el: HTMLElement) => !!getRequiredDomDataset(el, "item-id"),
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as CultItem | undefined;
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Cult),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => !!game.user?.isGM || actor.system.editMode,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
