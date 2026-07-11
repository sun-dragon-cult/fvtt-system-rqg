import type { RqgContextMenuEntry } from "../../foundry-ui/rqg-context-menu";
import { confirmActorItemDelete } from "../confirm-item-delete-dialog";
import {
  assertDocumentSubType,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { showImproveAbilityDialog } from "../../applications/improve-dialogs/improve-ability-dialog";
import { contextMenuRunes } from "./context-menu-runes";
import type { PassionItem } from "@item-model/passion-data-model.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";

export const passionMenuOptions = (
  actor: CharacterActor,
  token?: TokenDocument | null,
): RqgContextMenuEntry[] => [
  {
    label: "RQG.Game.RollChat",
    icon: contextMenuRunes.RollViaChat,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      assertDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion);
      await item.abilityRoll(token);
    },
  },
  {
    label: "RQG.Game.RollQuick",
    icon: contextMenuRunes.RollQuick,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      assertDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion);
      if (item.system.chance == null) {
        const msg = localize("RQG.ContextMenu.Notification.CantDirectRollPassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await item.abilityRollImmediate({}, token);
    },
  },
  {
    label: "RQG.ContextMenu.ToggleExperience",
    icon: contextMenuRunes.ToggleExperience,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      if (!item || item.type !== ItemTypeEnum.Passion.toString()) {
        const msg = localize("RQG.ContextMenu.Notification.CantToggleExperiencePassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await item.update({ system: { hasExperience: !item.system.hasExperience } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Improve,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      if (!item || item.type !== ItemTypeEnum.Passion.toString()) {
        const msg = localize("RQG.ContextMenu.Notification.CantImprovePassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      return !!item.system.hasExperience;
    },
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      assertDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion);
      const speaker = getSpeakerCompat({ actor, token });
      void showImproveAbilityDialog(item, speaker);
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Edit,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditPassionError", {
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void confirmActorItemDelete(actor, itemId);
    },
  },
];
