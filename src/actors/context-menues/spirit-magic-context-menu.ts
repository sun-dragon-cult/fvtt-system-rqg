import { RqgActorSheet } from "../rqgActorSheet";
import { SpiritMagicCard } from "../../chat/spiritMagicCard";
import { SpiritMagicItemData } from "../../data-model/item-data/spiritMagicData";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getRequiredDomDataset, RqgError } from "../../system/util";

export const spiritMagicMenuOptions = (
  actor: RqgActor,
  token: Token | null
): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.getOwnedItem(itemId);
      if (!item) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${
          actor!.name
        } to roll the spiritmagic item from the spiritmagic context menu,`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      await SpiritMagicCard.show(item.id, actor, token);
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && (actor.getOwnedItem(itemId) as Item<SpiritMagicItemData>);
      if (!item) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to do a direct roll for a spiritmagic item from the spiritmagic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      if (item.data.data.isVariable && item.data.data.points > 1) {
        await SpiritMagicCard.show(item.id, actor, token);
      } else {
        const speakerName = token?.name || actor.data.token.name;
        await SpiritMagicCard.roll(item.data, item.data.data.points, 0, actor, speakerName);
      }
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
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
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && (actor.getOwnedItem(itemId) as Item<SpiritMagicItemData>);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the spirit magic item from the spirit magic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
