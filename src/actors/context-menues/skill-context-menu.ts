import { RqgActorSheet } from "../rqgActorSheet";
import { ItemCard } from "../../chat/itemCard";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getRequiredDomDataset, RqgError } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const skillMenuOptions = (actor: RqgActor, token: Token | null): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      await ItemCard.show(itemId, actor, token);
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      const itemChance = (item?.data?.data as any).chance;
      if (!itemChance || !item || item.data.type !== ItemTypeEnum.Skill) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to do a direct roll on a skill item from the skill context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      const speakerName = token?.name || actor.data.token.name;
      await ItemCard.roll(item.data, 0, actor, speakerName);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      return !!(item?.data?.data as any)?.canGetExperience;
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.data.type !== ItemTypeEnum.Skill) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on a skill item from the skill context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      return !!(item && item.data.type === ItemTypeEnum.Skill && item.data.data.hasExperience);
    },
    callback: () => {
      ui.notifications?.info("TODO Improve");
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
        firstItemEl = firstItemEl?.previousElementSibling as HTMLElement;
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
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu`;
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
