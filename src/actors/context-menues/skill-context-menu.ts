import { RqgActorSheet } from "../rqgActorSheet";
import { ItemCard } from "../../chat/itemCard";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";
import { SkillItemData } from "../../data-model/item-data/skillData";

export const skillMenuOptions = (actor: RqgActor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        await ItemCard.show(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu.`,
          true,
          el
        );
      }
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<SkillItemData>;
      if (item) {
        await ItemCard.roll(actor, item.data, 0);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to do a direct roll on a skill item from the skill context menu.`,
          true,
          el
        );
      }
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<SkillItemData>;
      return item?.data.data.canGetExperience;
    },
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<SkillItemData>;
      if (item) {
        await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on a skill item from the skill context menu.`,
          true,
          el
        );
      }
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<SkillItemData>;
      return !!item?.data.data.hasExperience;
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
      const journalId = firstItemEl.dataset.journalId;
      const journalPack = firstItemEl.dataset.journalPack;
      if (journalId) {
        await RqgActorSheet.showJournalEntry(journalId, journalPack);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to view description of a skill item from the skill context menu`,
          true,
          el
        );
      }
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<SkillItemData>;
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu`,
          true,
          el
        );
      }
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        RqgActorSheet.confirmItemDelete(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete the skill item from the skill context menu.`,
          true,
          el
        );
      }
    },
  },
];
