import { RqgActorSheet } from "../rqgActorSheet";
import { SpiritMagicCard } from "../../chat/spiritMagicCard";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { ContextMenuRunes } from "./contextMenuRunes";

export const spiritMagicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: ContextMenuRunes.RollCard,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
      item.id && (await SpiritMagicCard.show(item.id, actor, token));
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: ContextMenuRunes.RollDirect,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
      if (item.data.data.isVariable && item.data.data.points > 1) {
        item.id && (await SpiritMagicCard.show(item.id, actor, token));
      } else {
        const speakerName = token?.name ?? actor.data.token.name ?? "";
        await SpiritMagicCard.roll(
          item.data.toObject(),
          item.data.data.points,
          0,
          actor,
          speakerName
        );
      }
    },
  },
  {
    name: "View Description",
    icon: ContextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl?.previousElementSibling as HTMLElement;
      }
      return !!firstItemEl?.dataset.journalId;
    },
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling as HTMLElement;
      }
      const journalId = getRequiredDomDataset($(firstItemEl), "journal-id");
      const journalPack = getDomDataset($(firstItemEl), "journal-pack");
      await RqgActorSheet.showJournalEntry(journalId, journalPack);
    },
  },
  {
    name: "Edit",
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.items.get(itemId)) || undefined;
      assertItemType(item?.data.type, ItemTypeEnum.SpiritMagic);
      if (!item.sheet) {
        const msg = `Couldn't find itemSheet for [${item.name}] on actor ${actor.name} to edit the spirit magic item from the spirit magic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete",
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
