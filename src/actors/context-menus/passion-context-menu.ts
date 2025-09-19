import { RqgActorSheet } from "../rqgActorSheet";
import {
  assertDocumentSubType,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";
import type { PassionItem } from "@item-model/passionData.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const passionMenuOptions = (
  actor: CharacterActor,
  token: TokenDocument | undefined | null,
): ContextMenu.Entry<JQuery<HTMLElement>>[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as PassionItem | undefined;
      assertDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion);
      await item.abilityRoll();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery) => {
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
      await item.abilityRollImmediate();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: () => true,
    callback: async (el: JQuery) => {
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
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Improve,
    condition: (el: JQuery) => {
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
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion);
      const speaker = ChatMessage.getSpeaker({ actor, token });
      void showImproveAbilityDialog(item, speaker);
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Edit,
    condition: () => true,
    callback: (el: JQuery) => {
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
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => true,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
