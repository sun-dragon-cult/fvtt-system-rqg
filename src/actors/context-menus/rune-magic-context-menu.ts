import type { RqgContextMenuEntry } from "../../foundry-ui/rqg-context-menu";
import { confirmActorItemDelete } from "../confirm-item-delete-dialog";
import { RqgActor } from "../rqg-actor";
import {
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  resolveCastItem,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { contextMenuRunes } from "./context-menu-runes";
import { Rqid } from "../../system/api/rqid-api";
import { isValidRqidString } from "../../system/api/rqid-validation";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { RqgItem } from "@items/rqg-item.ts";

export const runeMagicMenuOptions = (actor: RqgActor): RqgContextMenuEntry[] => [
  {
    label: "RQG.Game.RollChat",
    icon: contextMenuRunes.RollViaChat,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const item = resolveCastItem(el, actor) as RuneMagicItem | undefined;
      if (!item) {
        return;
      }
      await item.runeMagicRoll(undefined, actor);
    },
  },
  {
    label: "RQG.Game.RollQuick",
    icon: contextMenuRunes.RollQuick,
    visible: (el: HTMLElement) => {
      const item = resolveCastItem(el, actor) as RuneMagicItem | undefined;
      return item?.system.points === 1;
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const item = resolveCastItem(el, actor) as RuneMagicItem | undefined;
      if (!item) {
        return;
      }
      await item.runeMagicRollImmediate(undefined, undefined, actor);
    },
  },
  {
    label: "RQG.ContextMenu.ViewDescription",
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const item = resolveCastItem(el, actor) as RuneMagicItem | undefined;
      return isValidRqidString(item?.system.descriptionRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const item = resolveCastItem(el, actor) as RuneMagicItem | undefined;
      const rqid = item?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.RuneMagic),
    }),
    icon: contextMenuRunes.Edit,
    // Only the caster's own Rune Magic items are editable - a spell surfaced from an external
    // spell source (#1002, e.g. an Allied Spirit bond partner's known spells) isn't this actor's
    // Item to edit.
    visible: (el: HTMLElement) => !!game.user?.isGM && !getDomDataset(el, "external-owner-uuid"),
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as RqgItem | undefined;
      if (!item) {
        return;
      }
      if (!item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the runemagic item from the runemagic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.RuneMagic),
    }),
    icon: contextMenuRunes.Delete,
    visible: (el: HTMLElement) => !!game.user?.isGM && !getDomDataset(el, "external-owner-uuid"),
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void confirmActorItemDelete(actor, itemId);
    },
  },
];
