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
import { Rqid } from "../../system/api/rqid-api";
import { isValidRqidString } from "../../system/api/rqid-validation";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";

export const runeMenuOptions = (
  actor: CharacterActor,
  token: TokenDocument | undefined,
): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      assertDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune);
      await item.abilityRoll();
    },
  },
  {
    label: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      assertDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune);
      await item.abilityRollImmediate();
    },
  },
  {
    label: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      assertDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune);
      await item.update({ system: { hasExperience: !item.system.hasExperience } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Improve,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      assertDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune);
      const speaker = ChatMessage.getSpeaker({ actor, token });
      void showImproveAbilityDialog(item, speaker);
    },
  },
  {
    label: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      return isValidRqidString(item?.system.descriptionRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      const rqid = item?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Edit,
    visible: () => !!game.user?.isGM || actor.system.editMode,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RuneItem | undefined;
      assertDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune);
      if (!item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditRuneError", {
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => !!game.user?.isGM,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void confirmActorItemDelete(actor, itemId);
    },
  },
];
